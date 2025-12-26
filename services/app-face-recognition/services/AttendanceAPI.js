import Constants from 'expo-constants';
import AuthTokenManager from './AuthTokenManager';

// Heuristic to get LAN base URL from Expo metadata (no extra libs)
function extractHost(input) {
  if (!input || typeof input !== 'string') return null;
  // Examples: "192.168.1.4:19000", "exp://192.168.1.4:19000", "http://192.168.1.4:19000"
  const withoutProtocol = input.replace(/^\w+:\/\//, '');
  const hostPart = withoutProtocol.split('/')[0];
  const host = hostPart.split(':')[0];
  return host || null;
}

async function resolveGatewayBaseUrl() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.linkingUri,
    Constants.manifest?.hostUri,
    Constants.manifest?.debuggerHost,
  ].filter(Boolean);

  for (const cand of candidates) {
    const host = extractHost(cand);
    if (host) return `http://${host}:4000`;
  }

  return 'http://127.0.0.1:4000';
}

async function getBaseUrl() {
  if (!getBaseUrl.cached) {
    getBaseUrl.cached = await resolveGatewayBaseUrl();
  }
  return getBaseUrl.cached;
}

export async function testConnection() {
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/gateway-health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// Expose gateway base URL resolver for other modules (e.g., camera preview)
export async function getGatewayBaseUrl() {
  return await getBaseUrl();
}

export async function sendImageForRecognition(imageUri, meta = {}) {
  const base = await getBaseUrl();
  const form = new FormData();
  form.append('image', {
    uri: imageUri,
    name: 'capture.jpg',
    type: 'image/jpeg',
  });
  
  // Thêm recognition_type bắt buộc (mặc định là check_in)
  form.append('recognition_type', meta.recognition_type || 'check_in');
  
  // Thêm validation_mode (mặc định là 'normal' cho chấm công bình thường)
  // Sử dụng 'strict' khi cần kiểm tra chất lượng và liveness đầy đủ
  form.append('validation_mode', meta.validation_mode || 'normal');
  
  Object.entries(meta || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'recognition_type' && key !== 'validation_mode') {
      form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });

  const res = await fetch(`${base}/api/ai/recognize-face`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      // NOTE: Let fetch set boundary for multipart
    },
    body: form,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Invalid JSON response' };
  }

  if (!res.ok) {
    return { success: false, message: data?.message || 'Gateway error', error: data };
  }

  return data;
}

export async function submitAttendance(payload) {
  try {
    const base = await getBaseUrl();
    // Build headers with token (from payload.token or AuthTokenManager)
    let authToken = payload?.token || null;
    if (!authToken) {
      try {
        authToken = await AuthTokenManager.getAccessToken();
        console.log('AttendanceAPI: Retrieved token from AuthTokenManager:', authToken ? 'Token exists' : 'No token');
      } catch (e) {
        console.error('AttendanceAPI: Failed to get token from AuthTokenManager', e);
      }
    } else {
      console.log('AttendanceAPI: Using token from payload');
    }

    // Ensure we have a valid access token before sending. If not, try a refresh.
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (!authToken) {
      try {
        const refreshToken = await AuthTokenManager.getRefreshToken();
        if (refreshToken) {
          console.log('AttendanceAPI: No access token, but refresh token found. Attempting refresh...');
          const newToken = await AuthTokenManager.refreshAccessToken();
          if (newToken) authToken = newToken;
        }
      } catch (e) {
        console.warn('AttendanceAPI: Error while attempting token refresh', e);
      }
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log('AttendanceAPI: Authorization header set');
    } else {
      console.warn('AttendanceAPI: No token available - aborting attendance submission (unauthenticated)');
      return { success: false, message: 'Not authenticated. Please login to submit attendance.' };
    }

    const requestBody = {
      userId: payload.userId,
      time: payload.timestamp || new Date().toISOString(),
      recognition_log_id: payload.recognition_log_id,
      confidence: payload.confidence,
      method: payload.method,
      imageUri: payload.imageUri
    };
    console.log('AttendanceAPI: Submitting attendance to:', `${base}/api/attendance/record`);
    console.log('AttendanceAPI: Request body:', JSON.stringify(requestBody, null, 2));

    // Gọi API record - tự động phát hiện check-in hoặc check-out
    const res = await fetch(`${base}/api/attendance/record`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    let data = await res.json().catch(() => null);
    console.log('AttendanceAPI: Response status:', res.status, 'Data:', data);

    if (res.status === 401) {
      console.log('AttendanceAPI: Got 401, attempting token refresh...');
      // attempt refresh once
      const newToken = await AuthTokenManager.refreshAccessToken();
      if (newToken) {
        console.log('AttendanceAPI: Token refreshed successfully, retrying request...');
        headers['Authorization'] = `Bearer ${newToken}`;
        const retry = await fetch(`${base}/api/attendance/record`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });
        const retryData = await retry.json().catch(() => null);
        console.log('AttendanceAPI: Retry response status:', retry.status, 'Data:', retryData);
        if (retry.ok) return retryData;
        return { success: false, message: retryData?.message || `HTTP ${retry.status}`, error: retryData };
      }
      console.error('❌ AttendanceAPI: Token refresh failed - session expired');
      console.error('❌ AttendanceAPI: User needs to login again');
      await AuthTokenManager.clearTokens();
      return { success: false, message: data?.message || 'Unauthorized - please login again', error: data };
    }

    if (!res.ok) {
      console.error('AttendanceAPI: Error response:', data);
      return { success: false, message: data?.message || `HTTP ${res.status}: ${res.statusText}`, error: data };
    }

    console.log('AttendanceAPI: Success:', data);
    return data;
    
  } catch (error) {
    console.error('AttendanceAPI: Submit attendance error:', error);
    return { 
      success: false, 
      message: `Network error: ${error.message}`,
      error: error 
    };
  }
}

const AttendanceAPI = { testConnection, sendImageForRecognition, submitAttendance, getGatewayBaseUrl };
export default AttendanceAPI;



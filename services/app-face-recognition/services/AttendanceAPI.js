import Constants from 'expo-constants';

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
  
  Object.entries(meta || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'recognition_type') {
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
    
    // Chuẩn bị dữ liệu cho attendance service
    const attendanceData = {
      userId: payload.userId,
      attendanceType: payload.type === 'check_in' ? 'checkin' : 'checkout', // Chuyển đổi format
      location: payload.location || null,
      device: 'mobile_app',
      confidence: payload.confidence,
      method: payload.method,
      timestamp: payload.timestamp
    };
    
    console.log('Sending attendance data:', attendanceData);
    
    const res = await fetch(`${base}/api/attendance/confirm`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' 
      },
      body: JSON.stringify(attendanceData),
    });
    
    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: 'Invalid JSON response from attendance service' };
    }
    
    if (!res.ok) {
      console.error('Attendance API error:', data);
      return { 
        success: false, 
        message: data?.message || `HTTP ${res.status}: ${res.statusText}`,
        error: data 
      };
    }
    
    console.log('Attendance response:', data);
    return data;
    
  } catch (error) {
    console.error('Submit attendance error:', error);
    return { 
      success: false, 
      message: `Network error: ${error.message}`,
      error: error 
    };
  }
}

const AttendanceAPI = { testConnection, sendImageForRecognition, submitAttendance };
export default AttendanceAPI;



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
  Object.entries(meta || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });

  const res = await fetch(`${base}/api/ai/recognize`, {
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
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/attendance/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ success: false }));
  if (!res.ok) return { success: false, ...data };
  return data;
}

const AttendanceAPI = { testConnection, sendImageForRecognition, submitAttendance };
export default AttendanceAPI;



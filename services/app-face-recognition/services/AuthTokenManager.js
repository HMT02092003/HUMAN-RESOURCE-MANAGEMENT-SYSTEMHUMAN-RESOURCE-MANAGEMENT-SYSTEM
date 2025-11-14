import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

async function getBaseUrl() {
  // reuse same heuristic as AttendanceAPI: try to derive gateway host
  const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri || null;
  if (hostUri) {
    const withoutProtocol = String(hostUri).replace(/^\w+:\/\//, '');
    const hostPart = withoutProtocol.split('/')[0];
    const host = hostPart.split(':')[0];
    if (host) return `http://${host}:4000`;
  }
  return 'http://127.0.0.1:4000';
}

export async function saveTokens(accessToken, refreshToken) {
  try {
    if (accessToken) await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    return true;
  } catch (e) {
    console.warn('AuthTokenManager.saveTokens error', e);
    return false;
  }
}

export async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch (e) { /* ignore */ }
}

export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch (e) { return null; }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch (e) { return null; }
}

export async function refreshAccessToken() {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      console.warn('refreshAccessToken failed', res.status);
      return null;
    }
    const data = await res.json();
    const newAccess = data?.token || data?.accessToken || null;
    const newRefresh = data?.refreshToken || refreshToken;
    if (newAccess) await saveTokens(newAccess, newRefresh);
    return newAccess;
  } catch (e) {
    console.error('refreshAccessToken error', e);
    return null;
  }
}

export async function loginAndSave(username, password) {
  try {
    const base = await getBaseUrl();
    console.log(`AuthTokenManager: Attempting login to ${base}/api/auth/login with username: ${username}`);
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Login failed:', res.status, err);
      throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    console.log('Login response received:', { hasToken: !!data?.token, hasUser: !!data?.user });
    const access = data?.token || data?.accessToken || null;
    const refresh = data?.refreshToken || null;
    if (access) {
      await saveTokens(access, refresh);
      console.log('Tokens saved successfully');
    } else {
      console.warn('Login succeeded but no access token in response');
    }
    return { access, refresh, user: data?.user };
  } catch (e) {
    console.error('loginAndSave error', e);
    throw e;
  }
}

export default {
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  loginAndSave
};

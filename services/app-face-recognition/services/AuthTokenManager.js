import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { jwtDecode } from "jwt-decode";
import "core-js/stable/atob"; // Polyfill để giải mã base64 trên Android

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

async function getBaseUrl() {
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
    console.error('❌ [AUTH] saveTokens error:', e);
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
  } catch (e) {
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch (e) { return null; }
}

// Hàm mới: Lấy thông tin User từ Token
export async function getUserInfo() {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    
    const decoded = jwtDecode(token);
    // Trả về object chứa thông tin user (id, username, role...)
    return decoded; 
  } catch (error) {
    console.error('❌ [AUTH] Decode token error:', error);
    return null;
  }
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
      await clearTokens();
      return null;
    }
    
    const data = await res.json();
    const newAccess = data?.token || data?.accessToken || null;
    const newRefresh = data?.refreshToken || refreshToken;
    
    if (newAccess) await saveTokens(newAccess, newRefresh);
    return newAccess;
  } catch (e) {
    await clearTokens();
    return null;
  }
}

export async function loginAndSave(username, password) {
  try {
    const base = await getBaseUrl();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    
    const access = data?.token || data?.accessToken || null;
    const refresh = data?.refreshToken || null;
    
    if (access) await saveTokens(access, refresh);
    
    return { access, refresh, user: data?.user };
  } catch (e) {
    throw e;
  }
}

export default {
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  loginAndSave,
  getUserInfo // Export thêm hàm này
};
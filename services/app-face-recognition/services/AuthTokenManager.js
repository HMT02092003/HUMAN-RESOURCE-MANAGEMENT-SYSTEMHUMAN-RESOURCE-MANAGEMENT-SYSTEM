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
    console.log('💾 [AUTH] Attempting to save tokens...', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
    if (accessToken) {
      await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
      console.log('💾 [AUTH] Access token saved to SecureStore');
    }
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
      console.log('💾 [AUTH] Refresh token saved to SecureStore');
    }
    return true;
  } catch (e) {
    console.error('❌ [AUTH] saveTokens error:', e);
    console.error('❌ [AUTH] This may happen if SecureStore is not available on this device/emulator');
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
    const token = await SecureStore.getItemAsync(ACCESS_KEY);
    if (token) {
      console.log('🔑 [AUTH] Access token retrieved from SecureStore, length:', token.length);
    } else {
      console.log('⚠️ [AUTH] No access token found in SecureStore');
    }
    return token;
  } catch (e) {
    console.error('❌ [AUTH] getAccessToken error:', e);
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch (e) { return null; }
}

export async function refreshAccessToken() {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.error('❌ [AUTH] No refresh token available');
      return null;
    }
    
    const base = await getBaseUrl();
    console.log('🔄 [AUTH] Calling refresh-token endpoint:', `${base}/api/auth/refresh-token`);
    console.log('🔄 [AUTH] Refresh token length:', refreshToken.length);
    
    const res = await fetch(`${base}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ [AUTH] Refresh token failed:', res.status, errorData);
      console.error('❌ [AUTH] Clearing tokens due to refresh failure');
      await clearTokens();
      return null;
    }
    
    const data = await res.json();
    console.log('✅ [AUTH] Refresh token response:', { hasToken: !!data?.token, hasRefresh: !!data?.refreshToken });
    
    const newAccess = data?.token || data?.accessToken || null;
    const newRefresh = data?.refreshToken || refreshToken;
    
    if (newAccess) {
      await saveTokens(newAccess, newRefresh);
      console.log('✅ [AUTH] New tokens saved successfully');
    } else {
      console.error('❌ [AUTH] No access token in refresh response');
    }
    
    return newAccess;
  } catch (e) {
    console.error('❌ [AUTH] refreshAccessToken error:', e);
    await clearTokens();
    return null;
  }
}

export async function loginAndSave(username, password) {
  try {
    const base = await getBaseUrl();
    console.log(`🔐 [AUTH] Attempting login to ${base}/api/auth/login with username: ${username}`);
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    console.log('🔐 [AUTH] Login response status:', res.status);
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('❌ [AUTH] Login failed:', res.status, err);
      throw new Error(err?.error || err?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    console.log('🔐 [AUTH] Login response received:', { 
      hasToken: !!data?.token, 
      hasAccessToken: !!data?.accessToken,
      hasUser: !!data?.user,
      hasRefreshToken: !!data?.refreshToken,
      status: data?.status
    });
    
    const access = data?.token || data?.accessToken || null;
    const refresh = data?.refreshToken || null;
    
    console.log('🔐 [AUTH] Extracted tokens:', { hasAccess: !!access, hasRefresh: !!refresh });
    
    if (access) {
      const saveResult = await saveTokens(access, refresh);
      console.log('💾 [AUTH] Save tokens result:', saveResult ? 'SUCCESS' : 'FAILED');
      
      // Verify tokens were saved
      const verifyAccess = await getAccessToken();
      const verifyRefresh = await getRefreshToken();
      console.log('✅ [AUTH] Token verification:', { 
        accessSaved: !!verifyAccess, 
        refreshSaved: !!verifyRefresh 
      });
    } else {
      console.error('❌ [AUTH] Login succeeded but no access token in response');
    }
    return { access, refresh, user: data?.user };
  } catch (e) {
    console.error('❌ [AUTH] loginAndSave error:', e);
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

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './apiConfig';

// For web compatibility, we'll dynamically import AsyncStorage only when needed
// But first, let's provide a consistent interface
let storageHandler = null;

// Initialize storage based on platform
if (Platform.OS === 'web') {
  // For web, use localStorage with async wrapper
  storageHandler = {
    getItem: async (key) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } catch (error) {
        console.warn('localStorage not available:', error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    },
    removeItem: async (key) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    }
  };
} else {
  // For native platforms, use SecureStore
  storageHandler = {
    getItem: async (key) => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn('SecureStore not available:', error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.warn('SecureStore not available:', error);
      }
    },
    removeItem: async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.warn('SecureStore not available:', error);
      }
    }
  };
}

// Tự động lấy API URL (auto-detect từ Expo hoặc fallback theo platform)
const API_BASE_URL = getApiBaseUrl();

class AuthTokenManager {
  static get ACCESS_TOKEN_KEY() {
    return 'token';
  }

  static get REFRESH_TOKEN_KEY() {
    return 'refreshToken';
  }

  static get USER_KEY() {
    return 'user';
  }

  // Login và lưu tokens - GIỐNG WEB
  static async loginAndSave(username, password) {
    console.log('🔐 [AUTH] Attempting login for:', username);
    console.log('🔐 [AUTH] API URL:', `${API_BASE_URL}/auth/login`);
    
    try {
      // Call API giống hệt web
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });

      console.log('✅ [AUTH] Login successful');
      console.log('✅ [AUTH] Token received:', response.data.token ? 'Yes' : 'No');
      console.log('✅ [AUTH] Refresh token received:', response.data.refreshToken ? 'Yes' : 'No');

      // Lưu tokens giống web (web dùng cookies, mobile dùng storage)
      if (response.data.token) {
        await storageHandler.setItem(this.ACCESS_TOKEN_KEY, response.data.token);
        console.log('💾 [AUTH] Access token saved');
      }

      if (response.data.refreshToken) {
        await storageHandler.setItem(this.REFRESH_TOKEN_KEY, response.data.refreshToken);
        console.log('💾 [AUTH] Refresh token saved');
      }

      // Save user data
      if (response.data.user) {
        await storageHandler.setItem(this.USER_KEY, JSON.stringify(response.data.user));
        console.log('💾 [AUTH] User data saved:', response.data.user.username);
      }

      return {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
      };
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error.response?.data || error.message);
      // Throw error với format giống web
      if (error.response && error.response.data) {
        throw new Error(error.response.data.error || error.response.data.message || 'Đăng nhập thất bại');
      }
      throw new Error('Không thể kết nối đến server');
    }
  }

  // Lấy user data
  static async getUser() {
    try {
      const userJson = await storageHandler.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Lấy access token
  static async getAccessToken() {
    try {
      const token = await storageHandler.getItem(this.ACCESS_TOKEN_KEY);
      if (token) {
        console.log('🔑 [AUTH] Access token retrieved, length:', token.length);
        // Try to decode token payload (JWT) to inspect exp claim for debugging
        try {
          const payload = this.decodeJwt(token);
          if (payload && payload.exp) {
            const expMs = payload.exp * 1000;
            const nowMs = Date.now();
            const secsLeft = Math.max(0, Math.floor((expMs - nowMs) / 1000));
            console.log(`⏳ [AUTH] Access token exp (unix): ${payload.exp}, expires in ${secsLeft} seconds`);
          } else {
            console.log('⏳ [AUTH] Could not find exp in token payload');
          }
        } catch (e) {
          console.warn('⚠️ [AUTH] Could not decode JWT payload for token inspection', e);
        }
      } else {
        console.warn('⚠️ [AUTH] No access token found');
      }
      return token;
    } catch (error) {
      console.error('❌ [AUTH] Error getting access token:', error);
      return null;
    }
  }

  // Decode JWT payload without verifying signature. Returns parsed payload or null.
  static decodeJwt(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      // base64url -> base64
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // atob may not exist in some RN environments; try global.atob then Buffer
      let jsonPayload = null;
      if (typeof global !== 'undefined' && typeof global.atob === 'function') {
        const decoded = global.atob(base64);
        jsonPayload = decodeURIComponent(decoded.split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      } else if (typeof Buffer !== 'undefined') {
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        jsonPayload = decoded;
      } else if (typeof atob === 'function') {
        const decoded = atob(base64);
        jsonPayload = decodeURIComponent(decoded.split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      } else {
        // Cannot decode in this environment
        throw new Error('No base64 decode available (atob/Buffer)');
      }

      return JSON.parse(jsonPayload);
    } catch (err) {
      return null;
    }
  }

  // Lưu access token (dùng cho refresh token flow)
  static async saveAccessToken(token) {
    try {
      console.log('💾 [AUTH] Saving new access token...');
      await storageHandler.setItem(this.ACCESS_TOKEN_KEY, token);
      console.log('✅ [AUTH] Access token saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [AUTH] Error saving access token:', error);
      return false;
    }
  }

  // Lấy refresh token
  static async getRefreshToken() {
    try {
      const token = await storageHandler.getItem(this.REFRESH_TOKEN_KEY);
      if (token) {
        console.log('🔄 [AUTH] Refresh token retrieved');
      } else {
        console.warn('⚠️ [AUTH] No refresh token found');
      }
      return token;
    } catch (error) {
      console.error('❌ [AUTH] Error getting refresh token:', error);
      return null;
    }
  }

  // Xóa tokens và user (logout)
  static async clearTokens() {
    console.log('🗑️ [AUTH] Clearing all tokens and user data...');
    try {
      await storageHandler.removeItem(this.ACCESS_TOKEN_KEY);
      await storageHandler.removeItem(this.REFRESH_TOKEN_KEY);
      await storageHandler.removeItem(this.USER_KEY);
      console.log('✅ [AUTH] All tokens cleared successfully');
    } catch (error) {
      console.error('❌ [AUTH] Error clearing tokens:', error);
    }
  }

  // Refresh access token
  static async refreshAccessToken() {
    try {
      console.log('🔄 [AUTH] Attempting to refresh access token...');
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.error('❌ [AUTH] No refresh token available for refresh');
        throw new Error('No refresh token available');
      }

      console.log('🔄 [AUTH] Calling refresh endpoint with token length:', refreshToken.length);
      const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      console.log('🔄 [AUTH] Refresh response status:', response.status);
      console.log('🔄 [AUTH] Refresh response data:', JSON.stringify(response.data, null, 2));

      // Backend có thể trả về "token" hoặc "accessToken" - handle cả hai
      const newToken = response.data.token || response.data.accessToken;
      if (newToken) {
        await storageHandler.setItem(this.ACCESS_TOKEN_KEY, newToken);
        console.log('✅ [AUTH] New access token saved after refresh');
        
        // Also update refresh token if server returns a new one (sliding refresh)
        if (response.data.refreshToken && response.data.refreshToken !== refreshToken) {
          await storageHandler.setItem(this.REFRESH_TOKEN_KEY, response.data.refreshToken);
          console.log('✅ [AUTH] New refresh token saved (sliding refresh)');
        }
        
        return newToken;
      } else {
        console.error('❌ [AUTH] No token in refresh response');
        throw new Error('No token in refresh response');
      }
    } catch (error) {
      console.error('❌ [AUTH] Error refreshing token:', error.response?.data || error.message);
      console.error('❌ [AUTH] Error status:', error.response?.status);
      
      // If refresh fails (e.g. refresh token expired), clear all tokens
      await this.clearTokens();
      throw error;
    }
  }
}

export default AuthTokenManager;

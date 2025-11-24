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
      } else {
        console.warn('⚠️ [AUTH] No access token found');
      }
      return token;
    } catch (error) {
      console.error('❌ [AUTH] Error getting access token:', error);
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
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const { accessToken } = response.data;
      if (accessToken) {
        await storageHandler.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      }

      return accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await this.clearTokens();
      throw error;
    }
  }
}

export default AuthTokenManager;

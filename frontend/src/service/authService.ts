import api from './apiService';
import Cookies from 'js-cookie';
import { getDecodedToken } from '../utils/decode-token';

interface LoginCredentials {
  username: string;
  password: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

class AuthService {
  // Rely on axios instance baseURL (apiService) which already resolves dynamic IP/port
  private baseURL = '';

  // Login
  async login(credentials: LoginCredentials) {
    try {
      const response = await api.post(`/api/auth/login`, credentials);
      
      if (response.data.refreshToken) {
        Cookies.set('refreshToken', response.data.refreshToken);
      }

      if (response.data.token) {
  Cookies.set('token', response.data.token);
  if (typeof window !== 'undefined') window.localStorage?.setItem('token', response.data.token);
      }

      const token = Cookies.get('token');
      const decoded = token ? getDecodedToken(token) : null;

      return {
        token,
        decoded,
        refreshToken: response.data.refreshToken,
        user: response.data.user
      };
    } catch (error: any) {
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(email: string) {
    try {
      const response = await api.post(`/api/forgot-password`, { email });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Reset password
  async resetPassword(data: ResetPasswordData) {
    try {
      const response = await api.post(`/api/reset-password`, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    try {
      const response = await api.post(`/api/refresh-token`, { refreshToken });
      
      if (response.data.token) {
    Cookies.set('token', response.data.token);
    if (typeof window !== 'undefined') window.localStorage?.setItem('token', response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Verify token
  async verifyToken() {
    try {
      const token = Cookies.get('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await api.get(`/api/verify-token`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Logout
  logout() {
    Cookies.remove('token');
    Cookies.remove('refreshToken');
  if (typeof window !== 'undefined') window.localStorage?.removeItem('token');
  }
}

export const authService = new AuthService(); 
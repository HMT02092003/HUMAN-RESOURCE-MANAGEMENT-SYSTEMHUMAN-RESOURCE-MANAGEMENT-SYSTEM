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
  private baseURL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';

  // Login
  async login(credentials: LoginCredentials) {
    try {
      const response = await api.post(`${this.baseURL}/api/auth/login`, credentials);
      
      if (response.data.refreshToken) {
        Cookies.set('refreshToken', response.data.refreshToken);
      }

      if (response.data.token) {
        Cookies.set('token', response.data.token);
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
      const response = await api.post(`${this.baseURL}/api/forgot-password`, { email });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Reset password
  async resetPassword(data: ResetPasswordData) {
    try {
      const response = await api.post(`${this.baseURL}/api/reset-password`, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    try {
      const response = await api.post(`${this.baseURL}/api/refresh-token`, { refreshToken });
      
      if (response.data.token) {
        Cookies.set('token', response.data.token);
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

      const response = await api.get(`${this.baseURL}/api/verify-token`, {
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
  }
}

export const authService = new AuthService(); 
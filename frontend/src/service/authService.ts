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
  confirmPassword: string;
}

interface ResetPasswordWithOTPData {
  username: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
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
  async requestPasswordReset(username: string) {
    try {
      const response = await api.post(`/api/auth/forgot-password`, { username });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Verify reset token
  async verifyResetToken(token: string) {
    try {
      const response = await api.get(`/api/auth/verify-reset-token/${token}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Verify OTP code
  async verifyOTP(username: string, otp: string) {
    try {
      const response = await api.post(`/api/auth/verify-otp`, { username, otp });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Reset password (supports both token and OTP flows)
  async resetPassword(data: ResetPasswordData | ResetPasswordWithOTPData) {
    try {
      const response = await api.post(`/api/auth/reset-password`, data);
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
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('token');
      window.localStorage?.removeItem('user');
    }
  }

  // Change password
  async changePassword(password: string) {
    try {
      const response = await api.post(`/api/auth/change-password`, { password });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get current user info
  async getCurrentUser() {
    try {
      const response = await api.get(`/api/me`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const authService = new AuthService();
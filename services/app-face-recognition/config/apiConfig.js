/**
 * API Configuration - Centralized API URLs
 * 
 * Sử dụng biến môi trường EXPO_PUBLIC_API_GATEWAY_URL từ file .env
 * 
 * ⚠️ Lưu ý:
 * - Khi IP thay đổi: Sửa file .env trong thư mục services/app-face-recognition
 * - Khi deploy production: Thay IP bằng domain trong .env
 */

import { Platform } from 'react-native';

class APIConfig {
  constructor() {
    // Luôn lấy trực tiếp từ process.env để đảm bảo tính thực tế 100%
    const envUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;

    if (!envUrl) {
      console.error('❌ [APIConfig] CRITICAL: EXPO_PUBLIC_API_GATEWAY_URL is not defined in .env!');
    }

    // Remove trailing /api if present to keep it a clean base URL
    this._baseURL = (envUrl || '').replace(/\/api$/, '');
    console.log(`📡 [APIConfig] Loaded Gateway URL: ${this._baseURL}`);
  }

  /**
   * Get Gateway Base URL
   */
  getGatewayURL() {
    return this._baseURL;
  }

  /**
   * Helper to get full URL for an endpoint
   */
  getURL(endpoint) {
    const base = this.getGatewayURL();
    if (!base) return '';
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  // Khử bỏ các hàm không cần thiết để tối giản
  async initialize() {
    this.initialized = true;
    return Promise.resolve();
  }
}

/**
 * API Endpoints - Centralized endpoint paths
 */
export const API_ENDPOINTS = {
  // Face Recognition endpoints (via /api/ai gateway -> AI service /api/v1/face/enhanced/...)
  REGISTER_FACE: '/api/ai/v1/face/enhanced/register-face',
  RECOGNIZE_FACE: '/api/ai/v1/face/enhanced/recognize-face',
  VIDEO_REGISTER_MULTI: '/api/ai/v1/batch/register-face-video-multi',

  // Attendance endpoints
  CHECK_IN: '/api/attendance/check-in',
  CHECK_OUT: '/api/attendance/check-out',

  // Auth endpoints
  LOGIN: '/api/auth/login',
  REFRESH_TOKEN: '/api/auth/refresh'
};

const apiConfig = new APIConfig();
export default apiConfig;

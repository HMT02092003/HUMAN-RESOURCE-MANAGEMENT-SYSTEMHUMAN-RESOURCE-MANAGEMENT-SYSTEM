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
    this._baseURL = null;
    this.initialized = false;
  }

  /**
   * Initialize API Config
   */
  async initialize() {
    if (this.initialized) return;
    this.getGatewayURL();
    this.initialized = true;
    console.log('[APIConfig] Initialized successfully');
  }

  /**
   * Get Gateway Base URL from environment variable
   */
  getGatewayURL() {
    if (this._baseURL) return this._baseURL;

    const envUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;
    
    if (!envUrl) {
      console.error('[APIConfig] ERROR: EXPO_PUBLIC_API_GATEWAY_URL not found in .env!');
      console.error('[APIConfig] Please check your .env file in services/app-face-recognition folder');
      throw new Error('Missing EXPO_PUBLIC_API_GATEWAY_URL in .env file');
    }

    // Remove /api suffix if present to get base URL
    this._baseURL = envUrl.replace(/\/api$/, '');
    
    console.log('[APIConfig] Gateway URL from .env:', this._baseURL);
    console.log('[APIConfig] Platform:', Platform.OS);
    
    return this._baseURL;
  }

  /**
   * Helper to get full URL for an endpoint
   */
  getURL(endpoint) {
    const base = this.getGatewayURL();
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }
}

/**
 * API Endpoints - Centralized endpoint paths
 */
export const API_ENDPOINTS = {
  // Face Recognition endpoints (via /api/ai gateway -> AI service /api/v1/...)
  REGISTER_FACE: '/api/ai/v1/face/register-face',
  RECOGNIZE_FACE: '/api/ai/v1/face/recognize-face',
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

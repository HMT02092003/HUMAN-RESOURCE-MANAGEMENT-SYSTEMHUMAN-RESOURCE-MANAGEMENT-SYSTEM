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
   * Determine best URL
   * Strictly uses LAN IP from .env as per requirements
   */
  async determineBestUrl() {
    const envUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;

    if (envUrl) {
      const cleanBase = envUrl.replace(/\/api$/, '');
      console.log(`📡 [APIConfig] Using API URL from .env: ${cleanBase}`);

      // Still good practice to check if it's reachable
      if (await this.checkConnection(cleanBase)) {
        console.log('✅ [APIConfig] Connection successful');
      } else {
        console.warn('⚠️ [APIConfig] Connection test failed, but using .env URL as requested.');
      }

      this._baseURL = cleanBase;
    } else {
      console.error('❌ [APIConfig] EXPO_PUBLIC_API_GATEWAY_URL not found in .env');
      this._baseURL = 'http://192.168.1.8:4100'; // Fallback to a default if missing
    }
  }

  async checkConnection(baseUrl) {
    if (!baseUrl) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const healthUrl = `${baseUrl}/health`; // Assuming /health exists at root of gateway

      console.log(`   Testing: ${healthUrl}`);
      const response = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (e) {
      // console.log(`   Failed: ${baseUrl} (${e.message})`);
      return false;
    }
  }

  /**
   * Get Gateway Base URL
   */
  getGatewayURL() {
    if (this._baseURL) return this._baseURL;

    // Fallback if not initialized
    return (process.env.EXPO_PUBLIC_API_GATEWAY_URL || 'http://192.168.1.8:4100').replace(/\/api$/, '');
  }

  /**
   * Initialize API Config
   */
  async initialize() {
    if (this.initialized) return;
    await this.determineBestUrl();
    this.initialized = true;
    console.log('[APIConfig] Initialized with URL:', this._baseURL);
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

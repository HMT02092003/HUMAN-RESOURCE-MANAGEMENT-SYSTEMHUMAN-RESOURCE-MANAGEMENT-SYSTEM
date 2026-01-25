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
   * Determine best URL by checking connectivity
   * Priority: NGROK -> ENV -> Localhost
   */
  async determineBestUrl() {
    const envUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;
    const localCandidates = [
      envUrl,
      'http://192.168.1.8:4100', // Common local IP from your env
      'http://localhost:4100'
    ].filter(Boolean);

    console.log('🔄 [APIConfig] Testing connections...');

    // 1. Try Ngrok
    if (await this.checkConnection(this.NGROK_URL)) {
      console.log('✅ [APIConfig] Selected Public NGROK');
      this._baseURL = this.NGROK_URL;
      return;
    }

    // 2. Try Local Candidates
    for (const url of localCandidates) {
      // Create clean base URL (no /api suffix for health check usually, but here we treat base as strictly root or /api?) 
      // Looking at getGatewayURL logic: `baseUrl.replace(/\/api$/, '')`
      // So let's clean it first.
      const cleanBase = url.replace(/\/api$/, '');
      if (await this.checkConnection(cleanBase)) {
        console.log(`✅ [APIConfig] Selected Local: ${cleanBase}`);
        this._baseURL = cleanBase;
        return;
      }
    }

    // 3. Last resort: Default to Ngrok if everything fails (or whatever was default)
    console.warn('⚠️ [APIConfig] All connections failed. Defaulting to Ngrok.');
    this._baseURL = this.NGROK_URL;
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

    // If not initialized yet (should call initialize() at app start),
    // default to Ngrok temporarily to avoid blocking immediate sync calls
    return this.NGROK_URL;
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

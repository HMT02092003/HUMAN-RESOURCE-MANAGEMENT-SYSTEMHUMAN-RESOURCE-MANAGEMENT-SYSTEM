/**
 * API Configuration - Centralized API URLs
 * ========================================
 * Auto-detect LAN IP giống như web frontend
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Get local IP address (LAN IP) của máy chủ
 * Trên mobile app cần phải dùng IP LAN, không dùng localhost
 */
const getServerIP = async () => {
  try {
    const state = await NetInfo.fetch();
    
    // Nếu đang kết nối WiFi, dùng IP gateway (thường là server IP)
    if (state.type === 'wifi' && state.details && state.details.ipAddress) {
      // Gateway thường là xxx.xxx.xxx.1, server thường là xxx.xxx.xxx.4 hoặc gần đó
      const clientIP = state.details.ipAddress;
      const segments = clientIP.split('.');
      
      // Giả sử server ở xxx.xxx.xxx.4 (hoặc có thể scan range)
      // Trong môi trường dev, thường server fixed ở .4
      const serverIP = `${segments[0]}.${segments[1]}.${segments[2]}.4`;
      
      console.log(`📡 Detected LAN - Client: ${clientIP}, Server: ${serverIP}`);
      return serverIP;
    }
    
    // Fallback về localhost nếu không detect được
    console.warn('⚠️ Cannot detect LAN IP, using localhost');
    return 'localhost';
    
  } catch (error) {
    console.error('❌ Error detecting IP:', error);
    return 'localhost';
  }
};

/**
 * API Configuration
 */
class APIConfig {
  constructor() {
    this.serverIP = null;
    this.initialized = false;
  }

  /**
   * Initialize config - phải gọi trước khi dùng API
   */
  async initialize() {
    if (this.initialized) return;
    
    this.serverIP = await getServerIP();
    this.initialized = true;
    
    console.log(`✅ API Config initialized - Server: ${this.serverIP}`);
  }

  /**
   * Get base URL cho Gateway
   */
  getGatewayURL() {
    const ip = this.serverIP || 'localhost';
    return `http://${ip}:4000`;
  }

  /**
   * Get base URL cho AI Service (direct)
   */
  getAIServiceURL() {
    const ip = this.serverIP || 'localhost';
    return `http://${ip}:4006`;
  }

  /**
   * Get full API URL
   * @param {string} endpoint - Endpoint path (e.g., '/api/auth/login')
   * @param {boolean} useDirect - Dùng direct AI service thay vì gateway
   */
  getURL(endpoint, useDirect = false) {
    const baseURL = useDirect ? this.getAIServiceURL() : this.getGatewayURL();
    
    // Đảm bảo endpoint bắt đầu bằng /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseURL}${path}`;
  }
}

// Singleton instance
const apiConfig = new APIConfig();

export default apiConfig;

/**
 * Các endpoints thường dùng
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REFRESH_TOKEN: '/api/refresh-token',
  
  // AI Face Recognition - Tất cả đều qua Gateway với tiền tố /api/ai
  // Gateway sẽ tự động rewrite /api/ai -> /api trước khi gửi xuống AI Service
  
  // Multi-angle Face Recognition (Nhận diện với 3 vector)
  FACE_RECOGNITION: '/api/ai/v1/multi-angle/recognize-face',
  MULTI_ANGLE_REGISTER: '/api/ai/v1/multi-angle/register-faces',  // Đăng ký 3 ảnh cùng lúc
  
  // Batch Registration (Video approach)
  BATCH_REGISTER: '/api/ai/v1/batch/register-face',  // Batch images (15-20 ảnh)
  VIDEO_REGISTER: '/api/ai/v1/batch/register-face-video',  // Single video (all angles in 1 video)
  VIDEO_REGISTER_MULTI: '/api/ai/v1/batch/register-face-video-multi',  // Multiple videos (1 video per angle)
  BATCH_HEALTH: '/api/ai/v1/batch/health',
  
  // Attendance
  ATTENDANCE_RECORD: '/api/attendance/record',  // Tự động check-in hoặc check-out
  ATTENDANCE_CHECKIN: '/api/attendance/checkin',
  ATTENDANCE_CHECKOUT: '/api/attendance/checkout',
};

/**
 * Helper function để build full URL
 * @param {string} endpoint - Endpoint constant from API_ENDPOINTS
 * @param {boolean} useDirect - Use direct AI service
 */
export const buildURL = async (endpoint, useDirect = false) => {
  if (!apiConfig.initialized) {
    await apiConfig.initialize();
  }
  return apiConfig.getURL(endpoint, useDirect);
};

/**
 * ============================================
 * API SERVICE - CENTRALIZED API HANDLER
 * ============================================
 * 
 * File này GIỐNG HỆT apiService.ts của Frontend
 * - Tự động thêm Authorization header
 * - Tự động thêm TimeZone header
 * - Tự động xử lý FormData (file upload)
 * - Tự động refresh token khi 401
 * - Xử lý lỗi tập trung
 * 
 * TẤT CẢ API calls phải đi qua file này!
 */

import axios from 'axios';
import { Alert, Platform } from 'react-native';
import * as moment from 'moment-timezone';
import AuthTokenManager from './AuthTokenManager';
import { getApiBaseUrl } from './apiConfig';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = getApiBaseUrl();

console.log('🌐 [API SERVICE] Initialized with base URL:', API_BASE_URL);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build FormData từ object (giống Frontend)
 * Dùng cho file upload
 */
function buildFormData(formData, data, parentKey) {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
    Object.keys(data).forEach(key => {
      buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
    });
  } else {
    const value = data == null ? '' : data;
    formData.append(parentKey || '', value);
  }
}

/**
 * Kiểm tra xem object có chứa File không
 */
function containsFile(obj) {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  if (obj instanceof File || (obj.uri && obj.type && obj.name)) {
    // React Native file object có dạng: { uri, type, name }
    return true;
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (containsFile(obj[key])) {
        return true;
      }
    }
  }
  return false;
}

// ============================================
// AXIOS INSTANCE CREATION
// ============================================

const createApiInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
    withCredentials: false, // Mobile không cần cookies
  });

  // ============================================
  // REQUEST INTERCEPTOR
  // ============================================
  instance.interceptors.request.use(
    async (config) => {
      console.log('📤 [API REQUEST]', config.method?.toUpperCase(), config.url);

      // 1. THÊM AUTHORIZATION HEADER
      const accessToken = await AuthTokenManager.getAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        console.log('🔑 [API] Token attached, length:', accessToken.length);
      } else {
        console.warn('⚠️ [API] No token found - request may fail if protected');
      }

      // 2. THÊM TIMEZONE HEADER (giống Frontend)
      const timezone = moment.tz.guess() || 'Asia/Ho_Chi_Minh';
      config.headers['TimeZone'] = timezone;
      console.log('🕒 [API] Timezone:', timezone);

      // 3. XỬ LÝ FORMDATA CHO FILE UPLOAD (giống Frontend)
      const isPostPutPatch = ['post', 'put', 'patch'].includes(config.method);

      if (isPostPutPatch && config.data && containsFile(config.data)) {
        console.log('📎 [API] File detected, converting to FormData');
        
        const formData = new FormData();
        buildFormData(formData, config.data);
        config.data = formData;
        
        // XÓA Content-Type để axios tự set boundary cho multipart/form-data
        delete config.headers['Content-Type'];
      }

      console.log('📤 [API] Full URL:', config.baseURL + config.url);
      console.log('📤 [API] Headers:', JSON.stringify(config.headers, null, 2));

      return config;
    },
    (error) => {
      console.error('❌ [API REQUEST ERROR]', error);
      return Promise.reject(error);
    }
  );

  // ============================================
  // RESPONSE INTERCEPTOR
  // ============================================
  instance.interceptors.response.use(
    (response) => {
      console.log('✅ [API RESPONSE]', response.status, response.config.method?.toUpperCase(), response.config.url);
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      console.error('❌ [API ERROR]', originalRequest?.method?.toUpperCase(), originalRequest?.url);
      console.error('❌ [API ERROR] Status:', error.response?.status);
      console.error('❌ [API ERROR] Data:', JSON.stringify(error.response?.data, null, 2));

      // XỬ LÝ 401 - TOKEN HẾT HẠN (giống Frontend)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        console.log('🔄 [API] Token expired, attempting refresh...');

        try {
          // Lấy refresh token
          const refreshToken = await AuthTokenManager.getRefreshToken();

          if (!refreshToken) {
            console.error('❌ [API] No refresh token found');
            throw new Error('No refresh token');
          }

          // GỌI API REFRESH TOKEN
          console.log('🔄 [API] Calling refresh token endpoint...');
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          if (refreshResponse.data && refreshResponse.data.token) {
            console.log('✅ [API] Token refreshed successfully');

            // LƯU TOKEN MỚI
            await AuthTokenManager.saveAccessToken(refreshResponse.data.token);

            // CẬP NHẬT HEADER VÀ GỌI LẠI REQUEST CŨ
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
            return instance(originalRequest);
          } else {
            throw new Error('Invalid refresh response');
          }
        } catch (refreshError) {
          console.error('❌ [API] Refresh token failed:', refreshError);

          // XÓA TOKENS VÀ LOGOUT
          await AuthTokenManager.clearTokens();

          // THÔNG BÁO NGƯỜI DÙNG
          Alert.alert(
            'Phiên đăng nhập hết hạn',
            'Vui lòng đăng nhập lại',
            [{ text: 'OK' }]
          );

          return Promise.reject(refreshError);
        }
      }

      // XỬ LÝ CÁC LỖI KHÁC
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        error.message || 
        'Có lỗi xảy ra';

      // CHỈ hiển thị Alert cho lỗi KHÔNG phải 401 (401 đã xử lý ở trên)
      if (error.response?.status !== 401) {
        Alert.alert('Lỗi', errorMessage, [{ text: 'OK' }]);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

const apiService = createApiInstance();

export default apiService;

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * CÁC SERVICE NÊN DÙNG apiService thay vì api.js
 * 
 * VÍ DỤ - UserService.js:
 * 
 * import apiService from './apiService';
 * 
 * class UserService {
 *   static async getAllUsers(params) {
 *     const response = await apiService.get('/auth/users', { params });
 *     return response.data;
 *   }
 * 
 *   static async createUser(data) {
 *     const response = await apiService.post('/auth/users', data);
 *     return response.data;
 *   }
 * 
 *   static async uploadAvatar(userId, imageFile) {
 *     const response = await apiService.post(`/auth/users/${userId}/avatar`, {
 *       avatar: imageFile // Tự động chuyển thành FormData
 *     });
 *     return response.data;
 *   }
 * }
 * 
 * QUAN TRỌNG:
 * - Không cần thêm token thủ công - tự động
 * - Không cần xử lý 401 - tự động refresh
 * - Không cần tạo FormData thủ công - tự động detect file
 * - Không cần thêm timezone - tự động
 */

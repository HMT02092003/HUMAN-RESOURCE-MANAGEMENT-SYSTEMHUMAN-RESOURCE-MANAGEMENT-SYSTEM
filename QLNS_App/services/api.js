import axios from 'axios';
import AuthTokenManager from './AuthTokenManager';
import { Alert } from 'react-native';
import { getApiBaseUrl, logApiConfig } from './apiConfig';

// Tự động lấy API URL (auto-detect từ Expo hoặc fallback theo platform)
const API_BASE_URL = getApiBaseUrl();

// Log API configuration khi app khởi động (chỉ trong development)
if (__DEV__) {
    logApiConfig();
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
    async (config) => {
        console.log('📤 [API REQUEST]', config.method.toUpperCase(), config.url);
        
        const token = await AuthTokenManager.getAccessToken();
        if (token) {
            console.log('🔑 [API] Token found, length:', token.length);
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn('⚠️ [API] No token found for request');
        }
        
        console.log('📤 [API] Full URL:', config.baseURL + config.url);
        return config;
    },
    (error) => {
        console.error('❌ [API REQUEST ERROR]', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log('✅ [API RESPONSE]', response.config.method.toUpperCase(), response.config.url, '- Status:', response.status);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        console.error('❌ [API ERROR]', originalRequest?.method?.toUpperCase(), originalRequest?.url);
        console.error('❌ [API ERROR] Status:', error.response?.status);
        console.error('❌ [API ERROR] Message:', error.response?.data?.message || error.message);

        // Nếu lỗi 401 và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log('🔄 [API] Token expired, attempting refresh...');
            originalRequest._retry = true;

            try {
                // Thử refresh token
                console.log('🔄 [API] Calling AuthTokenManager.refreshAccessToken()...');
                const newToken = await AuthTokenManager.refreshAccessToken();

                if (newToken) {
                    console.log('✅ [API] Token refreshed successfully, retrying original request');
                    // Update header cho request cũ và gọi lại
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                } else {
                    console.error('❌ [API] refreshAccessToken returned null/undefined');
                }
            } catch (refreshError) {
                // Refresh thất bại -> Logout
                console.error('❌ [API] Session expired, refresh failed:', refreshError.message);
                await AuthTokenManager.clearTokens();
                
                // Thông báo cho người dùng
                Alert.alert(
                    'Phiên đăng nhập hết hạn',
                    'Vui lòng đăng nhập lại',
                    [{ text: 'OK' }]
                );
            }
        }

        return Promise.reject(error);
    }
);

export default api;

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
        'ngrok-skip-browser-warning': 'true', // Bỏ qua trang cảnh báo của Ngrok
    },
    timeout: 10000, // 10 seconds timeout
});

// Biến để theo dõi nếu đang sử dụng fallback
let isUsingFallback = false;

// Callback khi bị 401 mà không refresh được (dùng để redirect login)
let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
    onUnauthorizedCallback = callback;
};

// Request interceptor
api.interceptors.request.use(
    async (config) => {
        // Nếu đã xác định Ngrok lỗi, tự động đổi baseURL sang LAN cho các request sau
        if (isUsingFallback && config.baseURL.includes('ngrok-free.dev')) {
            const lanUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;
            config.baseURL = lanUrl;
            console.log('🔄 [API] Auto-fallback to LAN:', config.baseURL);
        }

        console.log('📤 [API REQUEST]', config.method.toUpperCase(), config.url);

        const token = await AuthTokenManager.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // LOGIC FALLBACK: Nếu lỗi kết nối (không có response hoặc timeout) khi đang dùng Ngrok
        if (!error.response && originalRequest.baseURL.includes('ngrok-free.dev')) {
            console.warn('⚠️ [API] Ngrok connection failed, trying fallback to LAN...');

            const lanUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;
            originalRequest.baseURL = lanUrl;
            isUsingFallback = true; // Đánh dấu để các request sau dùng luôn LAN

            // Thử lại request với URL LAN
            return api(originalRequest);
        }

        // Lỗi 401 xử lý như cũ
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const newToken = await AuthTokenManager.refreshAccessToken();
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
        } catch (refreshError) {
                // refreshAccessToken() đã xử lý clearTokens khi có lỗi 401/403
                // KHÔNG gọi clearTokens() lại để tránh xóa token nhầm khi lỗi mạng
                if (onUnauthorizedCallback) {
                    onUnauthorizedCallback();
                } else {
                    AuthTokenManager.notifyUnauthorized();
                    Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại');
                }
                return Promise.reject({ ...error, needsReauth: true });
            }
        }

        return Promise.reject(error);
    }
);

export default api;

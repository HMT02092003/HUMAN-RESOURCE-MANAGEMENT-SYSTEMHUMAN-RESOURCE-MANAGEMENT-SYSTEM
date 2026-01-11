import axios from 'axios';
import AuthTokenManager from './AuthTokenManager';
import { getApiBaseUrl } from './apiConfig';

// Notification service dùng route /notifications qua gateway
const getNotificationBaseUrl = () => {
  const apiUrl = getApiBaseUrl(); // http://192.168.1.6:4000/api
  return `${apiUrl}/notifications`;
};

// Tạo axios instance cho Notification Service
const notificationApi = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
notificationApi.interceptors.request.use(
  async (config) => {
    const baseUrl = getNotificationBaseUrl();
    config.baseURL = baseUrl;
    
    const token = await AuthTokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
notificationApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AuthTokenManager.getRefreshToken();
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${getApiBaseUrl()}/auth/refresh-token`,
            { refreshToken }
          );
          
          const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
          await AuthTokenManager.saveTokens(accessToken, newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return notificationApi(originalRequest);
        }
      } catch (refreshError) {
        await AuthTokenManager.clearTokens();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

const NotificationService = {
  // Get all notifications
  getNotifications: (params = {}) => {
    return notificationApi.get('', { params });
  },

  // Get unread count
  getUnreadCount: () => {
    return notificationApi.get('/unread-count');
  },

  // Mark notification as read
  markAsRead: (notificationId) => {
    return notificationApi.patch(`/${notificationId}/read`);
  },

  // Mark all as read
  markAllAsRead: () => {
    return notificationApi.patch('/read-all');
  },

  // Delete notification
  deleteNotification: (notificationId) => {
    return notificationApi.delete(`/${notificationId}`);
  },
};

export default NotificationService;

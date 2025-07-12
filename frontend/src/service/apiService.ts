import axios from 'axios';
import Cookies from 'js-cookie';
import { message } from 'antd';
import moment from 'moment-timezone';
import { getDecodedToken } from '../utils/decode-token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Hàm để xây dựng FormData (copy từ BaseService) ---
function buildFormData(formData: FormData, data: any, parentKey?: string) {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
    Object.keys(data).forEach(key => {
      buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
    });
  } else {
    const value = data == null ? '' : data;
    formData.append(parentKey || '', value);
  }
}

// --- Hàm tạo Axios Instance ---
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json', // Mặc định là cái này còn sau có formData thì xóa sau
    },
  });

  // --- Hàm xử lí request ---
  instance.interceptors.request.use(
    (config) => {
      // Nhét cái Authorization Token vào
      const accessToken = Cookies.get('token');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Nhét TimeZone Header (giống BaseService)
      const timezone = moment.tz.guess();
      config.headers['TimeZone'] = timezone;

      // ( Giống BaseService nếu không phải là GET hoặc DELETE) 
      const isPostPutPatch = ['post', 'put', 'patch'].includes(config.method as string);

      // Hàm kiểm tra xem trong object có chứa File không truyền config.data vào rồi kiếm tra
      const containsFile = (obj: any): boolean => {
        if (obj === null || typeof obj !== 'object') {
          return false;
        }
        if (obj instanceof File) {
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
      };

      if (isPostPutPatch && config.data && containsFile(config.data)) {
        const formData = new FormData();
        buildFormData(formData, config.data);
        config.data = formData;
        delete config.headers['Content-Type'];// Xóa Content-Type mặc định này đi để không lỗi 
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // --- Hàm xử lí Response ---
  instance.interceptors.response.use(
    (response) => response, 
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = Cookies.get('refreshToken');

          if (!refreshToken) {
            message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
            window.location.href = '/login';
            return Promise.reject(error);
          }

          const refreshResponse = await axios.post(`${API_BASE_URL}/api/refresh-token`, {
            refreshToken,
          });

          if (refreshResponse.data.token) {
            Cookies.set('token', refreshResponse.data.token);
            
            const decodedToken = getDecodedToken(refreshResponse.data.token);
            if (decodedToken) {
              if (typeof window !== 'undefined') {
                // Pass the whole decodedToken object
                window.dispatchEvent(new CustomEvent('tokenRefreshed', {
                  detail: { decodedToken: decodedToken }
                }));
              }
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
              return instance(originalRequest);
            } else {
              // Handle case where decodedToken is null or invalid after refresh
              Cookies.remove('token');
              Cookies.remove('refreshToken');
              message.error('Không thể giải mã token mới, vui lòng đăng nhập lại');
              window.location.href = '/login';
              return Promise.reject(new Error('Invalid token after refresh'));
            }
          } else {
            Cookies.remove('token');
            Cookies.remove('refreshToken');
            message.error('Không thể làm mới phiên, vui lòng đăng nhập lại');
            window.location.href = '/login';
            return Promise.reject(error);
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          Cookies.remove('token');
          Cookies.remove('refreshToken');
          message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      message.error(errorMessage);

      return Promise.reject(error); 
    }
  );

  return instance;
};

const api = createApiInstance();

export default api;
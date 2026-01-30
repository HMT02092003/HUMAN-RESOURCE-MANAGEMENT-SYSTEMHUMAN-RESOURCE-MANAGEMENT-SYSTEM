import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Lấy API Base URL từ biến môi trường
 * 
 * Cấu hình trong file .env:
 * EXPO_PUBLIC_API_GATEWAY_URL=http://192.168.1.4:4000/api
 * 
 * ⚠️ Lưu ý:
 * - Khi IP thay đổi: Sửa file .env và restart app
 * - Khi deploy production: Thay IP bằng domain trong .env
 */
/**
 * Static Ngrok Domain for public access
 */
// State to store the working URL
let activeBaseUrl = null;

/**
 * Determine the best API URL by testing connection
 * Priority: NGROK (Public) -> ENV (LAN)
 */
export const determineBestApiUrl = async () => {
  const ngrokUrl = process.env.EXPO_PUBLIC_NGROK_URL;
  const lanUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL || 'http://localhost:4100/api';

  console.log('🔄 [APIConfig] Checking API connections...');
  console.log(`📍 Public candidate: ${ngrokUrl || 'None'}`);
  console.log(`📍 LAN candidate: ${lanUrl}`);

  // 1. Try Ngrok first (Public)
  if (ngrokUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout is enough for health check

      // Check health endpoint
      const healthUrl = `${ngrokUrl.replace(/\/api$/, '')}/health`;

      console.log(`Checking Ngrok: ${healthUrl}`);
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ [APIConfig] Connected to Public NGROK');
        activeBaseUrl = ngrokUrl;
        return activeBaseUrl;
      }
    } catch (e) {
      console.warn('⚠️ [APIConfig] Ngrok unreachable:', e.message);
    }
  }

  // 2. Fallback to LAN
  console.log(`🏠 [APIConfig] Fallback to LAN URL: ${lanUrl}`);
  activeBaseUrl = lanUrl;
  return activeBaseUrl;
};

/**
 * Set the current active API Base URL
 */
export const setApiBaseUrl = (url) => {
  console.log(`🔄 [APIConfig] Updating active Base URL to: ${url}`);
  activeBaseUrl = url;
};

/**
 * Get the current active API Base URL
 * Prefers determined URL, falls back to Ngrok then LAN
 */
export const getApiBaseUrl = () => {
  if (activeBaseUrl) return activeBaseUrl;

  // Default initial return while checking
  return process.env.EXPO_PUBLIC_NGROK_URL || process.env.EXPO_PUBLIC_API_GATEWAY_URL || 'http://localhost:4100/api';
};

/**
 * Kiểm tra kết nối đến API
 */
export const testApiConnection = async () => {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl.replace('/api', '')}/health`, {
      method: 'GET',
      timeout: 5000,
    });

    if (response.ok) {
      console.log('✅ API connection successful');
      return true;
    } else {
      console.warn('⚠️ API returned non-OK status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.log('📍 Attempted URL:', baseUrl);
    console.log('💡 Tips:');
    console.log('  - Kiểm tra API server đã chạy chưa');
    console.log('  - Kiểm tra máy tính và điện thoại cùng mạng WiFi');
    console.log('  - Thử tạo file .env với EXPO_PUBLIC_API_GATEWAY_URL');
    return false;
  }
};

/**
 * Log thông tin API configuration
 */
export const logApiConfig = () => {
  const apiUrl = getApiBaseUrl();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          📡 API CONFIGURATION                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n🔗 API Base URL: ${apiUrl}`);
  console.log(`📱 Platform: ${Platform.OS}`);
  console.log(`🏗️  Environment: ${__DEV__ ? 'Development' : 'Production'}`);

  if (Constants.expoConfig?.hostUri) {
    console.log(`🌐 Expo Host: ${Constants.expoConfig.hostUri}`);
  }

  console.log('\n' + '─'.repeat(56) + '\n');
};

export default {
  getApiBaseUrl,
  setApiBaseUrl,
  testApiConnection,
  logApiConfig,
};

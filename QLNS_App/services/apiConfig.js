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
export const getApiBaseUrl = () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  🔍 Getting API Base URL from .env                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  const apiUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;
  
  if (!apiUrl) {
    console.error('❌ ERROR: EXPO_PUBLIC_API_GATEWAY_URL not found in .env!');
    console.error('💡 Please check your .env file in QLNS_App folder');
    throw new Error('Missing EXPO_PUBLIC_API_GATEWAY_URL in .env file');
  }
  
  console.log('✅ API URL from .env:', apiUrl);
  console.log('📱 Platform:', Platform.OS);
  
  return apiUrl;
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
  testApiConnection,
  logApiConfig,
};

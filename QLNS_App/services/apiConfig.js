import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Lấy API Base URL động dựa trên môi trường
 * 
 * Thứ tự ưu tiên:
 * 1. Biến môi trường EXPO_PUBLIC_API_GATEWAY_URL
 * 2. Manifest hostUri (tự động detect từ Expo)
 * 3. Fallback theo platform
 */
export const getApiBaseUrl = () => {
  // 1. Kiểm tra biến môi trường trước
  if (process.env.EXPO_PUBLIC_API_GATEWAY_URL) {
    return process.env.EXPO_PUBLIC_API_GATEWAY_URL;
  }

  // 2. Tự động detect từ Expo manifest (khi chạy trong development)
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    
    if (hostUri) {
      // hostUri có dạng: "192.168.1.12:8081"
      // Lấy IP và thay port thành 4000
      const host = hostUri.split(':')[0];
      
      // KHÔNG dùng localhost - luôn dùng IP
      if (host !== 'localhost' && host !== '127.0.0.1') {
        const apiUrl = `http://${host}:4000/api`;
        console.log('🌐 Auto-detected API URL from Expo:', apiUrl);
        return apiUrl;
      }
    }
  } catch (error) {
    console.warn('Could not auto-detect IP from Expo manifest:', error);
  }

  // 3. Fallback: CHỈ dùng IP cụ thể, KHÔNG dùng localhost
  console.warn('⚠️ Không tìm thấy IP tự động!');
  console.warn('💡 Vui lòng chạy: yarn setup-env để tạo file .env với IP đúng');
  
  if (Platform.OS === 'android') {
    // Android Emulator
    console.log('🤖 Using Android Emulator IP');
    return 'http://10.0.2.2:4000/api';
  }
  
  // KHÔNG trả về localhost - buộc phải có IP
  console.error('❌ KHÔNG THỂ XÁC ĐỊNH IP - Vui lòng chạy: yarn setup-env');
  return 'http://192.168.1.6:4000/api'; // IP mặc định từ setup-env
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

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
export const NGROK_URL = 'https://virgilio-wolfish-nonracially.ngrok-free.dev/api';

/**
 * Lấy API Base URL từ biến môi trường hoặc fallback sang Ngrok
 */
export const getApiBaseUrl = () => {
  const lanUrl = process.env.EXPO_PUBLIC_API_GATEWAY_URL;

  // Mặc định ưu tiên sử dụng Ngrok nếu đang build để test bên ngoài
  // Bạn có thể đổi thứ tự này nếu muốn mặc định chạy LAN khi ở nhà
  const primaryUrl = NGROK_URL;
  const secondaryUrl = lanUrl || 'http://192.168.1.8:4100/api';

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  📡 API Endpoint Configuration                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('🔗 Primary (Ngrok):', primaryUrl);
  console.log('🏠 Secondary (LAN):', secondaryUrl);

  // Ở bước này ta chỉ trả về Primary, việc fallback sẽ được xử lý ở tầng Service nếu cần
  // Hoặc ta có thể trả về một logic thông minh hơn.
  // Tuy nhiên theo yêu cầu của bạn, tôi sẽ trả về Ngrok làm mặc định.
  return primaryUrl;
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

const axios = require('axios');

// Test API Gateway connection và authentication
async function testAPI() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          🧪 TEST API CONNECTION & AUTH                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const API_BASE_URL = 'http://192.168.1.6:4000/api';
  
  // Test 1: Health check
  console.log('📍 Test 1: Health Check');
  console.log('   URL:', `${API_BASE_URL.replace('/api', '')}/health`);
  try {
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, {
      timeout: 5000
    });
    console.log('   ✅ Status:', healthResponse.status);
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    console.log('\n⚠️  API Gateway chưa chạy hoặc không thể kết nối!');
    console.log('💡 Giải pháp:');
    console.log('   cd ../services/api-gateway');
    console.log('   yarn dev\n');
    return;
  }

  // Test 2: Login
  console.log('\n📍 Test 2: Login API');
  console.log('   URL:', `${API_BASE_URL}/auth/login`);
  
  // Thử nhiều tài khoản
  const testAccounts = [
    { username: 'admin', password: '123456@' },  // Password có @ từ log
    { username: 'toanhm', password: '123456' },
    { username: 'admin', password: 'admin123' },
    { username: 'admin', password: '123456' },
  ];
  
  let token = null;
  let refreshToken = null;
  let loginSuccess = false;
  
  for (const account of testAccounts) {
    console.log(`\n   Thử đăng nhập: ${account.username}`);
    
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, account);
      
      console.log('   ✅ Login successful với:', account.username);
      console.log('   Token length:', loginResponse.data.token?.length || 0);
      console.log('   Refresh token:', loginResponse.data.refreshToken ? '✅' : '❌');
      console.log('   User:', loginResponse.data.user?.username);
      
      token = loginResponse.data.token;
      refreshToken = loginResponse.data.refreshToken;
      loginSuccess = true;
      break;
      
    } catch (error) {
      console.error('   ❌ Login failed với:', account.username);
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data?.message || error.message);
    }
  }
  
  if (!loginSuccess) {
    console.log('\n⚠️  Không thể đăng nhập với bất kỳ tài khoản nào!');
    console.log('💡 Vui lòng kiểm tra username/password đúng trong database');
    return;
  }

  // Test 3: Get Users (với authentication)
  console.log('\n📍 Test 3: Get Users (Protected Route)');
  console.log('   URL:', `${API_BASE_URL}/auth/users`);
  console.log('   Token:', token.substring(0, 30) + '...');
  
  try {
    const usersResponse = await axios.get(`${API_BASE_URL}/auth/users`, {
      params: { page: 1, pageSize: 10 },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ Request successful');
    console.log('   Total users:', usersResponse.data.total);
    console.log('   Returned:', usersResponse.data.results?.length, 'users');
    
  } catch (error) {
    console.error('   ❌ Request failed');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n⚠️  Token không hợp lệ!');
      console.log('💡 Có thể:');
      console.log('   - Token format sai');
      console.log('   - Auth Service chưa chạy');
      console.log('   - JWT secret không khớp');
    }
  }

  // Test 4: Refresh Token
  if (refreshToken) {
    console.log('\n📍 Test 4: Refresh Token');
    console.log('   URL:', `${API_BASE_URL}/auth/refresh-token`);
    
    try {
      const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken: refreshToken
      });
      
      console.log('   ✅ Refresh successful');
      console.log('   New token received:', refreshResponse.data.accessToken ? '✅' : '❌');
      
    } catch (error) {
      console.error('   ❌ Refresh failed');
      console.error('   Error:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                 ✅ TEST COMPLETED                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run tests
testAPI().catch(error => {
  console.error('\n❌ Test error:', error.message);
  process.exit(1);
});

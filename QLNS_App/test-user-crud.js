/**
 * Test Script for User CRUD Operations
 * 
 * This script tests all CRUD operations for the User Management feature
 * Run this with: node test-user-crud.js
 * 
 * Make sure your API Gateway is running on the configured port
 */

const axios = require('axios');

// Configuration - Update these based on your .env
const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';
const TEST_USER_EMAIL = 'admin@example.com';
const TEST_USER_PASSWORD = 'admin123';

// Test user data
const TEST_NEW_USER = {
  username: `testuser_${Date.now()}`,
  password: 'Test123456',
  fullName: 'Nguyễn Văn Test',
  email: `test${Date.now()}@example.com`,
  birthday: '1995-05-15',
  gender: 1, // Male
  phone: '0987654321',
  status: 1, // Active
  roleId: null, // Will be set after getting roles
  startDate: new Date().toISOString().split('T')[0],
  chevronId: null, // Will be set after getting chevrons
  departmentId: null, // Will be set after getting departments
};

let authToken = '';
let createdUserId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.blue}🧪 ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`),
};

// Axios instance
const api = axios.create({
  baseURL: API_GATEWAY_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      log.error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      log.error('No response received from server');
    } else {
      log.error(`Request setup error: ${error.message}`);
    }
    throw error;
  }
);

// Test functions
async function testLogin() {
  log.divider();
  log.test('TEST 1: User Login (Authentication)');
  try {
    const response = await api.post('/auth/login', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (response.data && response.data.accessToken) {
      authToken = response.data.accessToken;
      log.success(`Login successful! Token: ${authToken.substring(0, 20)}...`);
      log.info(`User: ${response.data.user.username} (${response.data.user.email})`);
      return true;
    } else {
      log.error('Login failed: No token received');
      return false;
    }
  } catch (error) {
    log.error('Login test failed');
    return false;
  }
}

async function testGetDropdownData() {
  log.divider();
  log.test('TEST 2: Get Dropdown Data (Roles, Departments, Chevrons)');
  try {
    const [rolesRes, deptsRes, chevsRes] = await Promise.all([
      api.get('/auth/roles'),
      api.get('/employee/departments'),
      api.get('/employee/chevrons'),
    ]);

    const roles = rolesRes.data;
    const departments = deptsRes.data;
    const chevrons = chevsRes.data;

    log.success(`Fetched ${roles.length} roles`);
    log.success(`Fetched ${departments.length} departments`);
    log.success(`Fetched ${chevrons.length} chevrons`);

    if (roles.length > 0 && departments.length > 0 && chevrons.length > 0) {
      // Set test data
      TEST_NEW_USER.roleId = roles[0].id;
      TEST_NEW_USER.departmentId = departments[0].id;
      TEST_NEW_USER.chevronId = chevrons[0].id;

      log.info(`Using Role: ${roles[0].name} (ID: ${roles[0].id})`);
      log.info(`Using Department: ${departments[0].name} (ID: ${departments[0].id})`);
      log.info(`Using Chevron: ${chevrons[0].name} (ID: ${chevrons[0].id})`);
      return true;
    } else {
      log.warn('Missing required dropdown data');
      return false;
    }
  } catch (error) {
    log.error('Failed to fetch dropdown data');
    return false;
  }
}

async function testGetAllUsers() {
  log.divider();
  log.test('TEST 3: Get All Users (Paginated)');
  try {
    const response = await api.get('/auth/users', {
      params: { page: 1, pageSize: 10 },
    });

    if (response.data && response.data.results) {
      log.success(`Fetched ${response.data.results.length} users (Total: ${response.data.total})`);
      log.info(`First user: ${response.data.results[0]?.username}`);
      return true;
    } else {
      log.error('Unexpected response structure');
      return false;
    }
  } catch (error) {
    log.error('Failed to fetch users');
    return false;
  }
}

async function testCreateUser() {
  log.divider();
  log.test('TEST 4: Create New User');
  try {
    log.info(`Creating user: ${TEST_NEW_USER.username}`);
    log.info(`Data: ${JSON.stringify(TEST_NEW_USER, null, 2)}`);

    const response = await api.post('/auth/users', TEST_NEW_USER);

    if (response.data && response.data.id) {
      createdUserId = response.data.id;
      log.success(`User created successfully! ID: ${createdUserId}`);
      log.info(`Username: ${response.data.username}`);
      log.info(`Email: ${response.data.email}`);
      return true;
    } else {
      log.error('User creation failed: No ID returned');
      return false;
    }
  } catch (error) {
    log.error('User creation test failed');
    return false;
  }
}

async function testGetUserDetail() {
  log.divider();
  log.test('TEST 5: Get User Detail');
  if (!createdUserId) {
    log.warn('Skipping: No user ID available');
    return false;
  }

  try {
    // Test with NUMBER type (correct)
    log.info(`Fetching user detail with ID: ${createdUserId} (Type: ${typeof createdUserId})`);
    const response = await api.get(`/auth/users/detail/${createdUserId}`);

    if (response.data) {
      log.success('User detail fetched successfully!');
      log.info(`Username: ${response.data.username}`);
      log.info(`Full Name: ${response.data.fullName}`);
      log.info(`Email: ${response.data.email}`);
      log.info(`Phone: ${response.data.phone}`);
      log.info(`Role: ${response.data.role?.name}`);
      log.info(`Department: ${response.data.department?.name}`);
      log.info(`Chevron: ${response.data.chevron?.name}`);
      log.info(`Status: ${response.data.status}`);
      return true;
    } else {
      log.error('No data returned');
      return false;
    }
  } catch (error) {
    log.error('Failed to fetch user detail');
    return false;
  }
}

async function testUpdateUser() {
  log.divider();
  log.test('TEST 6: Update User');
  if (!createdUserId) {
    log.warn('Skipping: No user ID available');
    return false;
  }

  try {
    const updateData = {
      id: createdUserId, // Include ID in payload
      fullName: 'Nguyễn Văn Test (Updated)',
      email: TEST_NEW_USER.email,
      phone: '0987654322', // Changed phone
      status: 1,
      roleId: TEST_NEW_USER.roleId,
      departmentId: TEST_NEW_USER.departmentId,
      chevronId: TEST_NEW_USER.chevronId,
      startDate: TEST_NEW_USER.startDate,
    };

    log.info(`Updating user ID: ${createdUserId} (Type: ${typeof createdUserId})`);
    log.info(`Update data: ${JSON.stringify(updateData, null, 2)}`);

    const response = await api.put(`/auth/users/${createdUserId}`, updateData);

    log.success('User updated successfully!');
    log.info(`Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log.error('User update test failed');
    return false;
  }
}

async function testVerifyUpdate() {
  log.divider();
  log.test('TEST 7: Verify Update');
  if (!createdUserId) {
    log.warn('Skipping: No user ID available');
    return false;
  }

  try {
    const response = await api.get(`/auth/users/detail/${createdUserId}`);

    if (response.data.fullName === 'Nguyễn Văn Test (Updated)' &&
        response.data.phone === '0987654322') {
      log.success('Update verified! Data is correct.');
      log.info(`Full Name: ${response.data.fullName}`);
      log.info(`Phone: ${response.data.phone}`);
      return true;
    } else {
      log.error('Update verification failed: Data mismatch');
      log.info(`Expected full name: Nguyễn Văn Test (Updated), Got: ${response.data.fullName}`);
      log.info(`Expected phone: 0987654322, Got: ${response.data.phone}`);
      return false;
    }
  } catch (error) {
    log.error('Update verification failed');
    return false;
  }
}

async function testDeleteUser() {
  log.divider();
  log.test('TEST 8: Delete User');
  if (!createdUserId) {
    log.warn('Skipping: No user ID available');
    return false;
  }

  try {
    log.info(`Deleting user ID: ${createdUserId} (Type: ${typeof createdUserId})`);
    
    const response = await api.delete(`/auth/users/${createdUserId}`, {
      data: { id: createdUserId },
    });

    log.success('User deleted successfully!');
    log.info(`Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log.error('User deletion test failed');
    return false;
  }
}

async function testVerifyDeletion() {
  log.divider();
  log.test('TEST 9: Verify Deletion');
  if (!createdUserId) {
    log.warn('Skipping: No user ID available');
    return false;
  }

  try {
    await api.get(`/auth/users/detail/${createdUserId}`);
    log.error('Deletion verification failed: User still exists');
    return false;
  } catch (error) {
    if (error.response && (error.response.status === 404 || error.response.status === 400)) {
      log.success('Deletion verified! User no longer exists.');
      return true;
    } else {
      log.error('Unexpected error during deletion verification');
      return false;
    }
  }
}

async function testDataTypeValidation() {
  log.divider();
  log.test('TEST 10: Data Type Validation (String vs Number)');
  
  try {
    // Get a real user ID
    const usersResponse = await api.get('/auth/users', { params: { page: 1, pageSize: 1 } });
    if (!usersResponse.data.results || usersResponse.data.results.length === 0) {
      log.warn('No users available for testing');
      return false;
    }

    const testUserId = usersResponse.data.results[0].id;
    
    // Test with NUMBER (should work)
    log.info('Testing with NUMBER type...');
    try {
      await api.get(`/auth/users/detail/${testUserId}`);
      log.success(`✓ NUMBER type works (ID: ${testUserId}, Type: ${typeof testUserId})`);
    } catch (error) {
      log.error(`✗ NUMBER type failed`);
    }

    // Test with STRING (should fail with error 9996)
    log.info('Testing with STRING type...');
    try {
      await api.get(`/auth/users/detail/${String(testUserId)}`);
      log.warn('STRING type accepted (might be auto-converted by API)');
    } catch (error) {
      if (error.response && error.response.data.code === 9996) {
        log.success('✓ STRING type correctly rejected with error 9996');
      } else {
        log.error('STRING type failed with unexpected error');
      }
    }

    return true;
  } catch (error) {
    log.error('Data type validation test failed');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  log.divider();
  log.info(`${colors.bright}USER CRUD TEST SUITE${colors.reset}`);
  log.info(`API Gateway: ${API_GATEWAY_URL}`);
  log.info(`Test Time: ${new Date().toISOString()}`);
  log.divider();

  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Get Dropdown Data', fn: testGetDropdownData },
    { name: 'Get All Users', fn: testGetAllUsers },
    { name: 'Create User', fn: testCreateUser },
    { name: 'Get User Detail', fn: testGetUserDetail },
    { name: 'Update User', fn: testUpdateUser },
    { name: 'Verify Update', fn: testVerifyUpdate },
    { name: 'Delete User', fn: testDeleteUser },
    { name: 'Verify Deletion', fn: testVerifyDeletion },
    { name: 'Data Type Validation', fn: testDataTypeValidation },
  ];

  for (const test of tests) {
    results.total++;
    const success = await test.fn();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  log.divider();
  log.info(`${colors.bright}TEST SUMMARY${colors.reset}`);
  log.divider();
  log.info(`Total Tests: ${results.total}`);
  log.success(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    log.error(`Failed: ${results.failed}`);
  } else {
    log.success(`Failed: ${results.failed}`);
  }
  log.info(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  log.divider();

  if (results.failed === 0) {
    log.success('🎉 ALL TESTS PASSED! 🎉');
  } else {
    log.warn('Some tests failed. Please review the logs above.');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

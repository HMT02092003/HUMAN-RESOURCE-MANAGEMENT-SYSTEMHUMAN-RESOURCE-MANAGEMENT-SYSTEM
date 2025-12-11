/**
 * Test script to verify filter/sort/search functionality for monthly attendances
 * Compares API results with direct DB queries
 */

const axios = require('axios');
const knex = require('knex');

const API_BASE = 'http://localhost:4003';
const AUTH_API = 'http://localhost:4001';

// Update with your test user credentials (check your database)
const TEST_USER = {
  username: 'user_1',  // First seeded user
  password: 'password123'
};

const knexConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'qlns_attendance'
  }
};

const db = knex(knexConfig);

let authToken = null;

async function login() {
  try {
    const response = await axios.post(`${AUTH_API}/api/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✓ Login successful');
    return authToken;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function callAPI(params) {
  try {
    const response = await axios.get(`${API_BASE}/api/attendance/monthly-summaries-by-scope`, {
      params: { permissionKey: 'users', ...params },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('✗ API call failed:', error.response?.data || error.message);
    throw error;
  }
}

async function queryDB(filters = {}, sort = {}, limit = 20, offset = 0) {
  let query = db('monthly_attendances').select('*');

  // Apply filters
  if (filters.month) {
    query = query.where('month', 'ilike', `%${filters.month}%`);
  }
  if (filters.isApproved !== undefined) {
    query = query.where('isApproved', filters.isApproved);
  }
  if (filters.totalScheduledDays) {
    query = query.where('totalScheduledDays', filters.totalScheduledDays);
  }

  // Apply sort
  if (sort.field && ['month', 'totalScheduledDays', 'presentDays', 'isApproved', 'created_at'].includes(sort.field)) {
    query = query.orderBy(sort.field, sort.order || 'desc');
  } else {
    query = query.orderBy('month', 'desc');
  }

  const countQuery = query.clone();
  const total = await countQuery.count('* as count').first();

  const results = await query.limit(limit).offset(offset);

  return {
    results,
    total: parseInt(total.count),
    limit,
    offset
  };
}

async function test1_NoFilters() {
  console.log('\n=== TEST 1: No filters (default) ===');
  
  const apiResult = await callAPI({ page: 1, pageSize: 20 });
  const dbResult = await queryDB({}, {}, 20, 0);

  console.log('API returned:', apiResult.results?.length || 0, 'records, total:', apiResult.total);
  console.log('DB has:', dbResult.results.length, 'records, total:', dbResult.total);

  if (apiResult.total === dbResult.total) {
    console.log('✓ Total counts match');
  } else {
    console.log('✗ Total counts DO NOT match');
  }
}

async function test2_FilterByMonth() {
  console.log('\n=== TEST 2: Filter by month ===');
  
  const monthFilter = '2024-10';
  const apiResult = await callAPI({ page: 1, pageSize: 20, month: monthFilter });
  const dbResult = await queryDB({ month: monthFilter }, {}, 20, 0);

  console.log(`Filter: month=${monthFilter}`);
  console.log('API returned:', apiResult.results?.length || 0, 'records, total:', apiResult.total);
  console.log('DB returned:', dbResult.results.length, 'records, total:', dbResult.total);

  if (Math.abs(apiResult.total - dbResult.total) <= 1) {
    console.log('✓ Counts match (within tolerance)');
  } else {
    console.log('✗ Counts DO NOT match');
  }
}

async function test3_FilterByApproved() {
  console.log('\n=== TEST 3: Filter by isApproved ===');
  
  const apiResult = await callAPI({ page: 1, pageSize: 20, isApproved: 'false' });
  const dbResult = await queryDB({ isApproved: false }, {}, 20, 0);

  console.log('Filter: isApproved=false');
  console.log('API returned:', apiResult.results?.length || 0, 'records, total:', apiResult.total);
  console.log('DB returned:', dbResult.results.length, 'records, total:', dbResult.total);

  if (Math.abs(apiResult.total - dbResult.total) <= 1) {
    console.log('✓ Counts match');
  } else {
    console.log('✗ Counts DO NOT match');
  }
}

async function test4_SortByMonth() {
  console.log('\n=== TEST 4: Sort by month ascending ===');
  
  const apiResult = await callAPI({ page: 1, pageSize: 5, sort: 'month', order: 'asc' });
  const dbResult = await queryDB({}, { field: 'month', order: 'asc' }, 5, 0);

  console.log('Sort: month ASC');
  console.log('API first 5 months:', apiResult.results?.slice(0, 5).map(r => r.month));
  console.log('DB first 5 months:', dbResult.results.slice(0, 5).map(r => r.month));

  const apiMonths = apiResult.results?.slice(0, 5).map(r => r.month) || [];
  const dbMonths = dbResult.results.slice(0, 5).map(r => r.month);

  if (JSON.stringify(apiMonths) === JSON.stringify(dbMonths)) {
    console.log('✓ Sort order matches');
  } else {
    console.log('✗ Sort order DOES NOT match');
  }
}

async function test5_FilterByUserFullName() {
  console.log('\n=== TEST 5: Filter by fullName (enriched field) ===');
  
  const nameFilter = 'Nguyễn';
  const apiResult = await callAPI({ page: 1, pageSize: 20, fullName: nameFilter });

  console.log(`Filter: fullName=${nameFilter}`);
  console.log('API returned:', apiResult.results?.length || 0, 'records, total:', apiResult.total);
  
  // Check if results have user.fullName
  if (apiResult.results && apiResult.results.length > 0) {
    const sampleUser = apiResult.results[0];
    console.log('Sample record has user.fullName:', sampleUser.fullName || sampleUser.user?.fullName);
    
    const allMatch = apiResult.results.every(r => {
      const fullName = r.fullName || r.user?.fullName || '';
      return fullName.toLowerCase().includes(nameFilter.toLowerCase());
    });
    
    if (allMatch) {
      console.log('✓ All results match filter');
    } else {
      console.log('✗ Some results DO NOT match filter');
    }
  } else {
    console.log('⚠ No results returned');
  }
}

async function test6_SortByEnrichedField() {
  console.log('\n=== TEST 6: Sort by fullName (enriched field) ===');
  
  const apiResult = await callAPI({ page: 1, pageSize: 10, sort: 'fullName', order: 'asc' });

  console.log('Sort: fullName ASC');
  if (apiResult.results && apiResult.results.length > 0) {
    const names = apiResult.results.map(r => r.fullName || r.user?.fullName || '');
    console.log('Names returned:', names);
    
    const sortedNames = [...names].sort();
    if (JSON.stringify(names) === JSON.stringify(sortedNames)) {
      console.log('✓ Names are sorted correctly');
    } else {
      console.log('✗ Names are NOT sorted correctly');
      console.log('Expected order:', sortedNames);
    }
  } else {
    console.log('⚠ No results returned');
  }
}

async function test7_Pagination() {
  console.log('\n=== TEST 7: Pagination ===');
  
  const page1 = await callAPI({ page: 1, pageSize: 5 });
  const page2 = await callAPI({ page: 2, pageSize: 5 });

  console.log('Page 1 IDs:', page1.results?.map(r => r.id));
  console.log('Page 2 IDs:', page2.results?.map(r => r.id));

  const page1Ids = page1.results?.map(r => r.id) || [];
  const page2Ids = page2.results?.map(r => r.id) || [];

  const hasOverlap = page1Ids.some(id => page2Ids.includes(id));

  if (!hasOverlap && page1Ids.length > 0 && page2Ids.length > 0) {
    console.log('✓ No overlap between pages');
  } else if (page1Ids.length === 0 || page2Ids.length === 0) {
    console.log('⚠ One or both pages are empty');
  } else {
    console.log('✗ Pages have overlapping records');
  }
}

async function runAllTests() {
  try {
    console.log('Starting attendance monthly summaries API tests...\n');
    
    await login();
    
    await test1_NoFilters();
    await test2_FilterByMonth();
    await test3_FilterByApproved();
    await test4_SortByMonth();
    await test5_FilterByUserFullName();
    await test6_SortByEnrichedField();
    await test7_Pagination();

    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

runAllTests();

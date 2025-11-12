/**
 * Test script for Job Service APIs
 * Tests find-candidates and create-with-analysis endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4008/api';

// Valid test token (generated with JWT_SECRET)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoidGVzdC11c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlSWQiOjEsImlhdCI6MTc2Mjk3MzY5MywiZXhwIjoxNzYzMDYwMDkzfQ.3hOCwl00pZvXzHbcn4QG8x5b31wNJwKs2I2psofC6DI';

// Test data
const testData = {
  project_id: 1, // Changed from string to integer
  job_title: 'Xây dựng màn quản lí người dùng',
  job_estimated_hours: 8,
  check_workload: true,
  max_results: 10,
  min_match_score: 40,
  required_skills: [
    {
      skill_id: 288,
      proficiency_level: 'C',
      importance: 'required'
    }
  ]
};

async function testFindCandidates() {
  console.log('\n========================================');
  console.log('TEST 1: Find Candidates API');
  console.log('========================================\n');
  
  console.log('Request payload:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/projects/find-candidates`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      }
    );
    
    console.log('\n✅ Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      console.log(`\n📊 Found ${response.data.candidates.length} candidates:`);
      response.data.candidates.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.fullName} (ID: ${c.user_id})`);
        console.log(`     Match Score: ${c.match_score}%`);
        console.log(`     Workload: ${c.current_workload_hours}h`);
        console.log(`     Can Take More: ${c.can_take_more_work ? 'Yes' : 'No'}`);
        console.log(`     Risk Level: ${c.risk_level}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function testFindCandidatesWithDifferentSkills() {
  console.log('\n========================================');
  console.log('TEST 2: Find Candidates with Proficiency Level D');
  console.log('========================================\n');
  
  const testDataD = {
    ...testData,
    required_skills: [
      {
        skill_id: 288,
        proficiency_level: 'D',
        importance: 'required'
      }
    ]
  };
  
  console.log('Request payload (changed proficiency to D):');
  console.log(JSON.stringify(testDataD, null, 2));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/projects/find-candidates`,
      testDataD,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      }
    );
    
    console.log('\n✅ Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.candidates && response.data.candidates.length > 0) {
      console.log(`\n📊 Found ${response.data.candidates.length} candidates with proficiency D:`);
      response.data.candidates.slice(0, 3).forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.fullName} (ID: ${c.user_id}) - ${c.match_score}%`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

async function testCreateJob() {
  console.log('\n========================================');
  console.log('TEST 3: Create Job with Analysis');
  console.log('========================================\n');
  
  const createJobData = {
    title: 'Test Task từ API',
    description: 'Đây là task test để kiểm tra API',
    project_id: 1, // Changed from string to integer
    status: 'todo',
    priority: 'high',
    assigned_to_user_id: 2,
    estimated_hours: 8,
    due_date: '2025-11-15',
    tags: ['frontend', 'urgent'],
    required_skills: [
      {
        skill_id: 288,
        proficiency_level: 'C',
        importance: 'required'
      }
    ]
  };
  
  console.log('Request payload:');
  console.log(JSON.stringify(createJobData, null, 2));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/projects/create-task-with-analysis`,
      createJobData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      }
    );
    
    console.log('\n✅ Success! Job created:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error creating job:', error.response?.data || error.message);
    
    // Check if it's validation error
    if (error.response?.data?.error) {
      console.error('   Error details:', error.response.data.details);
    }
    
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Job Service API Tests...\n');
  
  try {
    // Test 1: Find candidates with proficiency C
    await testFindCandidates();
    
    // Test 2: Find candidates with proficiency D (to verify caching issue)
    await testFindCandidatesWithDifferentSkills();
    
    // Test 3: Create job
    await testCreateJob();
    
    console.log('\n\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n\n❌ Tests failed!\n');
    process.exit(1);
  }
}

runAllTests();

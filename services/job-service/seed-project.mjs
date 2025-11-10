/**
 * Script to seed test project data
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4008/api';

// Valid test token (generated with JWT_SECRET)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoidGVzdC11c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlSWQiOjEsImlhdCI6MTc2Mjc1ODM5MywiZXhwIjoxNzYyODQ0NzkzfQ.6WhNzE624pd-fXBzRLZhH19AuMm-wU1jO5L4UAy8lqc';

async function createTestProject() {
  console.log('Creating test project...\n');
  
  const projectData = {
    name: 'Test Project for API Testing',
    description: 'This is a test project to verify the new ID schema',
    status: 'active',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    managerId: 1,
    budget: 100000,
    customer: 'Test Customer',
    members: [
      { id: 2, role: 'Developer' },
      { id: 53, role: 'Developer' }
    ]
  };
  
  try {
    const response = await axios.post(
      `${BASE_URL}/projects`,
      projectData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      }
    );
    
    console.log('✅ Project created successfully!');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data?.data?.project_id) {
      console.log(`\n📝 Project ID: ${response.data.data.project_id}`);
      console.log(`   (This is an auto-increment integer, not a PRJ string)`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error creating project:', error.response?.data || error.message);
    throw error;
  }
}

createTestProject();

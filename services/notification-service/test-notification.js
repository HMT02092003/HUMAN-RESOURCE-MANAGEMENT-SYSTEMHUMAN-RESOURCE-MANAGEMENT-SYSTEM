#!/usr/bin/env node

/**
 * Test script for Notification Service
 * Usage: node test-notification.js
 */

import axios from 'axios';

const INTERNAL_API = 'http://localhost:4009/internal';
const PUBLIC_API = 'http://localhost:4000/api/notifications';

console.log('🧪 Testing Notification Service...\n');

// Test 1: Health Check
async function testHealth() {
  try {
    const res = await axios.get('http://localhost:4009/health');
    console.log('✅ Health Check:', res.data);
  } catch (error) {
    console.error('❌ Health Check failed:', error.message);
  }
}

// Test 2: Send Notification (Internal API)
async function testSendNotification() {
  try {
    const res = await axios.post(`${INTERNAL_API}/send`, {
      userIds: [1, 2],
      title: 'Test Notification',
      content: 'This is a test notification from test script',
      type: 'TEST',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ Send Notification:', res.data);
  } catch (error) {
    console.error('❌ Send Notification failed:', error.message);
  }
}

// Test 3: Get Unread Count (Internal)
async function testUnreadCount() {
  try {
    const res = await axios.get(`${INTERNAL_API}/unread-count/1`);
    console.log('✅ Unread Count:', res.data);
  } catch (error) {
    console.error('❌ Unread Count failed:', error.message);
  }
}

// Run all tests
(async () => {
  await testHealth();
  console.log();
  
  await testSendNotification();
  console.log();
  
  await testUnreadCount();
  console.log();
  
  console.log('🎉 Tests completed!');
})();

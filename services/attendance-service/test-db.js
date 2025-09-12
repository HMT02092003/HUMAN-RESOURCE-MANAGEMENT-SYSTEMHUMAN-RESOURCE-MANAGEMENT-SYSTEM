#!/usr/bin/env node

// Test database connection for attendance service
import dotenv from 'dotenv';
dotenv.config();

import knex from 'knex';

const main = async () => {
  console.log('🔍 Testing Attendance Service Database Connection...');
  console.log('Environment variables:');
  console.log('- DB_HOST:', process.env.DB_HOST);
  console.log('- DB_PORT:', process.env.DB_PORT);
  console.log('- DB_USER:', process.env.DB_USER);
  console.log('- DB_DATABASE:', process.env.DB_DATABASE);
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  
  const knexInstance = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_DATABASE || 'attendance_service',
    },
    pool: { min: 0, max: 10 },
  });

  try {
    // Test connection
    console.log('\n🔗 Testing connection...');
    await knexInstance.raw('SELECT NOW()');
    console.log('✅ Database connection successful!');

    // Check if time_attendances table exists
    console.log('\n📋 Checking tables...');
    const tables = await knexInstance.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = tables.rows.map(row => row.table_name);
    console.log('Available tables:', tableNames);
    
    if (tableNames.includes('time_attendances')) {
      console.log('✅ time_attendances table exists!');
      
      // Check table structure
      const structure = await knexInstance.raw(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'time_attendances'
      `);
      
      console.log('\n📝 Table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
    } else {
      console.log('❌ time_attendances table does not exist!');
    }

    // Test query
    console.log('\n🧪 Testing query...');
    const result = await knexInstance('time_attendances').select('*').limit(1);
    console.log('✅ Query successful! Records:', result.length);

  } catch (error) {
    console.error('❌ Database error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solution: Make sure PostgreSQL is running');
    } else if (error.code === '3D000') {
      console.log('💡 Solution: Database does not exist, create it first');
    } else if (error.code === '42P01') {
      console.log('💡 Solution: Table does not exist, run migrations');
    }
  } finally {
    await knexInstance.destroy();
    console.log('\n🔚 Connection closed');
  }
};

main().catch(console.error);

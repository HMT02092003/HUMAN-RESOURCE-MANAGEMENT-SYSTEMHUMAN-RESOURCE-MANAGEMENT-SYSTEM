/**
 * Verify database structure after fullName migration
 */

import knex from 'knex';
import knexConfig from './knexfile.js';

const db = knex(knexConfig.development);

async function verifyData() {
  try {
    console.log('\n=== Verifying Database Structure ===\n');

    // Check if fullName column exists and firstName/lastName are removed
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY column_name;
    `);
    
    console.log('📋 User table columns:');
    columns.rows.forEach(row => console.log(`   - ${row.column_name}`));
    
    const hasFullName = columns.rows.some(r => r.column_name === 'fullName');
    const hasFirstName = columns.rows.some(r => r.column_name === 'firstName');
    const hasLastName = columns.rows.some(r => r.column_name === 'lastName');
    
    console.log('\n✓ Column checks:');
    console.log(`   fullName exists: ${hasFullName ? '✅' : '❌'}`);
    console.log(`   firstName removed: ${!hasFirstName ? '✅' : '❌'}`);
    console.log(`   lastName removed: ${!hasLastName ? '✅' : '❌'}`);

    // Check user data
    const users = await db('users')
      .select('id', 'username', 'fullName', 'departmentId', 'chevronId', 'roleId')
      .orderBy('id')
      .limit(10);

    console.log('\n📊 Sample users (first 10):');
    console.log('┌────┬──────────────┬─────────────────────────┬────────┬─────────┬────────┐');
    console.log('│ ID │ Username     │ Full Name               │ Dept   │ Chevron │ Role   │');
    console.log('├────┼──────────────┼─────────────────────────┼────────┼─────────┼────────┤');
    users.forEach(u => {
      const id = String(u.id).padEnd(2);
      const username = String(u.username || '').padEnd(12).slice(0, 12);
      const fullName = String(u.fullName || '').padEnd(23).slice(0, 23);
      const dept = String(u.departmentId || '-').padEnd(6);
      const chevron = String(u.chevronId || '-').padEnd(7);
      const role = String(u.roleId || '-').padEnd(6);
      console.log(`│ ${id} │ ${username} │ ${fullName} │ ${dept} │ ${chevron} │ ${role} │`);
    });
    console.log('└────┴──────────────┴─────────────────────────┴────────┴─────────┴────────┘');

    // Count statistics
    const totalUsers = await db('users').count('* as count').first();
    const usersWithFullName = await db('users').whereNotNull('fullName').count('* as count').first();
    const usersWithDept = await db('users').whereNotNull('departmentId').count('* as count').first();
    const usersWithChevron = await db('users').whereNotNull('chevronId').count('* as count').first();

    console.log('\n📈 Statistics:');
    console.log(`   Total users: ${totalUsers.count}`);
    console.log(`   Users with fullName: ${usersWithFullName.count}`);
    console.log(`   Users with department: ${usersWithDept.count}`);
    console.log(`   Users with chevron: ${usersWithChevron.count}`);

    console.log('\n✅ Verification complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

verifyData();

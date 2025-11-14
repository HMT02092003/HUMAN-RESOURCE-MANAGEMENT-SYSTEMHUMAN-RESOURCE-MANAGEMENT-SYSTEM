/**
 * Script tự động để seed 100 users và sync sang các services
 * Chạy từ thư mục root: node scripts/seed-100-users.js
 */

const { spawn } = require('child_process');
const path = require('path');

const runCommand = (command, cwd, description) => {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 ${description}`);
    console.log(`📁 Working directory: ${cwd}`);
    console.log(`⚙️  Command: ${command}`);
    console.log(`${'='.repeat(60)}\n`);

    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, { 
      cwd, 
      shell: true,
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      console.error(`❌ Error: ${error.message}`);
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${description} - Completed successfully!\n`);
        resolve();
      } else {
        console.error(`\n❌ ${description} - Failed with code ${code}\n`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
};

async function main() {
  const rootDir = process.cwd();
  const authServiceDir = path.join(rootDir, 'services', 'auth-service');
  const employeeServiceDir = path.join(rootDir, 'services', 'employee-service');
  const attendanceServiceDir = path.join(rootDir, 'services', 'attendance-service');

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         🎯 SEED 100 USERS - AUTOMATED SCRIPT 🎯           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nThis script will:');
  console.log('  1️⃣  Create 100 users in auth-service');
  console.log('  2️⃣  Create 100 contracts in employee-service');
  console.log('  3️⃣  Create 300 monthly attendance records (3 months)');
  console.log('\n⚠️  Warning: This will DELETE existing seed data!\n');

  try {
    // Step 1: Auth Service - Create 100 users
    await runCommand(
      'npx knex seed:run --specific=06_seed_users_100.js',
      authServiceDir,
      'Step 1/3: Creating 100 users in Auth Service'
    );

    // Step 2: Employee Service - Create contracts
    await runCommand(
      'npx knex seed:run --specific=12_contracts_100_sync.cjs',
      employeeServiceDir,
      'Step 2/3: Creating 100 contracts in Employee Service'
    );

    // Step 3: Attendance Service - Create monthly summaries
    await runCommand(
      'npx knex seed:run --specific=10_monthly_attendance_100_sync.cjs',
      attendanceServiceDir,
      'Step 3/3: Creating monthly attendance summaries in Attendance Service'
    );

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              🎉 ALL SEEDS COMPLETED! 🎉                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📊 Summary:');
    console.log('  ✅ Auth Service: 100 users created');
    console.log('  ✅ Employee Service: 100 contracts created');
    console.log('  ✅ Attendance Service: 300 records created (100 users x 3 months)');
    console.log('\n🔍 Verify data:');
    console.log('  • Check users: cd services/auth-service && node check-users.js');
    console.log('  • Check contracts: SELECT COUNT(*) FROM contracts;');
    console.log('  • Check attendance: SELECT COUNT(*) FROM monthly_attendances;');
    console.log('\n');

  } catch (error) {
    console.error('\n');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                ❌ SEED FAILED! ❌                          ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error(`\nError: ${error.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Make sure all services are configured properly');
    console.error('  2. Check database connections');
    console.error('  3. Run migrations first: npx knex migrate:latest');
    console.error('  4. Check the logs above for specific errors\n');
    process.exit(1);
  }
}

main();

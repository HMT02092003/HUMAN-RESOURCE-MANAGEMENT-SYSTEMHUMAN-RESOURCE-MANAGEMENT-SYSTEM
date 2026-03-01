/**
 * Run seed SQL against attendance_service and salary_service databases
 * Usage: node scripts/run_seed_march_2026.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  password: '123456',
};

async function runSQL(database, sql) {
  const client = new Client({ ...DB_CONFIG, database });
  await client.connect();
  console.log(`Connected to ${database}`);

  // Split into individual statements
  const statements = sql
    .split('\n')
    .filter(line => line.trim().startsWith('INSERT INTO'))
    .map(line => line.trim());

  let success = 0;
  let errors = 0;

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      success++;
    } catch (err) {
      // Skip duplicate key errors
      if (err.code === '23505') {
        console.log(`  [SKIP] Duplicate key in ${database}`);
      } else {
        console.error(`  [ERROR] ${database}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`  ${database}: ${success} inserted, ${errors} errors`);
  await client.end();
}

async function main() {
  const sqlContent = fs.readFileSync(path.join(__dirname, 'seed_march_2026.sql'), 'utf8');
  const lines = sqlContent.split('\n');

  // Separate attendance and salary SQL
  const attendanceSQL = [];
  const salarySQL = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('INSERT INTO time_attendances') || trimmed.startsWith('INSERT INTO monthly_attendances')) {
      attendanceSQL.push(trimmed);
    } else if (trimmed.startsWith('INSERT INTO monthly_payslips')) {
      salarySQL.push(trimmed);
    }
  }

  console.log(`Attendance SQL: ${attendanceSQL.length} statements`);
  console.log(`Salary SQL: ${salarySQL.length} statements`);

  // Run attendance SQL
  console.log('\n--- Running attendance seed ---');
  await runSQL('attendance_service', attendanceSQL.join('\n'));

  // Run salary SQL
  console.log('\n--- Running salary seed ---');
  await runSQL('salary_service', salarySQL.join('\n'));

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456'
};

async function run() {
  const results = {};

  // Helper to query a specific database
  async function queryDb(dbName, sql) {
    const client = new Client({ ...config, database: dbName });
    await client.connect();
    try {
      const res = await client.query(sql);
      await client.end();
      return res.rows;
    } catch (err) {
      await client.end();
      throw err;
    }
  }

  try {
    results.auth_users = (await queryDb('auth_service', "SELECT COUNT(*)::int AS cnt FROM users;"))[0].cnt;
  } catch (e) {
    results.auth_users_error = e.message;
  }

  try {
    results.employee_contracts = (await queryDb('employee_service', "SELECT COUNT(*)::int AS cnt FROM contracts;"))[0].cnt;
  } catch (e) {
    results.employee_contracts_error = e.message;
  }

  try {
    results.salary_profiles = (await queryDb('salary_service', "SELECT COUNT(*)::int AS cnt FROM employee_salary_profiles;"))[0].cnt;
  } catch (e) {
    results.salary_profiles_error = e.message;
  }

  try {
    results.monthly_2025_10 = (await queryDb('attendance_service', "SELECT COUNT(*)::int AS cnt FROM monthly_attendances WHERE month='2025-10';"))[0].cnt;
    results.monthly_2025_11 = (await queryDb('attendance_service', "SELECT COUNT(*)::int AS cnt FROM monthly_attendances WHERE month='2025-11';"))[0].cnt;
  } catch (e) {
    results.monthly_error = e.message;
  }

  console.log(JSON.stringify(results, null, 2));
}

run().catch(err => {
  console.error('ERROR', err.message || err);
  process.exit(1);
});

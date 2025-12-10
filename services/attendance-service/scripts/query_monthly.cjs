const { Client } = require('pg');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '123456';
const DB_DATABASE = process.env.DB_DATABASE || 'attendance_service';

const client = new Client({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to DB', DB_HOST, DB_PORT, DB_DATABASE);

    // 1) Counts by month
    const countsRes = await client.query(`SELECT month, COUNT(*)::int as cnt FROM monthly_attendances GROUP BY month ORDER BY month DESC LIMIT 20`);
    console.log('\nCounts by month:');
    console.log(JSON.stringify(countsRes.rows, null, 2));

      // 1.5) Show table columns (debug)
      console.log('\nFetching table columns for monthly_attendances...');
      const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'monthly_attendances' ORDER BY ordinal_position`);
      console.log(JSON.stringify(cols.rows, null, 2));

    // 2) Latest 20 rows (use snake_case column names as in DB)
    console.log('\nAbout to run latest-rows query (using quoted identifiers for camelCase columns)...');
    const rowsRes = await client.query(`SELECT "id", "userId", "month", "isApproved", "totalScheduledDays" FROM monthly_attendances ORDER BY "id" DESC LIMIT 20`);
    console.log('Latest rows query succeeded.');
    console.log('\nLatest rows (limit 20):');
    console.log(JSON.stringify(rowsRes.rows, null, 2));

    // 3) Show total rows
    console.log('\nAbout to run total-rows query...');
    const totalRes = await client.query(`SELECT COUNT(*)::int as total FROM monthly_attendances`);
    console.log('Total rows query succeeded.');
    console.log('\nTotal rows (raw):', JSON.stringify(totalRes.rows, null, 2));

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('DB query failed:', err.message || err);
    try { await client.end(); } catch (e) {}
    process.exit(2);
  }
})();

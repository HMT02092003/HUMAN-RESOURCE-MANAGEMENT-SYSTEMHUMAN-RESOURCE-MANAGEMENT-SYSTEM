const { Client } = require('pg');

const client = new Client({ host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '123456', database: process.env.DB_DATABASE || 'attendance_service' });
(async () => {
  try {
    await client.connect();
    console.log('Connected');
    const res = await client.query(`SELECT COUNT(*)::int as cnt FROM monthly_attendances WHERE "userId" BETWEEN 2 AND 112 AND month = '2025-12'`);
    console.log('count:', res.rows);
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error(e);
    try { await client.end(); } catch (e) {}
    process.exit(2);
  }
})();

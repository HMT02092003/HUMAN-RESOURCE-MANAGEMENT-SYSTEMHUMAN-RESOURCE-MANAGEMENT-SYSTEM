const knex = require('knex');

(async ()=>{
  const db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      database: process.env.DB_DATABASE || 'attendance_service',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456'
    }
  });

  try {
    const rows = await db('monthly_attendances')
      .whereIn('userId', [1,2,3,4,5])
      .andWhere('month', '2025-11')
      .select('*');

    console.log('Found', rows.length, "monthly_attendance rows for users 1-5 in 2025-11");
    for (const r of rows) {
      console.log(JSON.stringify(r, null, 2).slice(0, 1000));
    }

    await db.destroy();
  } catch (e) {
    console.error('Error querying monthly_attendances:', e);
    process.exit(1);
  }
})();

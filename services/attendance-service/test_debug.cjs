const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'application_service',
    user: 'postgres',
    password: '123456'
  }
});

async function main() {
  // Tìm xem có app nào của user 3 không
  const user3Apps = await knex('applications')
    .where('status', 1)
    .where('userId', 3)
    .select('*');
  
  console.log('User 3 apps count:', user3Apps.length);
  
  for (const app of user3Apps) {
    console.log('App:', app.id, app.type, 'userId:', app.userId, typeof app.userId);
    const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
    console.log('  Data:', data);
  }
  
  // Giờ thử build map
  const approvedApplications = await knex('applications')
    .where('status', 1)
    .whereRaw("created_at >= '2025-10-01' AND created_at <= '2025-12-31'")
    .select('*');
  
  console.log('\nTotal approved apps:', approvedApplications.length);
  
  const leaveMap = new Map();
  
  for (const app of approvedApplications) {
    try {
      const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
      const userId = app.userId;
      
      if (app.type === 'leave') {
        const startDate = data.startDate;
        const endDate = data.endDate || data.startDate;
        let cur = new Date(startDate);
        const end = new Date(endDate);
        while (cur <= end) {
          const dateKey = cur.toISOString().split('T')[0];
          const fullKey = `${userId}-${dateKey}`;
          leaveMap.set(fullKey, { ...data, appId: app.id, userId });
          cur.setDate(cur.getDate() + 1);
        }
      }
    } catch (e) {
      console.log('Error parsing app:', app.id, e.message);
    }
  }
  
  console.log('\nLeave map size:', leaveMap.size);
  console.log('Has "3-2025-10-02"?', leaveMap.has('3-2025-10-02'));
  
  // Check a few keys
  console.log('\nFirst 5 keys:');
  let count = 0;
  for (const [key, value] of leaveMap.entries()) {
    if (count < 5) {
      console.log(`  Key: "${key}", userId type:`, typeof value.userId);
      count++;
    }
  }
  
  await knex.destroy();
}

main().catch(console.error);

/**
 * Tìm user nào có dữ liệu schedules
 */
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'attendance_service'
  }
});

async function findUsersWithSchedules() {
  try {
    console.log('🔍 Tìm kiếm users có dữ liệu schedules...\n');

    const users = await db('employee_schedules')
      .select('user_id')
      .count('* as total')
      .sum(db.raw("CASE WHEN status='approved' THEN 1 ELSE 0 END"))
      .sum(db.raw("CASE WHEN status='pending' THEN 1 ELSE 0 END"))
      .sum(db.raw("CASE WHEN status='rejected' THEN 1 ELSE 0 END"))
      .groupBy('user_id')
      .orderBy('user_id');

    if (users.length === 0) {
      console.log('❌ Không có user nào có dữ liệu schedules trong database!');
      console.log('   Database có thể chưa có dữ liệu seed.');
    } else {
      console.log(`✅ Tìm thấy ${users.length} user có dữ liệu schedules:\n`);
      users.forEach(u => {
        console.log(`   User ID: ${u.user_id}`);
        console.log(`   - Tổng: ${u.total}`);
        console.log(`   - Đã duyệt: ${u.approved || 0}`);
        console.log(`   - Chờ duyệt: ${u.pending || 0}`);
        console.log(`   - Từ chối: ${u.rejected || 0}`);
        console.log('');
      });

      // Lấy dữ liệu mẫu của user đầu tiên
      const firstUserId = users[0].user_id;
      console.log(`\n📋 Dữ liệu mẫu của User ${firstUserId}:\n`);
      
      const samples = await db('employee_schedules')
        .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
        .select(
          'employee_schedules.id',
          'employee_schedules.date',
          'employee_schedules.status',
          'shifts.name as shift_name',
          'shifts.start_time',
          'shifts.end_time'
        )
        .where('employee_schedules.user_id', firstUserId)
        .orderBy('employee_schedules.date', 'desc')
        .limit(10);

      samples.forEach((s, i) => {
        const icon = s.status === 'approved' ? '✅' : s.status === 'pending' ? '⏳' : '❌';
        console.log(`   [${i+1}] ${s.date} | ${icon} ${s.status} | ${s.shift_name} (${s.start_time}-${s.end_time})`);
      });

      console.log(`\n💡 Để kiểm tra user cụ thể, chạy:`);
      console.log(`   node test-schedules-query.cjs ${firstUserId}`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await db.destroy();
  }
}

findUsersWithSchedules();

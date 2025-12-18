/**
 * So sánh dữ liệu DB vs Service logic
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

async function compareDBvsService() {
  try {
    const userId = 3; // User trong ảnh
    
    console.log('='.repeat(80));
    console.log(`🔍 SO SÁNH DỮ LIỆU USER_ID: ${userId}`);
    console.log('='.repeat(80));
    console.log('');

    // 1. Query trực tiếp DB (giống service)
    console.log('1️⃣ Query trực tiếp từ DB:');
    const dbResults = await db('employee_schedules')
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select(
        'employee_schedules.*',
        'shifts.name as shift_name',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.working_unit'
      )
      .where('employee_schedules.user_id', userId)
      .orderBy('employee_schedules.date', 'desc');

    console.log(`   Total trong DB: ${dbResults.length} bản ghi`);
    
    // Thống kê theo status
    const statusCount = {};
    dbResults.forEach(r => {
      statusCount[r.status] = (statusCount[r.status] || 0) + 1;
    });
    
    console.log('   Theo status:');
    Object.keys(statusCount).forEach(s => {
      const icon = s === 'approved' ? '✅' : s === 'pending' ? '⏳' : '❌';
      console.log(`     ${icon} ${s}: ${statusCount[s]}`);
    });
    console.log('');

    // 2. Hiển thị tháng 12/2025
    console.log('2️⃣ Dữ liệu tháng 12/2025:');
    const dec2025 = dbResults.filter(r => {
      const date = new Date(r.date);
      return date.getFullYear() === 2025 && date.getMonth() === 11; // December = 11
    });

    console.log(`   Có ${dec2025.length} bản ghi trong tháng 12/2025:`);
    dec2025.forEach(r => {
      const icon = r.status === 'approved' ? '✅' : r.status === 'pending' ? '⏳' : '❌';
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      console.log(`     ${dateStr}: ${icon} ${r.status} | ${r.shift_name} (${r.start_time}-${r.end_time})`);
    });
    console.log('');

    // 3. Kiểm tra status = approved trong Dec 2025
    console.log('3️⃣ Chỉ lọc status = approved trong tháng 12:');
    const approvedDec = dec2025.filter(r => r.status === 'approved');
    console.log(`   Có ${approvedDec.length} bản ghi approved:`);
    approvedDec.forEach(r => {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      console.log(`     ${dateStr}: ${r.shift_name} | Created: ${new Date(r.created_at).toISOString()}`);
    });
    console.log('');

    // 4. TOP 20 bản ghi mới nhất (giống pagination page=1, limit=20)
    console.log('4️⃣ TOP 20 bản ghi mới nhất (pagination default):');
    const top20 = dbResults.slice(0, 20);
    console.log(`   Hiển thị ${top20.length} bản ghi:\n`);
    top20.forEach((r, i) => {
      const icon = r.status === 'approved' ? '✅' : r.status === 'pending' ? '⏳' : '❌';
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      console.log(`     [${i+1}] ${dateStr} | ${icon} ${r.status} | ${r.shift_name}`);
    });
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ HOÀN THÀNH SO SÁNH');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 Kết luận:');
    console.log(`   - Tổng bản ghi user ${userId}: ${dbResults.length}`);
    console.log(`   - Tháng 12/2025: ${dec2025.length} bản ghi (${approvedDec.length} approved)`);
    console.log(`   - TOP 20: ${top20.length} bản ghi`);
    console.log('');
    console.log('⚠️  Nếu FE chỉ hiển thị đến ngày 4/12, kiểm tra:');
    console.log('   1. Frontend có gọi đúng API /schedules/my/paginated không?');
    console.log('   2. Frontend có filter (status, date range) nào không?');
    console.log('   3. Check console log backend khi FE gọi API');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await db.destroy();
  }
}

compareDBvsService();

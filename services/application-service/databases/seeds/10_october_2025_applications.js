/**
 * Seed file: Applications - October 2025 - 50 Employees
 * Tạo các đơn từ (nghỉ phép, công tác, OT) tương ứng với dữ liệu chấm công tháng 10/2025
 */

export async function seed(knex) {
  // Xóa dữ liệu đơn từ tháng 10/2025
  await knex('applications')
    .where('created_at', '>=', '2025-10-01')
    .where('created_at', '<=', '2025-10-31')
    .del();

  console.log('🗑️  Đã xóa dữ liệu đơn từ tháng 10/2025');

  // Danh sách ngày làm việc trong tháng 10/2025
  const workingDays = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 9, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(day);
    }
  }

  const applications = [];
  let appId = 1;

  // Tạo đơn từ cho từng nhân viên
  for (let userId = 2; userId <= 50; userId++) { // Bỏ qua admin (userId=1)
    // Random số ngày nghỉ phép (0-2 ngày)
    const numLeaveDays = Math.floor(Math.random() * 3);
    
    // Random số ngày công tác (0-1 ngày)
    const numBusinessTrips = Math.floor(Math.random() * 2);
    
    // Random số lần OT (0-4 lần)
    const numOvertimes = Math.floor(Math.random() * 5);

    const usedDays = [];

    // 1. Tạo đơn nghỉ phép
    for (let i = 0; i < numLeaveDays; i++) {
      let day;
      do {
        day = workingDays[Math.floor(Math.random() * workingDays.length)];
      } while (usedDays.includes(day));
      usedDays.push(day);

      const startDate = `2025-10-${String(day).padStart(2, '0')}`;
      const endDate = startDate; // Nghỉ 1 ngày
      const createdAt = new Date(2025, 9, day - 2); // Tạo đơn trước 2 ngày
      const approvedDate = new Date(2025, 9, day - 1); // Duyệt trước 1 ngày

      applications.push({
        type: 'leave',
        status: 1, // approved
        data: JSON.stringify({
          reason: Math.random() > 0.5 ? 'Nghỉ phép năm' : 'Việc gia đình',
          startDate: startDate,
          endDate: endDate,
          halfDay: false,
          totalDays: 1
        }),
        userId: userId,
        approvedBy: Math.floor(Math.random() * 5) + 2, // Random người duyệt
        approvedDate: approvedDate,
        created_at: createdAt,
        updated_at: approvedDate
      });
    }

    // 2. Tạo đơn công tác
    for (let i = 0; i < numBusinessTrips; i++) {
      let day;
      do {
        day = workingDays[Math.floor(Math.random() * workingDays.length)];
      } while (usedDays.includes(day));
      usedDays.push(day);

      const startDate = `2025-10-${String(day).padStart(2, '0')}`;
      const endDate = startDate;
      const createdAt = new Date(2025, 9, day - 3);
      const approvedDate = new Date(2025, 9, day - 1);

      const locations = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
      const purposes = [
        'Họp với khách hàng',
        'Khảo sát dự án',
        'Đào tạo',
        'Hội thảo',
        'Gặp đối tác'
      ];

      applications.push({
        type: 'business-trip',
        status: 1, // approved
        data: JSON.stringify({
          location: locations[Math.floor(Math.random() * locations.length)],
          purpose: purposes[Math.floor(Math.random() * purposes.length)],
          startDate: startDate,
          endDate: endDate,
          totalDays: 1,
          transportation: Math.random() > 0.5 ? 'Máy bay' : 'Xe công ty',
          estimatedBudget: Math.floor(Math.random() * 5000000) + 2000000
        }),
        userId: userId,
        approvedBy: Math.floor(Math.random() * 5) + 2,
        approvedDate: approvedDate,
        created_at: createdAt,
        updated_at: approvedDate
      });
    }

    // 3. Tạo đơn OT
    for (let i = 0; i < numOvertimes; i++) {
      let day;
      do {
        day = workingDays[Math.floor(Math.random() * workingDays.length)];
      } while (usedDays.includes(day));
      // Không thêm vào usedDays vì có thể làm việc và OT cùng ngày

      const date = `2025-10-${String(day).padStart(2, '0')}`;
      const otHours = Math.floor(Math.random() * 3) + 1; // 1-3 giờ OT
      const startTime = Math.random() > 0.5 ? '18:00' : '19:00';
      const endHour = parseInt(startTime.split(':')[0]) + otHours;
      const endTime = `${endHour}:00`;
      
      const createdAt = new Date(2025, 9, day);
      const approvedDate = new Date(2025, 9, day + 1);

      const reasons = [
        'Hoàn thành dự án deadline',
        'Xử lý công việc khẩn cấp',
        'Hỗ trợ team',
        'Bàn giao dự án',
        'Sửa lỗi hệ thống'
      ];

      applications.push({
        type: 'overtime',
        status: 1, // approved
        data: JSON.stringify({
          date: date,
          startTime: startTime,
          endTime: endTime,
          hours: otHours,
          reason: reasons[Math.floor(Math.random() * reasons.length)]
        }),
        userId: userId,
        approvedBy: Math.floor(Math.random() * 5) + 2,
        approvedDate: approvedDate,
        created_at: createdAt,
        updated_at: approvedDate
      });
    }

    // 4. Random thêm một vài đơn pending hoặc rejected
    if (Math.random() > 0.7) {
      const futureDay = Math.floor(Math.random() * 10) + 22; // Ngày cuối tháng
      const date = `2025-10-${String(futureDay).padStart(2, '0')}`;
      const createdAt = new Date(2025, 9, 20);
      const status = Math.random() > 0.5 ? 0 : 2; // pending or rejected

      applications.push({
        type: Math.random() > 0.5 ? 'leave' : 'overtime',
        status: status,
        data: JSON.stringify({
          reason: 'Đơn chờ duyệt hoặc bị từ chối',
          date: date,
          startDate: date,
          endDate: date
        }),
        userId: userId,
        approvedBy: status === 2 ? Math.floor(Math.random() * 5) + 2 : null,
        approvedDate: status === 2 ? new Date(2025, 9, 21) : null,
        created_at: createdAt,
        updated_at: status === 2 ? new Date(2025, 9, 21) : createdAt
      });
    }
  }

  // Insert dữ liệu theo batch
  const batchSize = 500;
  for (let i = 0; i < applications.length; i += batchSize) {
    const batch = applications.slice(i, i + batchSize);
    await knex('applications').insert(batch);
    console.log(`   📝 Đã insert ${Math.min(i + batchSize, applications.length)}/${applications.length} đơn từ`);
  }

  console.log(`✅ Đã tạo đơn từ tháng 10/2025 cho 49 nhân viên`);
  console.log(`   📊 Tổng số đơn: ${applications.length}`);
  console.log(`   📋 Nghỉ phép: ${applications.filter(a => a.type === 'leave').length}`);
  console.log(`   📋 Công tác: ${applications.filter(a => a.type === 'business-trip').length}`);
  console.log(`   📋 OT: ${applications.filter(a => a.type === 'overtime').length}`);
  console.log(`   📋 Đã duyệt: ${applications.filter(a => a.status === 1).length}`);
  console.log(`   📋 Chờ duyệt: ${applications.filter(a => a.status === 0).length}`);
  console.log(`   📋 Từ chối: ${applications.filter(a => a.status === 2).length}`);
};

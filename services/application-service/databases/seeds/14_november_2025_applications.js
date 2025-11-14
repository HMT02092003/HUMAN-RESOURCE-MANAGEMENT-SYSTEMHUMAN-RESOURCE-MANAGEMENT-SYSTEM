/**
 * Seed file: Applications - November 2025 - 100 Employees
 * Tạo các đơn từ (nghỉ phép, công tác, OT) tương ứng với dữ liệu chấm công tháng 11/2025
 */

export async function seed(knex) {
  // Xóa dữ liệu đơn từ tháng 11/2025 (giữ lại các tháng khác)
  await knex('applications')
    .where('created_at', '>=', '2025-11-01')
    .where('created_at', '<=', '2025-11-30')
    .del();

  console.log('🗑️  Đã xóa dữ liệu đơn từ tháng 11/2025');

  // Danh sách ngày làm việc trong tháng 11/2025 (bỏ cuối tuần)
  const workingDays = [];
  for (let day = 1; day <= 30; day++) {
    const date = new Date(2025, 10, day); // Month 10 = November
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      workingDays.push(day);
    }
  }

  console.log(`📅 Working days in November 2025: ${workingDays.length} days`);

  const applications = [];

  // Tạo đơn từ cho 100 nhân viên (userId từ 2-101)
  for (let userId = 2; userId <= 101; userId++) {
    // Random số ngày nghỉ phép (0-3 ngày)
    const numLeaveDays = Math.floor(Math.random() * 4);
    
    // Random số ngày công tác (0-2 ngày)
    const numBusinessTrips = Math.floor(Math.random() * 3);
    
    // Random số lần OT (0-5 lần)
    const numOvertimes = Math.floor(Math.random() * 6);

    const usedDays = [];

    // 1. Tạo đơn nghỉ phép
    for (let i = 0; i < numLeaveDays; i++) {
      let day;
      do {
        day = workingDays[Math.floor(Math.random() * workingDays.length)];
      } while (usedDays.includes(day));
      usedDays.push(day);

      const startDate = `2025-11-${String(day).padStart(2, '0')}`;
      const endDate = startDate; // Nghỉ 1 ngày
      const createdAt = new Date(2025, 10, Math.max(1, day - 2)); // Tạo đơn trước 2 ngày
      const approvedDate = new Date(2025, 10, Math.max(1, day - 1)); // Duyệt trước 1 ngày

      const leaveReasons = [
        'Nghỉ phép năm',
        'Việc gia đình',
        'Đi khám bệnh',
        'Nghỉ phép cá nhân',
        'Chăm sóc người thân'
      ];

      applications.push({
        type: 'leave',
        status: 1, // approved
        data: JSON.stringify({
          reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
          startDate: startDate,
          endDate: endDate,
          halfDay: false,
          totalDays: 1
        }),
        userId: userId,
        approvedBy: Math.floor(Math.random() * 5) + 2, // Random người duyệt (userId 2-6)
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

      const startDate = `2025-11-${String(day).padStart(2, '0')}`;
      const endDate = startDate;
      const createdAt = new Date(2025, 10, Math.max(1, day - 3)); // Tạo trước 3 ngày
      const approvedDate = new Date(2025, 10, Math.max(1, day - 1));

      const locations = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Nha Trang', 'Huế'];
      const purposes = [
        'Họp với khách hàng',
        'Khảo sát dự án',
        'Đào tạo nhân viên',
        'Hội thảo ngành',
        'Gặp đối tác',
        'Triển khai hệ thống',
        'Kiểm tra chất lượng'
      ];
      const transports = ['Máy bay', 'Xe công ty', 'Tàu hỏa', 'Xe khách'];

      applications.push({
        type: 'business-trip',
        status: 1, // approved
        data: JSON.stringify({
          location: locations[Math.floor(Math.random() * locations.length)],
          purpose: purposes[Math.floor(Math.random() * purposes.length)],
          startDate: startDate,
          endDate: endDate,
          totalDays: 1,
          transportation: transports[Math.floor(Math.random() * transports.length)],
          estimatedBudget: Math.floor(Math.random() * 5000000) + 2000000 // 2-7 triệu
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
      } while (false); // Có thể làm việc và OT cùng ngày

      const date = `2025-11-${String(day).padStart(2, '0')}`;
      const otHours = Math.floor(Math.random() * 4) + 1; // 1-4 giờ OT
      const startTime = Math.random() > 0.5 ? '18:00' : '19:00';
      const endHour = parseInt(startTime.split(':')[0]) + otHours;
      const endTime = `${endHour}:00`;
      
      const createdAt = new Date(2025, 10, day);
      const approvedDate = new Date(2025, 10, Math.min(30, day + 1));

      const reasons = [
        'Hoàn thành dự án deadline',
        'Xử lý công việc khẩn cấp',
        'Hỗ trợ team dự án',
        'Bàn giao dự án',
        'Sửa lỗi hệ thống',
        'Deploy sản phẩm',
        'Tăng cường sản xuất',
        'Xử lý yêu cầu khách hàng'
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

    // 4. Random thêm một vài đơn pending hoặc rejected (10% nhân viên)
    if (Math.random() > 0.9) {
      const futureDay = Math.floor(Math.random() * 8) + 23; // Ngày cuối tháng (23-30)
      if (futureDay <= 30) {
        const date = `2025-11-${String(futureDay).padStart(2, '0')}`;
        const createdAt = new Date(2025, 10, Math.max(1, futureDay - 2));
        const status = Math.random() > 0.5 ? 0 : 2; // pending or rejected

        applications.push({
          type: Math.random() > 0.5 ? 'leave' : 'overtime',
          status: status,
          data: JSON.stringify({
            reason: status === 0 ? 'Đơn chờ duyệt' : 'Đơn bị từ chối do không đủ điều kiện',
            date: date,
            startDate: date,
            endDate: date,
            hours: status === 0 ? null : 2
          }),
          userId: userId,
          approvedBy: status === 2 ? Math.floor(Math.random() * 5) + 2 : null,
          approvedDate: status === 2 ? new Date(2025, 10, Math.max(1, futureDay - 1)) : null,
          created_at: createdAt,
          updated_at: status === 2 ? new Date(2025, 10, Math.max(1, futureDay - 1)) : createdAt
        });
      }
    }
  }

  // Insert dữ liệu theo batch để tránh quá tải
  const batchSize = 500;
  for (let i = 0; i < applications.length; i += batchSize) {
    const batch = applications.slice(i, i + batchSize);
    await knex('applications').insert(batch);
    console.log(`   📝 Đã insert ${Math.min(i + batchSize, applications.length)}/${applications.length} đơn từ`);
  }

  console.log(`\n✅ Đã tạo đơn từ tháng 11/2025 cho 100 nhân viên`);
  console.log(`   📊 Tổng số đơn: ${applications.length}`);
  console.log(`   📋 Nghỉ phép: ${applications.filter(a => a.type === 'leave').length}`);
  console.log(`   📋 Công tác: ${applications.filter(a => a.type === 'business-trip').length}`);
  console.log(`   📋 Overtime: ${applications.filter(a => a.type === 'overtime').length}`);
  console.log(`   ✅ Đã duyệt: ${applications.filter(a => a.status === 1).length}`);
  console.log(`   ⏳ Chờ duyệt: ${applications.filter(a => a.status === 0).length}`);
  console.log(`   ❌ Từ chối: ${applications.filter(a => a.status === 2).length}`);
}

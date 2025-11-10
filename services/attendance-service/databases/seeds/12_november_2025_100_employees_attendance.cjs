/**
 * Seed file: Time Attendances for November 2025 (100 Employees)
 * Tạo dữ liệu chấm công cho tháng 11/2025 cho 100 nhân viên
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu chấm công tháng 11/2025 (giữ lại các tháng khác)
  await knex('time_attendances')
    .whereBetween('date', ['2025-11-01', '2025-11-30'])
    .andWhere('userId', '>', 1)
    .del();

  const attendances = [];
  
  // Danh sách ngày làm việc trong tháng 11/2025 (loại bỏ cuối tuần)
  const workingDays = [];
  for (let day = 1; day <= 30; day++) {
    const date = new Date(2025, 10, day); // Month 10 = November
    const dayOfWeek = date.getDay();
    // 0 = Chủ nhật, 6 = Thứ 7
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(day);
    }
  }

  // Hàm random thời gian check-in (8:00-9:00)
  const randomCheckIn = (day) => {
    const hour = 8;
    const minute = Math.floor(Math.random() * 60); // 0-59 phút
    return new Date(2025, 10, day, hour, minute, 0);
  };

  // Hàm random thời gian check-out (17:00-18:30)
  const randomCheckOut = (day) => {
    const hour = 17;
    const minute = Math.floor(Math.random() * 90); // 0-89 phút (17:00-18:30)
    return new Date(2025, 10, day, hour, minute, 0);
  };

  // Tính số giờ làm việc
  const calculateWorkHours = (checkIn, checkOut) => {
    const diff = (checkOut - checkIn) / (1000 * 60 * 60); // Convert to hours
    return Math.max(0, diff - 1); // Trừ 1 giờ nghỉ trưa
  };

  // Tính số phút đi trễ (chuẩn là 8:30)
  const calculateLateMinutes = (checkIn) => {
    const standardTime = new Date(checkIn);
    standardTime.setHours(8, 30, 0, 0);
    if (checkIn > standardTime) {
      return Math.floor((checkIn - standardTime) / (1000 * 60));
    }
    return 0;
  };

  // Tính số phút về sớm (chuẩn là 17:30)
  const calculateEarlyMinutes = (checkOut) => {
    const standardTime = new Date(checkOut);
    standardTime.setHours(17, 30, 0, 0);
    if (checkOut < standardTime) {
      return Math.floor((standardTime - checkOut) / (1000 * 60));
    }
    return 0;
  };

  // Tạo dữ liệu chấm công cho 100 nhân viên (userId 2-101)
  for (let userId = 2; userId <= 101; userId++) {
    // Mỗi nhân viên có xác suất vắng mặt khác nhau
    const absentRate = Math.random() < 0.1 ? 0.15 : 0.05; // 10% nhân viên có tỷ lệ vắng 15%, còn lại 5%
    
    for (const day of workingDays) {
      const date = new Date(2025, 10, day);
      
      // Random xem có vắng mặt không
      if (Math.random() < absentRate) {
        continue; // Skip ngày này (vắng mặt)
      }

      const checkIn = randomCheckIn(day);
      const checkOut = randomCheckOut(day);
      const workHours = calculateWorkHours(checkIn, checkOut);
      const lateMinutes = calculateLateMinutes(checkIn);
      const earlyMinutes = calculateEarlyMinutes(checkOut);

      attendances.push({
        userId: userId,
        date: date,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        dailyTotalWorkHours: parseFloat(workHours.toFixed(2)),
        lateMinutes: lateMinutes,
        earlyDepartureMinutes: earlyMinutes,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // Insert theo batch để tránh quá tải
  const batchSize = 500;
  for (let i = 0; i < attendances.length; i += batchSize) {
    const batch = attendances.slice(i, i + batchSize);
    await knex('time_attendances').insert(batch);
  }

  console.log(`✅ Đã tạo ${attendances.length} bản ghi chấm công cho tháng 11/2025`);
  console.log(`   - Số ngày làm việc: ${workingDays.length} ngày`);
  console.log(`   - Số nhân viên: 100 người`);
};

/**
 * Seed file: Time Attendances - October 2025 - 50 Employees
 * Tạo dữ liệu chấm công cho 50 nhân viên trong tháng 10/2025
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu chấm công tháng 10/2025 của tất cả users
  await knex('time_attendances')
    .whereBetween('date', ['2025-10-01', '2025-10-31'])
    .del();

  console.log('🗑️  Đã xóa dữ liệu chấm công tháng 10/2025');

  // Cấu hình
  const baseSalary = 15000000;
  const hourlyRate = baseSalary / 26 / 8; // ~72,115 VND/giờ
  const otRate = 1.5;
  const penaltyRate = 1500; // VND/phút

  const calculatePenalty = (minutes) => Math.round(penaltyRate * minutes);
  const calculateOtSalary = (hours) => Math.round(hourlyRate * otRate * hours);
  const calculateWorkingUnit = (totalHours) => {
    const standardWorkDayHours = 8;
    if (totalHours <= 0) return 0;
    const workUnit = Math.min(totalHours / standardWorkDayHours, 1);
    return parseFloat(workUnit.toFixed(3));
  };

  // Danh sách ngày làm việc trong tháng 10/2025 (bỏ cuối tuần)
  const workingDays = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 9, day); // tháng 9 = October
    const dayOfWeek = date.getDay();
    // Bỏ thứ 7 và Chủ nhật
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(day);
    }
  }

  console.log(`📅 Tháng 10/2025 có ${workingDays.length} ngày làm việc`);

  // Hàm random giờ check in/out với biến thể
  const randomCheckIn = (baseHour = 9, variance = 60) => {
    // variance: phút có thể sớm/muộn, mặc định ±60 phút
    const minutes = Math.floor(Math.random() * variance * 2) - variance;
    const totalMinutes = baseHour * 60 + minutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return { hour: Math.max(0, Math.min(23, hour)), minute: Math.abs(minute) };
  };

  const randomCheckOut = (baseHour = 18, variance = 60) => {
    const minutes = Math.floor(Math.random() * variance * 2) - variance;
    const totalMinutes = baseHour * 60 + minutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return { hour: Math.max(0, Math.min(23, hour)), minute: Math.abs(minute) };
  };

  // Tạo dữ liệu chấm công cho 50 nhân viên
  const allAttendances = [];

  for (let userId = 1; userId <= 50; userId++) {
    // Mỗi người có pattern riêng
    const userPattern = {
      // Tỷ lệ đi trễ (0-100%)
      lateRate: Math.random() * 40, // 0-40%
      // Tỷ lệ về sớm (0-100%)
      earlyRate: Math.random() * 20, // 0-20%
      // Tỷ lệ vắng (0-100%)
      absentRate: Math.random() * 10, // 0-10%
      // Tỷ lệ OT (0-100%)
      otRate: Math.random() * 30, // 0-30%
      // Số ngày nghỉ phép
      leaveDays: Math.floor(Math.random() * 3), // 0-2 ngày
      // Số ngày công tác
      businessTripDays: Math.floor(Math.random() * 2), // 0-1 ngày
    };

    // Chọn ngẫu nhiên ngày nghỉ phép và công tác
    const leaveDaysList = [];
    const businessTripDaysList = [];
    
    while (leaveDaysList.length < userPattern.leaveDays) {
      const day = workingDays[Math.floor(Math.random() * workingDays.length)];
      if (!leaveDaysList.includes(day) && !businessTripDaysList.includes(day)) {
        leaveDaysList.push(day);
      }
    }
    
    while (businessTripDaysList.length < userPattern.businessTripDays) {
      const day = workingDays[Math.floor(Math.random() * workingDays.length)];
      if (!leaveDaysList.includes(day) && !businessTripDaysList.includes(day)) {
        businessTripDaysList.push(day);
      }
    }

    for (const day of workingDays) {
      const dateStr = `2025-10-${String(day).padStart(2, '0')}`;
      
      // Bỏ qua ngày nghỉ phép hoặc công tác (không tạo record chấm công)
      if (leaveDaysList.includes(day) || businessTripDaysList.includes(day)) {
        continue;
      }

      // Random vắng mặt
      const isAbsent = Math.random() * 100 < userPattern.absentRate;
      
      if (isAbsent) {
        // Vắng mặt: không có check in/out
        allAttendances.push({
          userId: userId,
          date: dateStr,
          checkInTime: null,
          checkOutTime: null,
          dailyTotalWorkHours: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          dailyWorkingUnit: 0,
          lateArrivalPenalty: 0,
          earlyLeavePenalty: 0,
          otMinutes: 0,
          otSalary: 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
        continue;
      }

      // Có mặt - tính toán giờ vào/ra
      const isLate = Math.random() * 100 < userPattern.lateRate;
      const isEarly = Math.random() * 100 < userPattern.earlyRate;
      const hasOT = Math.random() * 100 < userPattern.otRate;

      // Check in
      let checkIn = randomCheckIn(9, isLate ? 50 : 10);
      const checkInTime = `${dateStr} ${String(checkIn.hour).padStart(2, '0')}:${String(checkIn.minute).padStart(2, '0')}:00`;
      
      // Tính late minutes (trễ sau 9:00)
      const checkInMinutesFromMidnight = checkIn.hour * 60 + checkIn.minute;
      const standardStartMinutes = 9 * 60; // 9:00
      const lateMinutes = Math.max(0, checkInMinutesFromMidnight - standardStartMinutes);

      // Check out
      let checkOut;
      let otMinutes = 0;
      if (hasOT) {
        // Có OT: làm thêm 1-4 giờ
        const otHours = Math.floor(Math.random() * 4) + 1;
        checkOut = randomCheckOut(18 + otHours, 15);
        const checkOutMinutesFromMidnight = checkOut.hour * 60 + checkOut.minute;
        const standardEndMinutes = 18 * 60; // 18:00
        otMinutes = Math.max(0, checkOutMinutesFromMidnight - standardEndMinutes);
      } else if (isEarly) {
        // Về sớm: trước 18:00
        checkOut = randomCheckOut(17, 30);
      } else {
        // Bình thường
        checkOut = randomCheckOut(18, 15);
      }
      
      const checkOutTime = `${dateStr} ${String(checkOut.hour).padStart(2, '0')}:${String(checkOut.minute).padStart(2, '0')}:00`;

      // Tính early departure minutes (về sớm trước 18:00)
      const checkOutMinutesFromMidnight = checkOut.hour * 60 + checkOut.minute;
      const standardEndMinutes = 18 * 60; // 18:00
      const earlyDepartureMinutes = Math.max(0, standardEndMinutes - checkOutMinutesFromMidnight);

      // Tính tổng giờ làm việc (trừ 1 giờ nghỉ trưa)
      const totalMinutes = checkOutMinutesFromMidnight - checkInMinutesFromMidnight - 60; // -60 phút nghỉ trưa
      const dailyTotalWorkHours = parseFloat((Math.max(0, totalMinutes) / 60).toFixed(2));

      allAttendances.push({
        userId: userId,
        date: dateStr,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        dailyTotalWorkHours: dailyTotalWorkHours,
        lateMinutes: lateMinutes,
        earlyDepartureMinutes: earlyDepartureMinutes,
        dailyWorkingUnit: calculateWorkingUnit(dailyTotalWorkHours),
        lateArrivalPenalty: calculatePenalty(lateMinutes),
        earlyLeavePenalty: calculatePenalty(earlyDepartureMinutes),
        otMinutes: otMinutes,
        otSalary: calculateOtSalary(otMinutes / 60),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  // Insert dữ liệu theo batch (mỗi batch 500 records)
  const batchSize = 500;
  for (let i = 0; i < allAttendances.length; i += batchSize) {
    const batch = allAttendances.slice(i, i + batchSize);
    await knex('time_attendances').insert(batch);
    console.log(`   📝 Đã insert ${Math.min(i + batchSize, allAttendances.length)}/${allAttendances.length} records`);
  }

  console.log(`✅ Đã tạo dữ liệu chấm công tháng 10/2025 cho 50 nhân viên`);
  console.log(`   📊 Tổng số bản ghi: ${allAttendances.length}`);
  console.log(`   📋 Trung bình ~${(allAttendances.length / 50).toFixed(1)} ngày/người`);
};

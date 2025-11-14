/**
 * Seed file: Time Attendances for October 2025 (100 Employees)
 * Tạo dữ liệu chấm công cho tháng 10/2025 cho 100 nhân viên
 * Bao gồm: check-in/out time, late minutes, early departure, work hours
 */

exports.seed = async function(knex) {
  console.log('\n📅 Seeding October 2025 attendance data...\n');
  
  // Xóa dữ liệu chấm công tháng 10/2025 (giữ lại các tháng khác)
  await knex('time_attendances')
    .whereBetween('date', ['2025-10-01', '2025-10-31'])
    .del();

  const attendances = [];
  
  // Danh sách ngày làm việc trong tháng 10/2025 (loại bỏ cuối tuần)
  const workingDays = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 9, day); // Month 9 = October
    const dayOfWeek = date.getDay();
    // 0 = Chủ nhật, 6 = Thứ 7
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(day);
    }
  }

  console.log(`   Working days in October: ${workingDays.length} days`);

  // Hàm random thời gian check-in với phân phối realistic
  const randomCheckIn = (day, employeeType) => {
    let baseHour = 7;
    let randomMinutes = 0;
    
    if (employeeType === 'punctual') {
      // Nhân viên đúng giờ: 7:30-8:25
      randomMinutes = 30 + Math.floor(Math.random() * 55);
    } else if (employeeType === 'often_late') {
      // Nhân viên hay trễ: 8:35-9:15
      randomMinutes = 95 + Math.floor(Math.random() * 40);
    } else {
      // Nhân viên trung bình: 8:10-8:50
      randomMinutes = 70 + Math.floor(Math.random() * 40);
    }
    
    const hour = baseHour + Math.floor(randomMinutes / 60);
    const minute = randomMinutes % 60;
    return new Date(2025, 9, day, hour, minute, Math.floor(Math.random() * 60));
  };

  // Hàm random thời gian check-out
  const randomCheckOut = (day, employeeType, checkIn) => {
    let baseHour = 17;
    let randomMinutes = 0;
    
    if (employeeType === 'punctual') {
      // Nhân viên chăm chỉ: 17:30-18:30
      randomMinutes = 30 + Math.floor(Math.random() * 60);
    } else if (employeeType === 'often_late') {
      // Nhân viên hay về sớm: 17:00-17:25
      randomMinutes = Math.floor(Math.random() * 25);
    } else {
      // Trung bình: 17:15-18:00
      randomMinutes = 15 + Math.floor(Math.random() * 45);
    }
    
    const hour = baseHour + Math.floor(randomMinutes / 60);
    const minute = randomMinutes % 60;
    const checkOut = new Date(2025, 9, day, hour, minute, Math.floor(Math.random() * 60));
    
    // Đảm bảo check-out sau check-in ít nhất 7 giờ
    const minCheckOut = new Date(checkIn.getTime() + 7 * 60 * 60 * 1000);
    return checkOut > minCheckOut ? checkOut : minCheckOut;
  };

  // Tính số giờ làm việc (trừ 1 giờ nghỉ trưa)
  const calculateWorkHours = (checkIn, checkOut) => {
    const diff = (checkOut - checkIn) / (1000 * 60 * 60);
    return Math.max(0, Math.round((diff - 1) * 100) / 100);
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

  // Phân loại nhân viên
  const getEmployeeType = (userId) => {
    const random = (userId * 7) % 100; // Pseudo-random but deterministic
    if (random < 20) return 'often_late';
    if (random < 70) return 'average';
    return 'punctual';
  };

  // Tạo dữ liệu chấm công cho 100 nhân viên (userId 2-101)
  let totalRecords = 0;
  let lateCount = 0;
  let earlyLeaveCount = 0;
  
  for (let userId = 2; userId <= 101; userId++) {
    const employeeType = getEmployeeType(userId);
    
    // Tỷ lệ vắng mặt dựa trên loại nhân viên
    let absentRate = 0.03; // 3% default
    if (employeeType === 'often_late') absentRate = 0.08; // 8% cho người hay trễ
    else if (employeeType === 'punctual') absentRate = 0.01; // 1% cho người đúng giờ
    
    for (const day of workingDays) {
      const date = new Date(2025, 9, day);
      
      // Random xem có vắng mặt không
      if (Math.random() < absentRate) {
        continue; // Skip ngày này (vắng mặt)
      }

      const checkIn = randomCheckIn(day, employeeType);
      const checkOut = randomCheckOut(day, employeeType, checkIn);
      const workHours = calculateWorkHours(checkIn, checkOut);
      const lateMinutes = calculateLateMinutes(checkIn);
      const earlyMinutes = calculateEarlyMinutes(checkOut);

      if (lateMinutes > 0) lateCount++;
      if (earlyMinutes > 0) earlyLeaveCount++;

      attendances.push({
        userId: userId,
        date: date,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        dailyTotalWorkHours: workHours,
        lateMinutes: lateMinutes,
        earlyDepartureMinutes: earlyMinutes,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      totalRecords++;
    }
  }

  // Insert theo batch để tránh quá tải
  const batchSize = 500;
  for (let i = 0; i < attendances.length; i += batchSize) {
    const batch = attendances.slice(i, i + batchSize);
    await knex('time_attendances').insert(batch);
  }

  console.log(`   ✅ Created ${totalRecords} attendance records`);
  console.log(`   📊 Statistics:`);
  console.log(`      - Late arrivals: ${lateCount} times`);
  console.log(`      - Early departures: ${earlyLeaveCount} times`);
  console.log(`      - Average attendance: ${(totalRecords / 100).toFixed(1)} days/employee`);
  console.log(`\n✅ October 2025 seed completed!\n`);
};

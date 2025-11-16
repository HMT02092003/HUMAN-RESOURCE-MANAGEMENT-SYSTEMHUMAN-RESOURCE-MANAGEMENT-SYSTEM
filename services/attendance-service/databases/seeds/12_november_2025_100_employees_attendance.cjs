/**
 * Seed file: Time Attendances for November 2025 (100 Employees)
 * Tạo dữ liệu chấm công cho tháng 11/2025 cho 100 nhân viên
 * CHỈ TẠO ĐẾN NGÀY 15/11/2025 (hôm nay)
 */

exports.seed = async function(knex) {
  console.log('\n📅 Seeding November 2025 attendance data (up to Nov 15)...\n');
  
  // Xóa dữ liệu chấm công tháng 11/2025
  await knex('time_attendances')
    .whereBetween('date', ['2025-11-01', '2025-11-30'])
    .del();

  const attendances = [];
  
  // Danh sách ngày làm việc trong tháng 11/2025 (CHỈ ĐẾN 15/11)
  const workingDays = [];
  const today = 15; // Ngày hiện tại
  
  for (let day = 1; day <= today; day++) {
    const date = new Date(2025, 10, day); // Month 10 = November
    const dayOfWeek = date.getDay();
    // 0 = Chủ nhật, 6 = Thứ 7
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(day);
    }
  }

  console.log(`   Working days in November (until today): ${workingDays.length} days`);

  // Hàm random thời gian check-in với phân phối realistic
  const randomCheckIn = (day, employeeType) => {
    let baseHour = 7;
    let randomMinutes = 0;
    
    if (employeeType === 'punctual') {
      // Nhân viên đúng giờ: 7:30-8:25
      randomMinutes = 30 + Math.floor(Math.random() * 55);
    } else if (employeeType === 'often_late') {
      // Nhân viên hay trễ: 8:35-9:20
      randomMinutes = 95 + Math.floor(Math.random() * 45);
    } else {
      // Nhân viên trung bình: 8:10-8:50
      randomMinutes = 70 + Math.floor(Math.random() * 40);
    }
    
    const hour = baseHour + Math.floor(randomMinutes / 60);
    const minute = randomMinutes % 60;
    return new Date(2025, 10, day, hour, minute, Math.floor(Math.random() * 60));
  };

  // Hàm random thời gian check-out
  const randomCheckOut = (day, employeeType, checkIn) => {
    let baseHour = 17;
    let randomMinutes = 0;
    
    if (employeeType === 'punctual') {
      // Nhân viên chăm chỉ: 17:30-18:30
      randomMinutes = 30 + Math.floor(Math.random() * 60);
    } else if (employeeType === 'often_late') {
      // Nhân viên hay về sớm: 17:00-17:20
      randomMinutes = Math.floor(Math.random() * 20);
    } else {
      // Trung bình: 17:15-18:00
      randomMinutes = 15 + Math.floor(Math.random() * 45);
    }
    
    const hour = baseHour + Math.floor(randomMinutes / 60);
    const minute = randomMinutes % 60;
    const checkOut = new Date(2025, 10, day, hour, minute, Math.floor(Math.random() * 60));
    
    // Đảm bảo check-out sau check-in ít nhất 7 giờ
    const minCheckOut = new Date(checkIn.getTime() + 7 * 60 * 60 * 1000);
    return checkOut > minCheckOut ? checkOut : minCheckOut;
  };

  // Tính số giờ làm việc (trừ 1 giờ nghỉ trưa) - Chuẩn 09:00-18:00
  const calculateWorkHours = (checkIn, checkOut) => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    
    // Lunch period: 12:00-13:00
    const lunchStart = new Date(ci);
    lunchStart.setHours(12, 0, 0, 0);
    const lunchEnd = new Date(ci);
    lunchEnd.setHours(13, 0, 0, 0);

    // Total minutes worked
    const totalMinutes = (co - ci) / (1000 * 60);

    // Calculate lunch overlap
    const overlapStart = Math.max(ci.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(co.getTime(), lunchEnd.getTime());
    const lunchOverlapMinutes = overlapEnd > overlapStart ? (overlapEnd - overlapStart) / (1000 * 60) : 0;

    // Work hours = total - lunch overlap
    const workMinutes = Math.max(0, totalMinutes - lunchOverlapMinutes);
    return Math.round((workMinutes / 60) * 100) / 100;
  };

  // Tính số phút đi trễ (chuẩn là 09:00)
  const calculateLateMinutes = (checkIn) => {
    const ci = new Date(checkIn);
    const standard = new Date(ci);
    standard.setHours(9, 0, 0, 0);
    
    return ci > standard ? Math.floor((ci - standard) / (1000 * 60)) : 0;
  };

  // Tính số phút về sớm (chuẩn là 18:00)
  const calculateEarlyMinutes = (checkOut) => {
    const co = new Date(checkOut);
    const standard = new Date(co);
    standard.setHours(18, 0, 0, 0);
    
    return co < standard ? Math.floor((standard - co) / (1000 * 60)) : 0;
  };

  // Phân loại nhân viên (giống logic tháng 10)
  const getEmployeeType = (userId) => {
    const random = (userId * 7) % 100;
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
    let absentRate = 0.03;
    if (employeeType === 'often_late') absentRate = 0.08;
    else if (employeeType === 'punctual') absentRate = 0.01;
    
    for (const day of workingDays) {
      const date = new Date(2025, 10, day);
      
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
  console.log(`\n✅ November 2025 seed completed (up to Nov 14)!\n`);
};

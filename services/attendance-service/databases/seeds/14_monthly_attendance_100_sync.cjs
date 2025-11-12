/**
 * Seed file: Monthly Attendance Summaries for 100 Employees
 * Tạo bảng tổng kết chấm công tháng cho 100 nhân viên
 * Sync với userId từ 2-101 (auth-service)
 * Tạo dữ liệu cho 3 tháng gần nhất: 09/2024, 10/2024, 11/2024
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('monthly_attendances').del();

  const summaries = [];
  
  // Helper function để tạo dữ liệu random
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomDecimal = (min, max, decimals = 2) => 
    (Math.random() * (max - min) + min).toFixed(decimals);

  // Tạo cho 3 tháng: 09/2024, 10/2024, 11/2024
  const months = ['2024-09', '2024-10', '2024-11'];
  
  // userId từ 2-101 (100 users)
  for (let userId = 2; userId <= 101; userId++) {
    for (const month of months) {
      const totalScheduledDays = month === '2024-11' ? 20 : 22; // Tháng 11 giả sử 20 ngày làm việc
      const presentDays = randomInt(18, totalScheduledDays);
      const approvedLeaveDays = randomInt(0, 2);
      const absentDays = totalScheduledDays - presentDays - approvedLeaveDays;
      const unauthorizedAbsenceDays = absentDays > 0 ? randomInt(0, absentDays) : 0;
      
      const lateDays = randomInt(0, Math.min(3, presentDays));
      const earlyLeaveDays = randomInt(0, Math.min(2, presentDays));
      const totalLateMinutes = lateDays * randomInt(5, 30);
      const totalEarlyLeaveMinutes = earlyLeaveDays * randomInt(5, 25);
      
      const totalWorkHours = parseFloat(randomDecimal(presentDays * 7, presentDays * 9));
      const averageWorkHours = presentDays > 0 ? (totalWorkHours / presentDays).toFixed(2) : 0;
      const totalWorkingUnits = (totalWorkHours / 8).toFixed(2);
      
      const totalOvertimeHours = parseFloat(randomDecimal(0, 20));
      const totalOtWorkingUnits = (totalOvertimeHours / 8).toFixed(2);
      
      // Tính phạt (giả sử)
      const totalLatePenalty = totalLateMinutes * 1000; // 1000đ/phút
      const totalEarlyLeavePenalty = totalEarlyLeaveMinutes * 1000;
      const totalUnauthorizedAbsencePenalty = unauthorizedAbsenceDays * 200000; // 200k/ngày
      const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;
      
      // Lương OT giả sử 100k/giờ
      const totalOvertimeSalary = totalOvertimeHours * 100000;
      
      // Chỉ tháng 09 và 10 là đã approved
      const isApproved = month !== '2024-11';
      
      summaries.push({
        userId,
        month,
        totalScheduledDays,
        presentDays,
        absentDays,
        approvedLeaveDays,
        unauthorizedAbsenceDays,
        businessTripDays: randomInt(0, 1),
        lateDays,
        earlyLeaveDays,
        totalLateMinutes,
        totalEarlyLeaveMinutes,
        totalWorkHours,
        averageWorkHours,
        totalWorkingUnits,
        totalOvertimeHours,
        totalOtWorkingUnits,
        totalLatePenalty,
        totalEarlyLeavePenalty,
        totalUnauthorizedAbsencePenalty,
        totalPenalty,
        totalOvertimeSalary,
        isApproved,
        approvedBy: isApproved ? 1 : null, // Admin approved
        approvedAt: isApproved ? new Date(`${month}-28`) : null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // Insert summaries
  await knex('monthly_attendances').insert(summaries);
  
  console.log(`✅ Đã tạo ${summaries.length} bản tổng kết chấm công (100 users x 3 tháng)`);
};

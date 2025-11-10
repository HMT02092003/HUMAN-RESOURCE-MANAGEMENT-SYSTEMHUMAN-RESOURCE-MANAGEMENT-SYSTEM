/**
 * Seed file: Monthly Attendance Summary for November 2025 (100 Employees)
 * Tạo tổng hợp chấm công tháng 11/2025 cho 100 nhân viên
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu tháng 11/2025 (giữ lại các tháng khác)
  await knex('monthly_attendances')
    .where('month', '2025-11')
    .andWhere('userId', '>', 1)
    .del();

  const monthlySummaries = [];
  
  // Lấy dữ liệu chấm công từ time_attendances
  const attendances = await knex('time_attendances')
    .select('userId', 
      knex.raw(`COUNT(*) as present_days`),
      knex.raw(`SUM("dailyTotalWorkHours") as total_hours`),
      knex.raw(`SUM("lateMinutes") as total_late_minutes`),
      knex.raw(`SUM("earlyDepartureMinutes") as total_early_minutes`),
      knex.raw(`COUNT(CASE WHEN "lateMinutes" > 0 THEN 1 END) as late_days`),
      knex.raw(`COUNT(CASE WHEN "earlyDepartureMinutes" > 0 THEN 1 END) as early_days`)
    )
    .whereBetween('date', ['2025-11-01', '2025-11-30'])
    .andWhere('userId', '>', 1)
    .groupBy('userId');

  // Tính toán số ngày làm việc trong tháng 11/2025
  const workingDaysInMonth = [];
  for (let day = 1; day <= 30; day++) {
    const date = new Date(2025, 10, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysInMonth.push(day);
    }
  }
  const totalScheduledDays = workingDaysInMonth.length;

  // Lương cơ bản và hệ số tính phạt (giả định)
  const BASE_SALARY_PER_DAY = 500000; // 500k/ngày (trung bình)
  const LATE_PENALTY_PER_MINUTE = 5000; // 5k/phút
  const EARLY_LEAVE_PENALTY_PER_MINUTE = 5000; // 5k/phút
  const ABSENT_PENALTY_PER_DAY = BASE_SALARY_PER_DAY; // Phạt 1 ngày lương

  // Tạo tổng hợp cho tất cả 100 nhân viên
  for (let userId = 2; userId <= 101; userId++) {
    const userAttendance = attendances.find(a => a.userId === userId);
    
    const presentDays = userAttendance ? parseInt(userAttendance.present_days) : 0;
    const totalHours = userAttendance ? parseFloat(userAttendance.total_hours) || 0 : 0;
    const totalLateMinutes = userAttendance ? parseInt(userAttendance.total_late_minutes) || 0 : 0;
    const totalEarlyMinutes = userAttendance ? parseInt(userAttendance.total_early_minutes) || 0 : 0;
    const lateDays = userAttendance ? parseInt(userAttendance.late_days) || 0 : 0;
    const earlyDays = userAttendance ? parseInt(userAttendance.early_days) || 0 : 0;
    
    const absentDays = totalScheduledDays - presentDays;
    const averageWorkHours = presentDays > 0 ? (totalHours / presentDays).toFixed(2) : 0;
    
    // Tính công (1 công = 8 giờ)
    const totalWorkingUnits = (totalHours / 8).toFixed(2);
    
    // Tính phạt
    const totalLatePenalty = totalLateMinutes * LATE_PENALTY_PER_MINUTE;
    const totalEarlyLeavePenalty = totalEarlyMinutes * EARLY_LEAVE_PENALTY_PER_MINUTE;
    const totalUnauthorizedAbsencePenalty = absentDays * ABSENT_PENALTY_PER_DAY;
    const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;

    monthlySummaries.push({
      userId: userId,
      month: '2025-11',
      totalScheduledDays: totalScheduledDays,
      presentDays: presentDays,
      absentDays: absentDays,
      approvedLeaveDays: 0, // Chưa có dữ liệu nghỉ phép
      unauthorizedAbsenceDays: absentDays,
      businessTripDays: 0,
      lateDays: lateDays,
      earlyLeaveDays: earlyDays,
      totalLateMinutes: totalLateMinutes,
      totalEarlyLeaveMinutes: totalEarlyMinutes,
      totalWorkHours: totalHours.toFixed(2),
      averageWorkHours: averageWorkHours,
      totalWorkingUnits: totalWorkingUnits,
      totalOvertimeHours: 0, // Chưa tính OT
      totalOtWorkingUnits: 0,
      totalLatePenalty: totalLatePenalty,
      totalEarlyLeavePenalty: totalEarlyLeavePenalty,
      totalUnauthorizedAbsencePenalty: totalUnauthorizedAbsencePenalty,
      totalPenalty: totalPenalty,
      totalOvertimeSalary: 0,
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      notes: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert tất cả monthly summaries
  await knex('monthly_attendances').insert(monthlySummaries);
  
  // Reset sequence
  await knex.raw("SELECT setval('monthly_attendances_id_seq', (SELECT MAX(id) FROM monthly_attendances))");
  
  console.log(`✅ Đã tạo ${monthlySummaries.length} tổng hợp chấm công tháng 11/2025`);
  console.log(`   - Tổng số ngày làm việc: ${totalScheduledDays} ngày`);
  console.log(`   - Số nhân viên: 100 người`);
};

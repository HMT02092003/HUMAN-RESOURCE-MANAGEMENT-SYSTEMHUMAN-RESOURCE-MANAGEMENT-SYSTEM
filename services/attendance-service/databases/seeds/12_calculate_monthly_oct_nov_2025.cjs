/**
 * SEED: Calculate Monthly Attendance for Oct & Nov 2025
 * Tính toán monthly_attendances dựa trên time_attendances đã tạo
 */

exports.seed = async function(knex) {
  console.log('\n📊 Calculating Monthly Attendance for Oct & Nov 2025...\n');
  
  // Delete existing monthly records for Oct & Nov 2025
  await knex('monthly_attendances')
    .where('month', '>=', '2025-10')
    .where('month', '<=', '2025-11')
    .del();

  const monthlyRecords = [];
  const userIds = Array.from({ length: 100 }, (_, i) => i + 2); // Users 2-101
  const months = [
    { start: '2025-10-01', end: '2025-10-31' },
    { start: '2025-11-01', end: '2025-11-30' }
  ];

  for (const { start, end } of months) {
    const [year, month] = start.split('-');
    console.log(`   📅 Processing ${year}-${month}...`);

    for (const userId of userIds) {
      // Lấy tất cả attendance records của user trong tháng
      const attendances = await knex('time_attendances')
        .where('userId', userId)
        .where('date', '>=', start)
        .where('date', '<=', end)
        .select('*');

      if (attendances.length === 0) continue;

  // Tính toán các chỉ số (map sang schema migration -> snake_case)
  let totalWorkDays = 0; // tổng ngày trong phạm vi (theo attendance records)
  let totalActualWorkDays = 0; // presentDays
  let totalLateCount = 0; // lateDays
  let totalEarlyLeaveCount = 0; // earlyLeaveDays
  let totalAbsentDays = 0; // absentDays / unauthorizedAbsenceDays
  let totalLatePenalty = 0; // totalLatePenalty
  let totalEarlyLeavePenalty = 0; // totalEarlyLeavePenalty
  let totalAbsentPenalty = 0; // totalUnauthorizedAbsencePenalty
  let totalOvertimePay = 0; // totalOvertimeSalary
  let totalWorkMinutes = 0; // used to compute totalWorkHours
  let totalOvertimeMinutes = 0; // used to compute totalOvertimeHours
  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;

      for (const att of attendances) {
        totalWorkDays++;
        
        if (att.checkInTime && att.checkOutTime) {
          totalActualWorkDays++;
        }

        if (att.lateMinutes > 0) {
          totalLateCount++;
          totalLatePenalty += Number(att.latePenalty) || 0;
          totalLateMinutes += Number(att.lateMinutes) || 0;
        }

        if (att.earlyLeaveMinutes > 0) {
          totalEarlyLeaveCount++;
          totalEarlyLeavePenalty += Number(att.earlyLeavePenalty) || 0;
          totalEarlyLeaveMinutes += Number(att.earlyLeaveMinutes) || 0;
        }

        if (att.attendanceStatus === 'absent') {
          totalAbsentDays++;
          totalAbsentPenalty += Number(att.unauthorizedAbsencePenalty) || 0;
        }

        totalWorkMinutes += Number(att.workMinutes) || 0;
        totalOvertimeMinutes += Number(att.overtimeMinutes) || 0;
        totalOvertimePay += Number(att.overtimePay) || 0;
      }

      const totalWorkHours = Math.round((totalWorkMinutes / 60) * 100) / 100;
      const totalOvertimeHours = Math.round((totalOvertimeMinutes / 60) * 100) / 100;
      const totalPenalties = totalLatePenalty + totalEarlyLeavePenalty + totalAbsentPenalty;

      // Map các giá trị sang tên cột theo migration (snake_case)
      monthlyRecords.push({
        userId: userId,
        month: `${year}-${month}`,
        totalScheduledDays: totalWorkDays,
        presentDays: totalActualWorkDays,
        absentDays: totalAbsentDays,
        approvedLeaveDays: 0,
        unauthorizedAbsenceDays: totalAbsentDays,
        businessTripDays: 0,

        lateDays: totalLateCount,
        earlyLeaveDays: totalEarlyLeaveCount,
        totalLateMinutes: totalLateMinutes,
        totalEarlyLeaveMinutes: totalEarlyLeaveMinutes,

        totalWorkHours: totalWorkHours,
        averageWorkHours: totalWorkDays > 0 ? Math.round((totalWorkHours / totalWorkDays) * 100) / 100 : 0,
        totalWorkingUnits: Math.round((totalWorkHours / 8) * 100) / 100,

        totalOvertimeHours: totalOvertimeHours,
        totalOtWorkingUnits: Math.round((totalOvertimeHours / 8) * 100) / 100,

        totalLatePenalty: totalLatePenalty,
        totalEarlyLeavePenalty: totalEarlyLeavePenalty,
        totalUnauthorizedAbsencePenalty: totalAbsentPenalty,
        totalPenalty: totalPenalties,
        totalOvertimeSalary: totalOvertimePay,

        isApproved: false,
        approvedBy: null,
        approvedAt: null,
        notes: null,

        created_at: new Date(),
        updated_at: new Date()
      });
    }

    console.log(`   ✅ Processed ${userIds.length} users for ${year}-${month}`);
  }

  await knex('monthly_attendances').insert(monthlyRecords);
  
  // Hiển thị statistics
  const stats = await knex('monthly_attendances')
    .where('month', '>=', '2025-10')
    .where('month', '<=', '2025-11')
    .select(
      knex.raw('month'),
      knex.raw('SUM("totalPenalty") as total_penalties'),
      knex.raw('SUM("totalOvertimeSalary") as total_overtime_pay'),
      knex.raw('SUM("lateDays") as total_late'),
      knex.raw('SUM("absentDays") as total_absent')
    )
    .groupBy('month');

  console.log('\n📊 Monthly Statistics:');
  for (const stat of stats) {
    console.log(`   ${stat.month}:`);
    console.log(`      - Total penalties: ${Number(stat.total_penalties).toLocaleString('vi-VN')} VND`);
    console.log(`      - Total OT pay: ${Number(stat.total_overtime_pay).toLocaleString('vi-VN')} VND`);
    console.log(`      - Total late: ${stat.total_late}`);
    console.log(`      - Total absent: ${stat.total_absent}`);
  }

  console.log(`\n✅ Monthly calculation completed! Total: ${monthlyRecords.length} records\n`);
};

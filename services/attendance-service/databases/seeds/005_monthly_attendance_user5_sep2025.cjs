/**
 * Seed: monthly_attendances - User 5 - September 2025
 * Inserts a monthly summary row computed from provided daily data.
 */

exports.seed = async function(knex) {
  // Remove existing monthly summary for user 5 / 2025-09 if any
  await knex('monthly_attendances')
    .where({ userId: 5, month: '2025-09' })
    .del();

  // Provided aggregate values
  const provided = {
    totalDays: 19,
    presentDays: 18,
    absentDays: 3,
    lateDays: 7,
    earlyLeaveDays: 3,
    totalHours: 154.17,
    averageHours: 8.565,
    overtimeHours: 7.5,
    totalLatePenalty: 292500,
    totalEarlyLeavePenalty: 202500,
    totalPenalty: 1245000,
    totalOvertimePay: 811298,
    totalLateMinutes: 195,
    totalEarlyLeaveMinutes: 135,
    unauthorizedAbsenceDays: 1,
    totalUnauthorizedAbsencePenalty: 750000,
    approvedLeaveDays: 1,
    businessTripDays: 2
  };

  // Compute remaining fields to match migration schema
  // Map names: totalDays -> totalScheduledDays, totalHours -> totalWorkHours, averageHours -> averageWorkHours,
  // overtimeHours -> totalOvertimeHours, totalOvertimePay -> totalOvertimeSalary, totalLateMinutes/totalEarlyLeaveMinutes -> totals

  const record = {
    userId: 5,
    month: '2025-09',

    totalScheduledDays: provided.totalDays,
    presentDays: provided.presentDays,
    absentDays: provided.absentDays,
    approvedLeaveDays: provided.approvedLeaveDays,
    unauthorizedAbsenceDays: provided.unauthorizedAbsenceDays,
    businessTripDays: provided.businessTripDays,

    lateDays: provided.lateDays,
    earlyLeaveDays: provided.earlyLeaveDays,
    totalLateMinutes: provided.totalLateMinutes,
    totalEarlyLeaveMinutes: provided.totalEarlyLeaveMinutes,

    totalWorkHours: provided.totalHours,
    averageWorkHours: provided.averageHours,
    // Working units: assume 1 working unit = 8 hours
    totalWorkingUnits: parseFloat((provided.totalHours / 8).toFixed(2)),

    totalOvertimeHours: provided.overtimeHours,
    totalOtWorkingUnits: parseFloat((provided.overtimeHours / 8).toFixed(2)),

    totalLatePenalty: provided.totalLatePenalty,
    totalEarlyLeavePenalty: provided.totalEarlyLeavePenalty,
    totalUnauthorizedAbsencePenalty: provided.totalUnauthorizedAbsencePenalty,
    totalPenalty: provided.totalPenalty,
    totalOvertimeSalary: provided.totalOvertimePay,

    isApproved: false,
    approvedBy: null,
    approvedAt: null,
    notes: 'Seeded from provided monthlyStats and dailyData JSON',

    created_at: new Date(),
    updated_at: new Date()
  };

  await knex('monthly_attendances').insert(record);
  console.log('✅ Seeded monthly_attendances for userId=5 month=2025-09');
};

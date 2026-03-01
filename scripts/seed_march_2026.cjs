/**
 * Seed script: Generate SQL INSERT statements for March 2026 data
 * - time_attendances: daily records for March 2-6, 2026 (Mon-Fri) for users 2-100
 * - monthly_attendances: monthly summary for March 2026 for users 1-100
 * - monthly_payslips: salary data for March 2026 for users 2-100
 *
 * Usage: node scripts/seed_march_2026.js > scripts/seed_march_2026.sql
 */

// Employee salary profiles (user_id -> base_salary in VND)
const salaryProfiles = {
  2: 50000000, 3: 25000000, 4: 45000000, 5: 30000000,
  6: 28000000, 7: 28000000, 8: 25000000, 9: 20000000,
  10: 18000000, 11: 18000000, 12: 18000000, 13: 15000000,
  14: 15000000, 15: 15000000, 16: 15000000, 17: 15000000,
  18: 15000000, 19: 15000000, 20: 15000000,
  21: 12000000, 22: 12000000, 23: 12000000, 24: 12000000,
  25: 12000000, 26: 12000000, 27: 12000000, 28: 12000000,
  29: 12000000, 30: 12000000, 31: 12000000,
  32: 9000000, 33: 9000000, 34: 9000000, 35: 9000000,
  36: 9000000, 37: 9000000,
  38: 22000000, 39: 18000000, 40: 16000000, 41: 16000000,
  42: 16000000, 43: 13000000, 44: 13000000, 45: 13000000,
  46: 13000000, 47: 13000000, 48: 13000000, 49: 13000000,
  50: 13000000,
  51: 11000000, 52: 11000000, 53: 11000000, 54: 11000000,
  55: 11000000, 56: 11000000, 57: 11000000, 58: 11000000,
  59: 11000000, 60: 11000000, 61: 11000000, 62: 11000000,
  63: 8000000, 64: 8000000, 65: 8000000, 66: 8000000, 67: 8000000,
  68: 20000000, 69: 17000000, 70: 15000000, 71: 15000000,
  72: 12000000, 73: 12000000, 74: 12000000, 75: 12000000,
  76: 10000000, 77: 10000000, 78: 10000000, 79: 10000000,
  80: 10000000, 81: 10000000, 82: 10000000,
  83: 21000000, 84: 17000000, 85: 15000000, 86: 15000000,
  87: 12000000, 88: 12000000, 89: 12000000,
  90: 10000000, 91: 10000000, 92: 10000000, 93: 10000000,
  94: 8000000, 95: 8000000,
  96: 22000000, 97: 18000000, 98: 16000000, 99: 13000000, 100: 13000000,
};

// March 2026 working days: March 2 (Mon) to March 6 (Fri) = 5 days
// March 1, 2026 is a Sunday
// Total scheduled working days in March 2026: 22 (Mon-Fri)
const WORKING_DATES = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'];
const TOTAL_SCHEDULED_DAYS = 22;
const STANDARD_CHECK_IN_HOUR = 1; // UTC hour (= 8:00 Vietnam time, UTC+7)
const STANDARD_CHECK_OUT_HOUR = 10; // UTC hour (= 17:00 Vietnam time)
const LATE_PENALTY_PER_MIN = 2500; // VND per minute
const EARLY_LEAVE_PENALTY_PER_MIN = 2500; // VND per minute

// Seeded random number generator for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randomInt(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function generateTimeAttendances() {
  const lines = [];
  let idCounter = 200000; // Start from a high ID to avoid conflicts

  for (const userId of Object.keys(salaryProfiles).map(Number)) {
    for (const dateStr of WORKING_DATES) {
      idCounter++;

      // Randomize check-in: 7:45-8:20 Vietnam time = 0:45-1:20 UTC
      const checkInMinOffset = randomInt(-15, 20); // minutes relative to 8:00 VN
      const checkInHour = STANDARD_CHECK_IN_HOUR;
      const checkInMin = checkInMinOffset >= 0 ? checkInMinOffset : 60 + checkInMinOffset;
      const checkInHourAdjusted = checkInMinOffset >= 0 ? checkInHour : checkInHour - 1;
      const checkInTime = `${dateStr} ${pad(checkInHourAdjusted)}:${pad(checkInMin)}:00+00`;

      // Randomize check-out: 17:00-17:30 Vietnam time = 10:00-10:30 UTC
      const checkOutMinOffset = randomInt(0, 30);
      const checkOutHour = STANDARD_CHECK_OUT_HOUR;
      const checkOutMin = checkOutMinOffset;
      const checkOutTime = `${dateStr} ${pad(checkOutHour)}:${pad(checkOutMin)}:00+00`;

      // Calculate late minutes (if check-in after 8:00 VN = 1:00 UTC)
      const lateMinutes = checkInMinOffset > 0 ? checkInMinOffset : 0;

      // Calculate early departure (if check-out before 17:00 VN = 10:00 UTC) - unlikely with our range
      const earlyDepartureMinutes = 0;

      // Calculate total work hours (lunch break 12:00-13:00 VN = 1 hour deducted)
      const totalCheckInMinutes = checkInHourAdjusted * 60 + checkInMin;
      const totalCheckOutMinutes = checkOutHour * 60 + checkOutMin;
      const rawWorkMinutes = totalCheckOutMinutes - totalCheckInMinutes;
      const workHours = Math.max(0, (rawWorkMinutes - 60) / 60); // subtract 1 hour lunch

      // Working unit = 1.0 for a normal day
      const dailyWorkingUnit = 1.0;
      const totalWorkingUnit = 1.0;
      const otWorkingUnit = 0.0;
      const overtimeHours = 0.0;

      // Penalties
      const lateArrivalPenalty = lateMinutes * LATE_PENALTY_PER_MIN;
      const earlyLeavePenalty = earlyDepartureMinutes * EARLY_LEAVE_PENALTY_PER_MIN;

      const now = '2026-03-07 00:00:00+00';

      lines.push(
        `INSERT INTO time_attendances (id, "userId", date, "checkInTime", "checkOutTime", created_at, updated_at, "dailyTotalWorkHours", "lateMinutes", "earlyDepartureMinutes", "dailyWorkingUnit", "earlyLeavePenalty", "lateArrivalPenalty", "totalWorkingUnit", "otWorkingUnit", "overtimeHours") VALUES (${idCounter}, ${userId}, '${dateStr}', '${checkInTime}', '${checkOutTime}', '${now}', '${now}', ${workHours.toFixed(2)}, ${lateMinutes.toFixed(2)}, ${earlyDepartureMinutes.toFixed(2)}, ${dailyWorkingUnit.toFixed(2)}, ${earlyLeavePenalty.toFixed(2)}, ${lateArrivalPenalty.toFixed(2)}, ${totalWorkingUnit.toFixed(4)}, ${otWorkingUnit.toFixed(4)}, ${overtimeHours.toFixed(2)});`
      );
    }
  }

  return lines;
}

function generateMonthlyAttendances() {
  const lines = [];
  let idCounter = 20000; // Start from a high ID to avoid conflicts
  const presentDays = WORKING_DATES.length; // 5 days present (March 2-6)
  const now = '2026-03-07 00:00:00+00';

  // Include user 1 (admin) too
  const allUsers = [1, ...Object.keys(salaryProfiles).map(Number)];

  for (const userId of allUsers) {
    idCounter++;

    // For users with attendance data (2-100), calculate from their daily records
    const totalLateMinutes = userId === 1 ? 0 : randomInt(0, 40);
    const totalEarlyLeaveMinutes = 0;
    const lateDays = totalLateMinutes > 0 ? randomInt(1, Math.min(3, presentDays)) : 0;
    const totalWorkHours = presentDays * 8 - totalLateMinutes / 60;
    const avgWorkHours = presentDays > 0 ? totalWorkHours / presentDays : 0;
    const totalWorkingUnits = presentDays * 1.0;
    const totalOvertimeHours = 0;
    const totalOtWorkingUnits = 0;
    const totalLatePenalty = totalLateMinutes * LATE_PENALTY_PER_MIN;
    const totalEarlyLeavePenalty = 0;
    const totalUnauthorizedAbsencePenalty = 0;
    const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;

    lines.push(
      `INSERT INTO monthly_attendances (id, "userId", month, "totalScheduledDays", "presentDays", "absentDays", "approvedLeaveDays", "unauthorizedAbsenceDays", "businessTripDays", "lateDays", "earlyLeaveDays", "totalLateMinutes", "totalEarlyLeaveMinutes", "totalWorkHours", "averageWorkHours", "totalWorkingUnits", "totalOvertimeHours", "totalOtWorkingUnits", "totalLatePenalty", "totalEarlyLeavePenalty", "totalUnauthorizedAbsencePenalty", "totalPenalty", "isApproved", "approvedBy", "approvedAt", notes, created_at, updated_at) VALUES (${idCounter}, ${userId}, '2026-03', ${TOTAL_SCHEDULED_DAYS}, ${presentDays}, 0, 0, 0, 0, ${lateDays}, 0, ${totalLateMinutes}, ${totalEarlyLeaveMinutes}, ${totalWorkHours.toFixed(2)}, ${avgWorkHours.toFixed(2)}, ${totalWorkingUnits.toFixed(2)}, ${totalOvertimeHours.toFixed(2)}, ${totalOtWorkingUnits.toFixed(2)}, ${totalLatePenalty.toFixed(2)}, ${totalEarlyLeavePenalty.toFixed(2)}, ${totalUnauthorizedAbsencePenalty.toFixed(2)}, ${totalPenalty.toFixed(2)}, false, NULL, NULL, NULL, '${now}', '${now}');`
    );
  }

  return lines;
}

function generateMonthlyPayslips() {
  const lines = [];
  let idCounter = 10000; // Start from a high ID to avoid conflicts
  const now = '2026-03-07 00:00:00+00';
  const presentDays = WORKING_DATES.length;

  for (const [userIdStr, baseSalary] of Object.entries(salaryProfiles)) {
    idCounter++;
    const userId = userIdStr; // TEXT type in DB

    // Calculate salary based on attendance
    const salaryPerUnit = baseSalary / TOTAL_SCHEDULED_DAYS;
    const totalWorkingUnits = presentDays * 1.0;
    const totalOtWorkingUnits = 0;
    const salaryFromUnits = salaryPerUnit * totalWorkingUnits;

    const allowances = 0;
    const overtimePay = 0;
    const grossSalary = salaryFromUnits + allowances + overtimePay;

    // Deductions
    const socialInsurance = baseSalary * 0.08; // 8% BHXH
    const healthInsurance = baseSalary * 0.015; // 1.5% BHYT
    const personalIncomeTax = baseSalary * 0.01; // 1% TNCN estimate
    const totalDeductions = socialInsurance + healthInsurance + personalIncomeTax;

    // Penalties (random small amount)
    const penaltyTotal = randomInt(0, 5) * LATE_PENALTY_PER_MIN;

    const netSalary = grossSalary - totalDeductions - penaltyTotal;

    lines.push(
      `INSERT INTO monthly_payslips (id, user_id, year, month, base_salary, allowances, overtime_pay, gross_salary, social_insurance, health_insurance, personal_income_tax, total_deductions, penalty_total, net_salary, status, notes, created_at, updated_at, total_working_units, total_ot_working_units, standard_working_days, salary_per_unit, salary_from_units) VALUES (${idCounter}, '${userId}', 2026, 3, ${baseSalary.toFixed(2)}, ${allowances.toFixed(2)}, ${overtimePay.toFixed(2)}, ${grossSalary.toFixed(2)}, ${socialInsurance.toFixed(2)}, ${healthInsurance.toFixed(2)}, ${personalIncomeTax.toFixed(2)}, ${totalDeductions.toFixed(2)}, ${penaltyTotal.toFixed(2)}, ${netSalary.toFixed(2)}, 1, 'Tính lương tháng 3/2026', '${now}', '${now}', ${totalWorkingUnits.toFixed(4)}, ${totalOtWorkingUnits.toFixed(4)}, ${TOTAL_SCHEDULED_DAYS}.00, ${salaryPerUnit.toFixed(2)}, ${salaryFromUnits.toFixed(2)});`
    );
  }

  return lines;
}

// Generate all SQL
console.log('-- ============================================');
console.log('-- Seed data for March 2026 (March 2-6 working days)');
console.log('-- Generated at:', new Date().toISOString());
console.log('-- ============================================');
console.log('');

console.log('-- ============================================');
console.log('-- 1. Daily attendance records (time_attendances)');
console.log('-- Users 2-100, dates: March 2-6, 2026');
console.log('-- ============================================');
console.log('');
const timeAttendances = generateTimeAttendances();
timeAttendances.forEach(l => console.log(l));

console.log('');
console.log('-- ============================================');
console.log('-- 2. Monthly attendance summary (monthly_attendances)');
console.log('-- Users 1-100, month: 2026-03');
console.log('-- ============================================');
console.log('');
const monthlyAttendances = generateMonthlyAttendances();
monthlyAttendances.forEach(l => console.log(l));

console.log('');
console.log('-- ============================================');
console.log('-- 3. Monthly payslips (monthly_payslips)');
console.log('-- Users 2-100, month: 3/2026');
console.log('-- ============================================');
console.log('');
const monthlyPayslips = generateMonthlyPayslips();
monthlyPayslips.forEach(l => console.log(l));

console.log('');
console.log('-- ============================================');
console.log(`-- Total records: ${timeAttendances.length} time_attendances + ${monthlyAttendances.length} monthly_attendances + ${monthlyPayslips.length} monthly_payslips`);
console.log('-- ============================================');

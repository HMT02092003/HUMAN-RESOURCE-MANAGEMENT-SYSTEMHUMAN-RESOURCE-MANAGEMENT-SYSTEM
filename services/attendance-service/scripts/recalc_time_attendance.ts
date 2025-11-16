import dayjs from 'dayjs';
import 'dayjs/plugin/utc';
import 'dayjs/plugin/timezone';
import { AttendanceCalculationService } from '../src/services/attendance/AttendanceCalculationService';
import TimeAttendanceModel from '../src/Models/TimeAttendanceModel';

(async () => {
  try {
    console.log('🔁 Recalculating time_attendances for November 2025 and updating rows...');
    const start = '2025-11-01';
    const end = '2025-11-30';

    const rows = await TimeAttendanceModel.query().whereBetween('date', [start, end]).orderBy('date', 'asc');
    console.log(`🔍 Found ${rows.length} records to recalc`);

    let count = 0;
    for (const r of rows) {
      try {
        const calc = await AttendanceCalculationService.calculateAttendance(
          r.checkInTime || null,
          r.checkOutTime || null,
          dayjs(r.date).format('YYYY-MM-DD'),
          r.userId,
          undefined,
          undefined
        );

        const dailyWorkingUnit = (calc.standardHours > 0) ? Math.min(1, calc.workHours / calc.standardHours) : 0;

        await TimeAttendanceModel.query().patchAndFetchById(r.id, {
          dailyTotalWorkHours: calc.workHours,
          dailyWorkingUnit,
          lateMinutes: calc.lateMinutes,
          earlyDepartureMinutes: calc.earlyDepartureMinutes,
          lateArrivalPenalty: calc.latePenaltyAmount ?? 0,
          earlyLeavePenalty: calc.earlyLeavePenaltyAmount ?? 0,
          otMinutes: calc.otMinutes ?? 0,
          otSalary: calc.otSalary ?? 0
        });

        count++;
        if (count % 100 === 0) console.log(`✅ Updated ${count} rows...`);
      } catch (e) {
        console.error('⚠️ Failed to recalc row id=', r.id, e);
      }
    }

    console.log(`🎉 Recalculation finished. Updated ${count} rows.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during recalculation:', err);
    process.exit(1);
  }
})();

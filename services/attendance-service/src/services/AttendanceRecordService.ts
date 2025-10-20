import dayjs from 'dayjs';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import { getApprovedOvertimeApplication } from './AttendanceQueryService';
import AttendanceCalculationService from './AttendanceCalculationService';
import { MonthlyReportService } from './MonthlyReportService';

export async function recordAttendance(userId: number, time: string): Promise<any> {
  try {
    const date = dayjs(time).format('YYYY-MM-DD');

    const existingRecord = await TimeAttendanceModel.query().where('userId', userId).where('date', date).first();

    let record: any;
    let isCheckIn = false;

    if (!existingRecord || !existingRecord.checkInTime) {
      isCheckIn = true;
      const recordData = { userId, date, checkInTime: time };
      if (existingRecord) record = await TimeAttendanceModel.query().patchAndFetchById(existingRecord.id, recordData);
      else record = await TimeAttendanceModel.query().insert(recordData);
    } else {
      isCheckIn = false;
      record = await TimeAttendanceModel.query().patchAndFetchById(existingRecord.id, { checkOutTime: time });
    }

    const overtimeApp = await getApprovedOvertimeApplication(userId, date);
    let otEndTime: dayjs.Dayjs | null = null;
    if (overtimeApp) {
      const appData = typeof overtimeApp.data === 'string' ? JSON.parse(overtimeApp.data) : overtimeApp.data;
      if (appData.endTime) { otEndTime = dayjs(`${date} ${appData.endTime}`); }
    }

    const calculation = await AttendanceCalculationService.calculateAttendance(record.checkInTime, record.checkOutTime, date, userId, undefined, otEndTime ? otEndTime.toISOString() : undefined);

    const updatedRecord = await TimeAttendanceModel.query().patchAndFetchById(record.id, {
      dailyTotalWorkHours: calculation.workHours,
      dailyWorkingUnit: calculation.workHours,
      lateMinutes: calculation.lateMinutes,
      earlyDepartureMinutes: calculation.earlyDepartureMinutes,
      lateArrivalPenalty: calculation.latePenaltyAmount,
      earlyLeavePenalty: calculation.earlyLeavePenaltyAmount,
      otMinutes: calculation.otMinutes,
      otSalary: calculation.otSalary || 0
    });

    // ✨ --- Recalculate and upsert monthly summary for this user/month ---
    try {
      console.log(`🔄 [attendance] Triggering monthly calculation after attendance record...`);
      const result = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, date);
      console.log(`✅ [attendance] Monthly calculation result:`, result);
    } catch (monthlyErr: any) {
      console.error(`❌ [attendance] Failed to update monthly summary:`, monthlyErr);
      // Don't fail the whole operation if monthly update fails
    }

    return { type: isCheckIn ? 'check_in' : 'check_out', record: updatedRecord, calculation, hasOvertimeApproval: !!overtimeApp };
  } catch (error) {
    console.error('Error in recordAttendance:', error);
    throw error;
  }
}
    
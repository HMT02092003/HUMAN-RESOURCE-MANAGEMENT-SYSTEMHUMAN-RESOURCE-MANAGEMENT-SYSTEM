// (Xử lý ghi nhận chấm công: check-in, check-out, cập nhật bản ghi.)

import dayjs from 'dayjs';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import AttendanceCalculationService from './AttendanceCalculationService';
// Sử dụng phương thức static từ class
// import { getApprovedOvertimeApplication } from './AttendanceCalculationService';
// Thay thế bằng gọi trực tiếp từ class
import { MonthlyReportService } from '../MonthlyReportService';

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

    // Sửa lại gọi hàm từ class
    const overtimeApp = await AttendanceCalculationService.getApprovedOvertimeApplication(userId, date);
    let otEndTime: dayjs.Dayjs | null = null;
    if (overtimeApp) {
      const appData = typeof overtimeApp.data === 'string' ? JSON.parse(overtimeApp.data) : overtimeApp.data;
      if (appData.endTime) { otEndTime = dayjs(`${date} ${appData.endTime}`); }
    }


    const calculation = await AttendanceCalculationService.calculateAttendance(record.checkInTime, record.checkOutTime, date, userId, undefined, otEndTime ? otEndTime.toISOString() : undefined);

    // Calculate dailyWorkingUnit: min(1, workHours / standardHours)
    let dailyWorkingUnit = 0;
    if (calculation.standardHours > 0) {
      dailyWorkingUnit = Math.min(1, calculation.workHours / calculation.standardHours);
    }

    const updatedRecord = await TimeAttendanceModel.query().patchAndFetchById(record.id, {
      dailyTotalWorkHours: calculation.workHours,
      dailyWorkingUnit,
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
    
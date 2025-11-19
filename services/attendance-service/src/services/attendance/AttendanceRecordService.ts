// (Xử lý ghi nhận chấm công: check-in, check-out, cập nhật bản ghi.)

import dayjs from 'dayjs';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import AttendanceCalculationService from './AttendanceCalculationService';
import { MonthlyReportService } from '../MonthlyReportService';
import { getShiftForUserAndDate } from './ShiftHelper';

export async function recordAttendance(userId: number, time: string, token?: string): Promise<any> {
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

    // ✨ Lấy shift cho user vào ngày này (đã đăng ký hoặc mặc định)
    const shift = await getShiftForUserAndDate(userId, date);
    console.log(`📋 Shift cho user ${userId} ngày ${date}:`, shift);

    // Lấy thông tin OT đã duyệt
    const overtimeApp = await AttendanceCalculationService.getApprovedOvertimeApplication(userId, date);
    let otEndTime: dayjs.Dayjs | null = null;
    if (overtimeApp) {
      const appData = typeof overtimeApp.data === 'string' ? JSON.parse(overtimeApp.data) : overtimeApp.data;
      if (appData.endTime) { otEndTime = dayjs(`${date} ${appData.endTime}`); }
    }

    // ✨ Truyền shift vào calculateAttendance
    const calculation = await AttendanceCalculationService.calculateAttendance(
      record.checkInTime, 
      record.checkOutTime, 
      date, 
      userId, 
      token,
      otEndTime ? otEndTime.toISOString() : undefined,
      undefined, // isHoliday - sẽ được tính trong calculateAttendance
      shift // ✨ Truyền shift info
    );

    // ✨ Cập nhật record với thông tin công mới
    const updatedRecord = await TimeAttendanceModel.query().patchAndFetchById(record.id, {
      dailyTotalWorkHours: calculation.workHours,
      dailyWorkingUnit: calculation.dailyWorkingUnit || 0, // Công cơ bản (không bao gồm OT)
      totalWorkingUnit: calculation.totalWorkingUnit || 0, // Tổng công (bao gồm cả OT)
      otWorkingUnit: calculation.otWorkingUnit || 0, // Công OT riêng
      lateMinutes: calculation.lateMinutes,
      earlyDepartureMinutes: calculation.earlyDepartureMinutes,
      lateArrivalPenalty: calculation.latePenaltyAmount,
      earlyLeavePenalty: calculation.earlyLeavePenaltyAmount
      // ✅ REMOVED: otMinutes and otSalary (deprecated columns)
    });

    // Recalculate and upsert monthly summary for this user/month
    try {
      console.log(`🔄 [attendance] Triggering monthly calculation after attendance record...`);
      const result = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, date);
      console.log(`✅ [attendance] Monthly calculation result:`, result);
    } catch (monthlyErr: any) {
      console.error(`❌ [attendance] Failed to update monthly summary:`, monthlyErr);
    }

    return { 
      type: isCheckIn ? 'check_in' : 'check_out', 
      record: updatedRecord, 
      calculation, 
      hasOvertimeApproval: !!overtimeApp,
      shift // ✨ Trả về thông tin shift cho FE
    };
  } catch (error) {
    console.error('Error in recordAttendance:', error);
    throw error;
  }
}
    
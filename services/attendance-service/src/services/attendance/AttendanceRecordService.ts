// (Xử lý ghi nhận chấm công: check-in, check-out, cập nhật bản ghi.)

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import AttendanceCalculationService from './AttendanceCalculationService';
import { MonthlyReportService } from '../MonthlyReportService';
import { getShiftForUserAndDate } from './ShiftHelper';

dayjs.extend(utc);
dayjs.extend(timezone);

export async function recordAttendance(userId: number, time: string, token?: string, userData?: any): Promise<any> {
  try {
    const date = dayjs(time).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');

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

    // Lấy shift cho user vào ngày này (đã đăng ký hoặc mặc định)
    const shift = await getShiftForUserAndDate(userId, date);
    console.log('📋 Shift loaded', { userId, date, shift: shift?.name || shift?.id });

    // Lấy thông tin OT đã duyệt
    const overtimeApp = await AttendanceCalculationService.getApprovedOvertimeApplication(userId, date);
    let otStartTime: string | undefined = undefined;
    let otEndTime: string | undefined = undefined;
    if (overtimeApp) {
      const appData = typeof overtimeApp.data === 'string' ? JSON.parse(overtimeApp.data) : overtimeApp.data;
      console.log('✅ Found approved OT app', { id: overtimeApp.id, overtimeHours: appData.overtimeHours });

      // Tính startTime và endTime từ OT application (rút gọn logging)
      if (appData.startTime && appData.overtimeHours) {
        const startTime = dayjs(appData.startTime).tz('Asia/Ho_Chi_Minh');
        const endTime = startTime.add(appData.overtimeHours, 'hour');
        otStartTime = startTime.toISOString();
        otEndTime = endTime.toISOString();
        console.log('⏰ OT time range', { start: startTime.format('HH:mm'), end: endTime.format('HH:mm'), hours: appData.overtimeHours });
      } else if (appData.endTime) {
        otEndTime = dayjs(`${date} ${appData.endTime}`).tz('Asia/Ho_Chi_Minh').toISOString();
        console.log('⏰ OT endTime (fallback)', { otEndTime });
      } else {
        console.warn('⚠️ OT app missing startTime/overtimeHours or endTime', { appId: overtimeApp.id });
      }
    }

    console.log('🔍 Calling calculateAttendance', { checkIn: record.checkInTime, checkOut: record.checkOutTime, date, userId, hasOvertimeApp: !!overtimeApp });

    // ✨ Truyền shift và OT times vào calculateAttendance
    const calculation = await AttendanceCalculationService.calculateAttendance(
      record.checkInTime,
      record.checkOutTime,
      date,
      userId,
      token,
      otEndTime, // OT end time (ISO string hoặc undefined)
      undefined, // isHoliday - sẽ được tính trong calculateAttendance
      shift, // ✨ Truyền shift info
      otStartTime // ✨ OT start time để tính OT chính xác
    );

    console.log('📤 Calculation result', {
      workHours: calculation.workHours,
      dailyWorkingUnit: calculation.dailyWorkingUnit,
      otWorkingUnit: calculation.otWorkingUnit,
      totalWorkingUnit: calculation.totalWorkingUnit,
      otMinutes: calculation.otMinutes
    });

    // ✨ Cập nhật record với thông tin công mới
    const updateData = {
      dailyTotalWorkHours: calculation.workHours,
      dailyWorkingUnit: calculation.dailyWorkingUnit || 0, // Công cơ bản (không bao gồm OT)
      totalWorkingUnit: calculation.totalWorkingUnit || 0, // Tổng công (bao gồm cả OT)
      otWorkingUnit: calculation.otWorkingUnit || 0, // Công OT riêng (RAW - chưa nhân hệ số)
      overtimeHours: calculation.overtimeHours || 0, // ✨ Số giờ làm thêm thực tế
      lateMinutes: calculation.lateMinutes,
      earlyDepartureMinutes: calculation.earlyDepartureMinutes,
      lateArrivalPenalty: calculation.latePenaltyAmount,
      earlyLeavePenalty: calculation.earlyLeavePenaltyAmount
      // ✅ REMOVED: otMinutes and otSalary (deprecated columns)
    };

    console.log('💾 Saving record', { recordId: record.id, dailyTotalWorkHours: updateData.dailyTotalWorkHours, otWorkingUnit: updateData.otWorkingUnit, totalWorkingUnit: updateData.totalWorkingUnit });
    console.log('🔑 OT info', { hasApprovedOT: !!overtimeApp, otStartTime: otStartTime ? dayjs(otStartTime).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss') : null, otEndTime: otEndTime ? dayjs(otEndTime).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss') : null });

    const updatedRecord = await TimeAttendanceModel.query().patchAndFetchById(record.id, updateData);

    console.log(`✅ [recordAttendance] Record updated`, { id: updatedRecord.id, otWorkingUnit: updatedRecord.otWorkingUnit, totalWorkingUnit: updatedRecord.totalWorkingUnit });

    // Recalculate and upsert monthly summary for this user/month
    try {
      console.log('🔄 Triggering monthly calculation', { userId, date });
      const result = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, date, userData);
      console.log('✅ Monthly calculation finished', { success: result?.success || false });
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

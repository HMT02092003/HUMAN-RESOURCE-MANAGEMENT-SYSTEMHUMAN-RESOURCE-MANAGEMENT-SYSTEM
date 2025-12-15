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
    let otStartTime: string | undefined = undefined;
    let otEndTime: string | undefined = undefined;
    if (overtimeApp) {
      const appData = typeof overtimeApp.data === 'string' ? JSON.parse(overtimeApp.data) : overtimeApp.data;
      console.log(`✅ [recordAttendance] Found approved OT:`, appData);
      
      // Tính startTime và endTime từ OT application
      if (appData.startTime && appData.overtimeHours) {
        // ✨ QUAN TRỌNG: startTime từ DB là UTC, phải convert sang timezone VN
        const startTime = dayjs(appData.startTime).tz('Asia/Ho_Chi_Minh');
        const endTime = startTime.add(appData.overtimeHours, 'hour');
        otStartTime = startTime.toISOString();
        otEndTime = endTime.toISOString();
        console.log(`⏰ [recordAttendance] OT time range: ${startTime.format('HH:mm')} - ${endTime.format('HH:mm')} (${appData.overtimeHours}h)`);
      } else if (appData.endTime) {
        // Fallback: nếu có endTime trực tiếp (HH:mm format)
        otEndTime = dayjs(`${date} ${appData.endTime}`).tz('Asia/Ho_Chi_Minh').toISOString();
        console.log(`⏰ [recordAttendance] Using direct endTime: ${otEndTime}`);
      } else {
        console.warn(`⚠️ [recordAttendance] OT app missing startTime/overtimeHours or endTime`);
      }
    }

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

    // ✨ Cập nhật record với thông tin công mới
    const updateData = {
      dailyTotalWorkHours: calculation.workHours,
      dailyWorkingUnit: calculation.dailyWorkingUnit || 0, // Công cơ bản (không bao gồm OT)
      totalWorkingUnit: calculation.totalWorkingUnit || 0, // Tổng công (bao gồm cả OT)
      otWorkingUnit: calculation.otWorkingUnit || 0, // Công OT riêng
      lateMinutes: calculation.lateMinutes,
      earlyDepartureMinutes: calculation.earlyDepartureMinutes,
      lateArrivalPenalty: calculation.latePenaltyAmount,
      earlyLeavePenalty: calculation.earlyLeavePenaltyAmount
      // ✅ REMOVED: otMinutes and otSalary (deprecated columns)
    };
    
    console.log(`💾 [recordAttendance] Updating record ${record.id} with data:`, {
      ...updateData,
      hasOT: !!overtimeApp,
      otEndTime: otEndTime ? dayjs(otEndTime).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss') : undefined
    });
    
    const updatedRecord = await TimeAttendanceModel.query().patchAndFetchById(record.id, updateData);
    
    console.log(`✅ [recordAttendance] Record updated:`, {
      id: updatedRecord.id,
      otWorkingUnit: updatedRecord.otWorkingUnit,
      totalWorkingUnit: updatedRecord.totalWorkingUnit,
      dailyWorkingUnit: updatedRecord.dailyWorkingUnit
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
    
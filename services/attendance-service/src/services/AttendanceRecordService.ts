import dayjs from 'dayjs';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
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

    // --- Recalculate and upsert monthly summary for this user/month ---
    try {
      const monthStr = dayjs(date).format('YYYY-MM');
      const monthlyFull = await MonthlyReportService.buildMonthlyFull(userId, monthStr, undefined);
      console.log('[attendance] buildMonthlyFull result for', userId, monthStr, ':', !!monthlyFull);
      if (monthlyFull && monthlyFull.success && monthlyFull.data && monthlyFull.data.monthlyStats) {
        const stats = monthlyFull.data.monthlyStats as any;

        // Build payload mapped to DB columns (migration)
        const rawPayload: any = {
          userId,
          month: monthStr,
          totalScheduledDays: stats.totalDays ?? 0,
          presentDays: stats.presentDays ?? 0,
          absentDays: stats.absentDays ?? 0,
          approvedLeaveDays: stats.approvedLeaveDays ?? 0,
          unauthorizedAbsenceDays: stats.unauthorizedAbsenceDays ?? 0,
          businessTripDays: stats.businessTripDays ?? 0,

          lateDays: stats.lateDays ?? 0,
          earlyLeaveDays: stats.earlyLeaveDays ?? 0,
          totalLateMinutes: stats.totalLateMinutes ?? 0,
          totalEarlyLeaveMinutes: stats.totalEarlyLeaveMinutes ?? 0,

          totalWorkHours: stats.totalHours ?? 0,
          averageWorkHours: stats.averageHours ?? 0,
          totalWorkingUnits: stats.totalWorkingUnits ?? 0,

          totalOvertimeHours: stats.overtimeHours ?? 0,
          totalOtWorkingUnits: stats.totalOtWorkingUnits ?? 0,

          totalLatePenalty: stats.totalLatePenalty ?? 0,
          totalEarlyLeavePenalty: stats.totalEarlyLeavePenalty ?? 0,
          totalUnauthorizedAbsencePenalty: stats.totalUnauthorizedAbsencePenalty ?? 0,
          totalPenalty: stats.totalPenalty ?? 0,
          totalOvertimeSalary: stats.totalOvertimePay ?? 0,

          isApproved: false,
          approvedBy: null,
          approvedAt: null,
          notes: null
        };

        const allowed = [
          'userId','month','totalScheduledDays','presentDays','absentDays','approvedLeaveDays','unauthorizedAbsenceDays','businessTripDays',
          'lateDays','earlyLeaveDays','totalLateMinutes','totalEarlyLeaveMinutes','totalWorkHours','averageWorkHours','totalWorkingUnits',
          'totalOvertimeHours','totalOtWorkingUnits','totalLatePenalty','totalEarlyLeavePenalty','totalUnauthorizedAbsencePenalty','totalPenalty',
          'totalOvertimeSalary','isApproved','approvedBy','approvedAt','notes'
        ];

        const filteredPayload: any = {};
        for (const k of allowed) {
          if (Object.prototype.hasOwnProperty.call(rawPayload, k)) filteredPayload[k] = rawPayload[k];
        }

        console.log('[attendance] monthly payload for', userId, monthStr, ':', rawPayload);
        console.log('[attendance] filtered monthly payload for', userId, monthStr, ':', filteredPayload);

        const existing = await MonthlySummaryModel.getByUserAndMonth(userId, monthStr);
        if (existing) {
          const res = await MonthlySummaryModel.query().findById(existing.id).patch({ ...filteredPayload, updated_at: dayjs().toISOString() });
          console.log('[attendance] patched monthly_attendances id=', existing.id, 'res=', res);
        } else {
          const ins = await MonthlySummaryModel.query().insert({ userId, month: monthStr, isApproved: false, approvedBy: null, approvedAt: null, notes: null, ...filteredPayload });
          console.log('[attendance] inserted monthly_attendances id=', ins?.id);
        }
      }
    } catch (err) {
      console.warn('Failed to rebuild/upsert monthly summary after recording attendance:', (err as any)?.message || err);
    }

    return { type: isCheckIn ? 'check_in' : 'check_out', record: updatedRecord, calculation, hasOvertimeApproval: !!overtimeApp };
  } catch (error) {
    console.error('Error in recordAttendance:', error);
    throw error;
  }
}
    
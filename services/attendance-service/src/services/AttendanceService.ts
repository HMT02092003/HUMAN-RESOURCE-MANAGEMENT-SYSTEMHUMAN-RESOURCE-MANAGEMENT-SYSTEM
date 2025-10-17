/**
 * Attendance Service - Tổng hợp tất cả logic xử lý chấm công
 * Chứa tất cả business logic: tính toán, validation, xử lý dữ liệu
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import axios from 'axios';
import os from 'os';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import ApprovedAttendanceModel from '@/Models/ApprovedAttendanceModel';
import SettingModel from '@/Models/SettingsModel';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import { OvertimeProcessingService } from './OvertimeProcessingService';
import { AttendanceCalculationService } from './AttendanceCalculationService';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

// Helper function to get local IP
function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const API_GATEWAY_URL = `http://${getLocalIpAddress()}:${process.env['API_GATEWAY_PORT'] || 4000}`;
const APPLICATION_SERVICE_URL = process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  departmentId: number;
  department: {
    id: number;
    name: string;
  };
}

interface AttendanceSummary {
  userId: number;
  user: UserInfo;
  month: string;
  totalWorkDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalLateDays: number;
  totalEarlyLeaveDays: number;
  totalPenalty: number;
  totalOvertimeSalary: number;
  isApproved: boolean;
  attendanceData: any[];
}

interface WorkingDaysConfig {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface ApprovedLeaveApplication {
  id: number;
  type: string;
  userId: number;
  status: string;
  data: any;
  applicationDate: string;
  approvedDate: string;
}

export class AttendanceService {

  /**
   * Lấy danh sách users trong phòng ban
   */
  static async getUsersInDepartment(departmentId: number, token: string): Promise<UserInfo[]> {
    try {
      const usersResponse = await axios.get(
        `${API_GATEWAY_URL}/api/auth/users/department/${departmentId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!usersResponse.data || !usersResponse.data.data) {
        return [];
      }

      return usersResponse.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching users:', error.message);
      return [];
    }
  }

  /**
   * Process a forgot-check application: insert/update a time_attendance record
   * for the specified date and update monthly_summaries accordingly.
   * Returns { success, message, attendanceRecord?, monthlySummary? }
   */
  static async processForgotCheck(payload: { userId: number; forgotDate: string; forgotTime: string; forgotType: string }) {
    const knex = TimeAttendanceModel.knex();
    const { userId, forgotDate, forgotTime, forgotType } = payload;

  const dateKey: string = dayjs(forgotDate).format('YYYY-MM-DD');
  const monthKey: string = dayjs(forgotDate).format('YYYY-MM');

    // Determine whether this is a check-in or check-out fix
    const isCheckIn = forgotType === 'check_in' || forgotType === 'in';
    const isCheckOut = forgotType === 'check_out' || forgotType === 'out';

    if (!isCheckIn && !isCheckOut) {
      return { success: false, message: 'forgotType must be check_in or check_out' };
    }

    try {
      return await knex.transaction(async (trx: any) => {
        // Find existing attendance record for that day
        let existing = await TimeAttendanceModel.query(trx)
          .where('userId', userId)
          .where('date', dateKey)
          .first();

        const timeIso = dayjs(`${dateKey}T${forgotTime}`).toISOString();

        if (existing) {
          // Patch checkInTime or checkOutTime
          const patchData: any = {};
          if (isCheckIn) {
            patchData.checkInTime = timeIso;
          }
          if (isCheckOut) {
            patchData.checkOutTime = timeIso;
          }

          patchData.updated_at = dayjs().toISOString();

          await TimeAttendanceModel.query(trx).findById(existing.id).patch(patchData);

          existing = await TimeAttendanceModel.query(trx).findById(existing.id);
        } else {
          // Insert new record
          const insertData: any = {
            userId,
            date: dateKey,
            checkInTime: isCheckIn ? timeIso : null,
            checkOutTime: isCheckOut ? timeIso : null,
            created_at: dayjs().toISOString(),
            updated_at: dayjs().toISOString(),
            // default numeric fields
            lateMinutes: 0,
            earlyDepartureMinutes: 0,
            dailyTotalWorkHours: 0,
            lateArrivalPenalty: 0,
            earlyLeavePenalty: 0,
            otMinutes: 0,
            otSalary: 0,
            day_type: 'WORKDAY'
          };

          const inserted = await TimeAttendanceModel.query(trx).insert(insertData).returning('*');
          existing = inserted;
        }

        // Recalculate attendance for this single day using AttendanceCalculationService
        try {
          if (!existing) throw new Error('Attendance record missing after insert/update');

          // calculateAttendance(checkInTime, checkOutTime, date, userId?)
          const calculation = await AttendanceCalculationService.calculateAttendance(
            existing.checkInTime || null,
            existing.checkOutTime || null,
            dateKey,
            existing.userId
          );

          // Patch the attendance record with calculated values
          const updateFields: any = {
            dailyTotalWorkHours: calculation.workHours,
            lateMinutes: calculation.lateMinutes,
            earlyDepartureMinutes: calculation.earlyDepartureMinutes,
            lateArrivalPenalty: calculation.latePenaltyAmount,
            earlyLeavePenalty: calculation.earlyLeavePenaltyAmount,
            otMinutes: calculation.otMinutes,
            otSalary: calculation.otSalary,
            updated_at: dayjs().toISOString()
          };

          await TimeAttendanceModel.query(trx).findById(existing.id!).patch(updateFields as any);

          const updatedRecord = await TimeAttendanceModel.query(trx).findById(existing.id!);

          // Update monthly_summaries: fetch existing summary row
          let monthly = await MonthlySummaryModel.query(trx)
            .where('user_id', userId)
            .where('month', monthKey)
            .first();

          // Compute day-level contributions
          // day-level contributions (used in recompute below)

          if (monthly) {
            // If monthly is CLOSED, refuse update
            if (monthly.status === 'CLOSED') {
              throw new Error('Monthly summary is CLOSED; cannot modify attendance');
            }

            // Subtract old day's contribution (if existed) and add new
            // Load old record if existed before our upsert
            // For simplicity, we fetch the previous DB snapshot before our update by querying history is not available.
            // We'll approximate by recalculating totals from all day records in the month.
            const startDate = dayjs(`${monthKey}-01`).startOf('month').format('YYYY-MM-DD');
            const endDate = dayjs(`${monthKey}-01`).endOf('month').format('YYYY-MM-DD');

            const rows = await TimeAttendanceModel.query(trx)
              .where('userId', userId)
              .whereBetween('date', [startDate, endDate]);

            // Recompute aggregates from scratch (safe and idempotent)
            let totalWorkDays = 0;
            let totalWorkHours = 0;
            let totalOvertimeHours = 0;
            let totalLateMinutes = 0;
            let totalEarlyLeaveMinutes = 0;
            let totalLatePenalty = 0;
            let totalEarlyLeavePenalty = 0;
            let totalOvertimeSalary = 0;

            rows.forEach((r: any) => {
              if (r.checkInTime && r.checkOutTime) {
                totalWorkDays++;
                totalWorkHours += parseFloat(r.dailyTotalWorkHours?.toString() || '0');
              }
              totalOvertimeHours += Math.round((parseFloat(r.otMinutes?.toString() || '0') / 60) * 100) / 100;
              totalLateMinutes += parseFloat(r.lateMinutes?.toString() || '0');
              totalEarlyLeaveMinutes += parseFloat(r.earlyDepartureMinutes?.toString() || '0');
              totalLatePenalty += parseFloat(r.lateArrivalPenalty?.toString() || '0');
              totalEarlyLeavePenalty += parseFloat(r.earlyLeavePenalty?.toString() || '0');
              totalOvertimeSalary += parseFloat(r.otSalary?.toString() || '0');
            });

            // Upsert monthly
            await MonthlySummaryModel.query(trx)
              .findById(monthly.id)
              .patch({
                totalWorkDays,
                totalWorkHours: Math.round(totalWorkHours * 100) / 100,
                totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
                totalLateMinutes: Math.round(totalLateMinutes),
                totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
                totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
                totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty * 100) / 100,
                totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
                updated_at: dayjs().toISOString()
              });

            const refreshed = await MonthlySummaryModel.query(trx).findById(monthly.id);

            return { success: true, message: 'Attendance updated and monthly summary recalculated', attendanceRecord: updatedRecord, monthlySummary: refreshed };
          } else {
            // Create monthly summary from scratch for this user/month
            // Aggregate from all rows
            const startDate = dayjs(`${monthKey}-01`).startOf('month').format('YYYY-MM-DD');
            const endDate = dayjs(`${monthKey}-01`).endOf('month').format('YYYY-MM-DD');

            const rows = await TimeAttendanceModel.query(trx)
              .where('userId', userId)
              .whereBetween('date', [startDate, endDate]);

            let totalWorkDays = 0;
            let totalWorkHours = 0;
            let totalOvertimeHours = 0;
            let totalLateMinutes = 0;
            let totalEarlyLeaveMinutes = 0;
            let totalLatePenalty = 0;
            let totalEarlyLeavePenalty = 0;
            let totalOvertimeSalary = 0;

            rows.forEach((r: any) => {
              if (r.checkInTime && r.checkOutTime) {
                totalWorkDays++;
                totalWorkHours += parseFloat(r.dailyTotalWorkHours?.toString() || '0');
              }
              totalOvertimeHours += Math.round((parseFloat(r.otMinutes?.toString() || '0') / 60) * 100) / 100;
              totalLateMinutes += parseFloat(r.lateMinutes?.toString() || '0');
              totalEarlyLeaveMinutes += parseFloat(r.earlyDepartureMinutes?.toString() || '0');
              totalLatePenalty += parseFloat(r.lateArrivalPenalty?.toString() || '0');
              totalEarlyLeavePenalty += parseFloat(r.earlyLeavePenalty?.toString() || '0');
              totalOvertimeSalary += parseFloat(r.otSalary?.toString() || '0');
            });

            const created = await MonthlySummaryModel.query(trx).insert({
              user_id: userId,
              month: monthKey,
              year: parseInt((monthKey.split('-')[0] as string)),
              totalWorkDays,
              totalWorkHours: Math.round(totalWorkHours * 100) / 100,
              totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
              totalLateMinutes: Math.round(totalLateMinutes),
              totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
              totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
              totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty * 100) / 100,
              totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
              status: 'IN_PROGRESS',
              created_at: dayjs().toISOString(),
              updated_at: dayjs().toISOString()
            } as any).returning('*');

            return { success: true, message: 'Attendance created and monthly summary generated', attendanceRecord: updatedRecord, monthlySummary: created };
          }

        } catch (calcErr) {
          console.error('❌ Error calculating attendance for day:', calcErr);
          throw calcErr;
        }
      });
    } catch (err: any) {
      console.error('❌ processForgotCheck error:', err);
      return { success: false, message: err.message || 'Error processing forgot check' };
    }
  }

  /**
   * Create placeholder attendance records for approved applications (leave / business-trip)
   * payload: { userId, type, startDate, endDate, date, reason }
   */
  static async processApplicationCreate(payload: { userId: number; type: string; startDate?: string; endDate?: string; date?: string; reason?: string }) {
    const { userId, type, startDate, endDate, date, reason } = payload;
    try {
      const dates: string[] = [];
      if (date) dates.push(dayjs(date).format('YYYY-MM-DD'));
      else if (startDate && endDate) {
        let cur = dayjs(startDate);
        const end = dayjs(endDate);
        while (cur.isSameOrBefore(end, 'day')) {
          dates.push(cur.format('YYYY-MM-DD'));
          cur = cur.add(1, 'day');
        }
      }

      if (dates.length === 0) return { success: false, message: 'No dates provided' };

      const knex = TimeAttendanceModel.knex();
      return await knex.transaction(async (trx: any) => {
        const results: any[] = [];
        for (const d of dates) {
          const existing = await TimeAttendanceModel.query(trx).where('userId', userId).where('date', d).first();
          if (existing) {
            // update day_type to LEAVE or BUSINESS_TRIP if not already
            const newType = type === 'business-trip' ? 'BUSINESS_TRIP' : 'LEAVE';
            if (existing.day_type !== newType) {
              await TimeAttendanceModel.query(trx).findById(existing.id).patch({ day_type: newType, updated_at: dayjs().toISOString() } as any);
            }
            results.push({ date: d, action: 'updated' });
          } else {
            // insert placeholder record
            await TimeAttendanceModel.query(trx).insert({
              userId,
              date: d,
              checkInTime: null,
              checkOutTime: null,
              dailyTotalWorkHours: 0,
              lateMinutes: 0,
              earlyDepartureMinutes: 0,
              lateArrivalPenalty: 0,
              earlyLeavePenalty: 0,
              otMinutes: 0,
              otSalary: 0,
              day_type: type === 'business-trip' ? 'BUSINESS_TRIP' : 'LEAVE',
              created_at: dayjs().toISOString(),
              updated_at: dayjs().toISOString()
            } as any).returning('*');
            results.push({ date: d, action: 'inserted' });
          }
        }

        // After inserting/updating days, recalc monthly summaries per affected month
        const months = Array.from(new Set(dates.map(x => dayjs(x).format('YYYY-MM'))));
        const monthlySummaries: any[] = [];
        for (const m of months) {
          const start = dayjs(`${m}-01`).startOf('month').format('YYYY-MM-DD');
          const end = dayjs(`${m}-01`).endOf('month').format('YYYY-MM-DD');
          const rows = await TimeAttendanceModel.query(trx).where('userId', userId).whereBetween('date', [start, end]);

          let totalWorkDays = 0, totalWorkHours = 0, totalOvertimeHours = 0, totalLateMinutes = 0, totalEarlyLeaveMinutes = 0, totalLatePenalty = 0, totalEarlyPenalty = 0, totalOvertimeSalary = 0;
          rows.forEach((r: any) => {
            if (r.checkInTime && r.checkOutTime) { totalWorkDays++; totalWorkHours += Number(r.dailyTotalWorkHours || 0); }
            totalOvertimeHours += Math.round(((Number(r.otMinutes || 0)) / 60) * 100) / 100;
            totalLateMinutes += Number(r.lateMinutes || 0);
            totalEarlyLeaveMinutes += Number(r.earlyDepartureMinutes || 0);
            totalLatePenalty += Number(r.lateArrivalPenalty || 0);
            totalEarlyPenalty += Number(r.earlyLeavePenalty || 0);
            totalOvertimeSalary += Number(r.otSalary || 0);
          });

          const mRow = await MonthlySummaryModel.query(trx).where('user_id', userId).where('month', Number(m.split('-')[1])).where('year', Number(m.split('-')[0])).first();
          if (mRow) {
            if (mRow.status === 'CLOSED') {
              // skip updating closed month
              monthlySummaries.push({ month: m, updated: false, reason: 'CLOSED' });
              continue;
            }
            await MonthlySummaryModel.query(trx).findById(mRow.id).patch({
              totalWorkDays,
              totalWorkHours: Math.round(totalWorkHours * 100) / 100,
              totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
              totalLateMinutes: Math.round(totalLateMinutes),
              totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
              totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
              totalEarlyLeavePenalty: Math.round(totalEarlyPenalty * 100) / 100,
              totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
              updated_at: dayjs().toISOString()
            } as any);
            const refreshed = await MonthlySummaryModel.query(trx).findById(mRow.id);
            monthlySummaries.push({ month: m, updated: true, row: refreshed });
          } else {
            const created = await MonthlySummaryModel.query(trx).insert({
              user_id: userId,
              month: Number(m.split('-')[1]),
              year: Number(m.split('-')[0]),
              totalWorkDays,
              totalWorkHours: Math.round(totalWorkHours * 100) / 100,
              totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
              totalLateMinutes: Math.round(totalLateMinutes),
              totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
              totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
              totalEarlyLeavePenalty: Math.round(totalEarlyPenalty * 100) / 100,
              totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
              status: 'IN_PROGRESS',
              created_at: dayjs().toISOString(),
              updated_at: dayjs().toISOString()
            } as any).returning('*');
            monthlySummaries.push({ month: m, updated: true, row: created });
          }
        }

        return { success: true, message: 'Application days created/updated', details: results, monthlySummaries };
      });
    } catch (err: any) {
      console.error('❌ processApplicationCreate error:', err);
      return { success: false, message: err.message || 'Error processing application create' };
    }
  }

  /**
   * Lấy danh sách đơn nghỉ phép/công tác đã được duyệt
   */
  static async getApprovedApplications(
    userId: number,
    year: number,
    month: number
  ): Promise<ApprovedLeaveApplication[]> {
    try {
      const response = await axios.get(
        `${APPLICATION_SERVICE_URL}/api/applications/user/${userId}/approved`,
        { params: { year, month } }
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error('❌ Error fetching approved applications:', error.message);
      return [];
    }
  }

  /**
   * Lấy cấu hình ngày làm việc
   */
  static async getWorkingDaysConfig(): Promise<WorkingDaysConfig> {
    try {
      const setting = await SettingModel.query().findOne('key', 'WorkingDays');

      if (setting && setting.value) {
        const value = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;

        return value as WorkingDaysConfig;
      }

      // Default: Thứ 2 - Thứ 6
      return {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      };
    } catch (error) {
      console.error('❌ Error loading working days config:', error);
      return {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      };
    }
  }

  /**
   * Kiểm tra ngày có phải ngày làm việc không
   */
  static isWorkingDay(date: string, config: WorkingDaysConfig): boolean {
    const dayOfWeek = dayjs(date).day(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    const daysMap: { [key: number]: keyof WorkingDaysConfig } = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };

    const dayKey = daysMap[dayOfWeek];
    return dayKey ? config[dayKey] || false : false;
  }

  /**
   * Check xem ngày có nằm trong đơn nghỉ phép không
   */
  static checkDateHasLeave(
    date: string,
    applications: ApprovedLeaveApplication[]
  ): { hasLeave: boolean; leaveType?: string; leaveInfo?: string } {
    const today = dayjs().format('YYYY-MM-DD');

    // Bỏ qua các ngày sau ngày hôm nay
    if (dayjs(date).isAfter(today, 'day')) {
      return { hasLeave: false }; // Bỏ qua các ngày trong tương lai
    }

    for (const app of applications) {
      if (app.type === 'leave' || app.type === 'sick-leave') {
        const appData = app.data;

        // Check nhiều ngày
        if (appData.startDate && appData.endDate) {
          const checkDate = dayjs(date);
          const startDate = dayjs(appData.startDate);
          const endDate = dayjs(appData.endDate);

          if (checkDate.isSame(startDate, 'day') || checkDate.isSame(endDate, 'day') ||
            (checkDate.isAfter(startDate, 'day') && checkDate.isBefore(endDate, 'day'))) {
            return {
              hasLeave: true,
              leaveType: app.type,
              leaveInfo: appData.reason || appData.description || 'Nghỉ phép'
            };
          }
        }

        // Check 1 ngày
        if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
          return {
            hasLeave: true,
            leaveType: app.type,
            leaveInfo: appData.reason || appData.description || 'Nghỉ phép'
          };
        }

        // Check requestedDates array
        if (appData.requestedDates && Array.isArray(appData.requestedDates)) {
          for (const reqDate of appData.requestedDates) {
            if (dayjs(reqDate.date || reqDate).isSame(dayjs(date), 'day')) {
              return {
                hasLeave: true,
                leaveType: app.type,
                leaveInfo: appData.reason || appData.description || 'Nghỉ phép'
              };
            }
          }
        }
      }
    }

    return { hasLeave: false };
  }

  /**
   * Check xem ngày có nằm trong đơn công tác không
   */
  static checkDateHasBusinessTrip(
    date: string,
    applications: ApprovedLeaveApplication[]
  ): { hasBusinessTrip: boolean; tripInfo?: string; destination?: string } {
    const today = dayjs().format('YYYY-MM-DD');

    // Bỏ qua các ngày sau ngày hôm nay
    if (dayjs(date).isAfter(today, 'day')) {
      return { hasBusinessTrip: false }; // Bỏ qua các ngày trong tương lai
    }

    for (const app of applications) {
      if (app.type === 'business-trip') {
        const appData = app.data;

        if (appData.startDate && appData.endDate) {
          const checkDate = dayjs(date);
          const startDate = dayjs(appData.startDate);
          const endDate = dayjs(appData.endDate);

          if ((checkDate.isSame(startDate, 'day') || checkDate.isAfter(startDate, 'day')) &&
            (checkDate.isSame(endDate, 'day') || checkDate.isBefore(endDate, 'day'))) {
            return {
              hasBusinessTrip: true,
              tripInfo: appData.reason || 'Công tác',
              destination: appData.destination || appData.location || 'Chưa rõ địa điểm'
            };
          }
        }

        if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
          return {
            hasBusinessTrip: true,
            tripInfo: appData.reason || 'Công tác',
            destination: appData.destination || appData.location || 'Chưa rõ địa điểm'
          };
        }
      }
    }

    return { hasBusinessTrip: false };
  }

  /**
   * Tính tổng số ngày đi muộn trong tháng bằng Objection.js
   * Đếm số bản ghi có lateMinutes > 0 và lateArrivalPenalty > 0
   */
  static async calculateTotalLateDays(userId: number, month: string): Promise<number> {
    try {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      // Query đếm số bản ghi chấm công có đi muộn (lateMinutes > 0)
      const result = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .where('lateMinutes', '>', 0)
        .count('* as count')
        .first() as any;

      const count = result ? parseInt(result.count as string) : 0;

      console.log(`📊 Total late days for user ${userId} in ${month}: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error calculating late days:', error);
      return 0;
    }
  }

  /**
   * Tính tổng số ngày về sớm trong tháng
   */
  static async calculateTotalEarlyLeaveDays(userId: number, month: string): Promise<number> {
    try {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      const result = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .where('earlyDepartureMinutes', '>', 0)
        .count('* as count')
        .first() as any;

      const count = result ? parseInt(result.count as string) : 0;

      console.log(`📊 Total early leave days for user ${userId} in ${month}: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error calculating early leave days:', error);
      return 0;
    }
  }

  /**
   * Lấy thông tin chấm công tháng của 1 user (với tất cả thống kê)
   * ⭐ CẬP NHẬT: Thêm thông tin isWorkingDay và hasApprovedOT
   */
  static async getUserMonthlyAttendance(
    userId: number,
    month: string,
    token?: string
  ): Promise<AttendanceSummary | null> {
    try {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      // ⭐ 1. Lấy dữ liệu chấm công
      const attendanceData = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      // ⭐ 2. Lấy cấu hình working days
      const workingDaysConfig = await this.getWorkingDaysConfig();
      console.log('⚙️ Working days config:', workingDaysConfig);

      // ⭐ 3. Lấy thông tin đơn nghỉ phép/công tác/OT đã được duyệt
      const [year, monthNum] = month.split('-');
      const approvedApplications = await this.getApprovedApplications(
        userId,
        parseInt(year || ''),
        parseInt(monthNum || '')
      );

      console.log(`📋 Found ${approvedApplications.length} approved applications for user ${userId} in ${month}`);
      if (approvedApplications.length > 0) {
        console.log('📝 Application types:', approvedApplications.map(app => ({ id: app.id, type: app.type })));
      }

      // ⭐ 4. Tạo Map từ attendance data để tra cứu nhanh
      const attendanceMap = new Map<string, any>();
      attendanceData.forEach((record: any) => {
        const dateKey = dayjs(record.date).format('YYYY-MM-DD');
        // Convert Objection model to plain object with all fields
        const plainRecord = record.toJSON ? record.toJSON() : { ...record };
        attendanceMap.set(dateKey, plainRecord);
      });

      // ⭐ 5. Generate TẤT CẢ ngày trong tháng
      const daysInMonth = dayjs(`${month}-01`).daysInMonth();
      const enrichedAttendanceData: any[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = dayjs(`${month}-${String(day).padStart(2, '0')}`);
        const dateKey = currentDate.format('YYYY-MM-DD');

        // ⭐ Check xem ngày này có phải ngày làm việc không
        const isWorkingDay = this.isWorkingDay(dateKey, workingDaysConfig);

        // Determine if this date is in the future (beyond today)
        const isFuture = currentDate.isAfter(dayjs(), 'day');

        // Lấy attendance record nếu có
        const attendanceRecord = attendanceMap.get(dateKey);

        // Check xem ngày này có đơn nghỉ phép không
        const leaveCheck = this.checkDateHasLeave(dateKey, approvedApplications);

        // Check xem ngày này có đơn công tác không
        const businessTripCheck = this.checkDateHasBusinessTrip(dateKey, approvedApplications);

        // Check xem ngày này có đơn OT đã duyệt không (from applications list)
        let hasApprovedOT = approvedApplications.some(app => {
          if (app.type !== 'overtime') return false;
          const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
          // support single-date and ranges
          if (appData.date && dayjs(appData.date).isSame(dayjs(dateKey), 'day')) return true;
          if (appData.startDate && appData.endDate) {
            const start = dayjs(appData.startDate);
            const end = dayjs(appData.endDate);
            if ((dayjs(dateKey).isSame(start, 'day') || dayjs(dateKey).isAfter(start, 'day')) &&
              (dayjs(dateKey).isSame(end, 'day') || dayjs(dateKey).isBefore(end, 'day'))) {
              return true;
            }
          }
          return false;
        });

        // If not found in approvedApplications array, try to fetch a single overtime application for this date (external endpoint)
        let overtimeApplicationDetail: any = null;
        if (!hasApprovedOT) {
          try {
            overtimeApplicationDetail = await this.getApprovedOvertimeApplication(userId, dateKey);
            if (overtimeApplicationDetail) hasApprovedOT = true;
          } catch (e) {
            // ignore failures when fetching OT detail
          }
        }

        // Tạo record cho ngày này
        const dayRecord: any = {
          date: currentDate.toISOString(),
          userId,
          isWorkingDay,        // ⭐ Thêm thông tin ngày làm việc
          isFuture,            // ⭐ Đánh dấu ngày trong tương lai (không tính nghỉ không phép)
          hasApprovedOT,       // ⭐ Thêm thông tin OT đã duyệt
          // Thông tin nghỉ phép
          hasApprovedLeave: leaveCheck.hasLeave,
          leaveType: leaveCheck.leaveType,
          leaveInfo: leaveCheck.leaveInfo,
          type: leaveCheck.hasLeave
            ? leaveCheck.leaveType
            : (businessTripCheck.hasBusinessTrip ? 'business_trip' : 'attendance'),

          // Thông tin công tác
          hasBusinessTrip: businessTripCheck.hasBusinessTrip,
          businessTripInfo: businessTripCheck.tripInfo,
          businessTripDestination: businessTripCheck.destination,
          tripInfo: businessTripCheck.tripInfo,
          destination: businessTripCheck.destination
        };

  // Merge với attendance record nếu có - SPREAD toàn bộ fields trước, sau đó override metadata
        if (attendanceRecord) {
          // Spread attendance record TRƯỚC để lấy tất cả fields từ DB
          Object.assign(dayRecord, {
            ...attendanceRecord,  // Toàn bộ fields từ DB (bao gồm otWorkingUnit, otMinutes, otSalary)
            // Override metadata fields
            date: currentDate.toISOString(),
            userId,
            isWorkingDay,
            isFuture,
            hasApprovedOT,
            hasApprovedLeave: leaveCheck.hasLeave,
            leaveType: leaveCheck.leaveType,
            leaveInfo: leaveCheck.leaveInfo,
            type: leaveCheck.hasLeave
              ? leaveCheck.leaveType
              : (businessTripCheck.hasBusinessTrip ? 'business_trip' : 'attendance'),
            hasBusinessTrip: businessTripCheck.hasBusinessTrip,
            businessTripInfo: businessTripCheck.tripInfo,
            businessTripDestination: businessTripCheck.destination,
            tripInfo: businessTripCheck.tripInfo,
            destination: businessTripCheck.destination
          });
        } else {
          // Ngày không có attendance - set default values
          dayRecord.id = null;
          dayRecord.checkInTime = null;
          dayRecord.checkOutTime = null;
          dayRecord.lateMinutes = 0;
          dayRecord.earlyDepartureMinutes = 0;
          dayRecord.dailyTotalWorkHours = 0;
          dayRecord.lateArrivalPenalty = 0;
          dayRecord.earlyLeavePenalty = 0;
          dayRecord.otMinutes = 0;
          dayRecord.otSalary = 0;
        }

        // For weekend days: hide attendance data unless there is an approved OT or the day record was created by an approved application (day_type != WORKDAY)
        if (!isWorkingDay) {
          const existingDayType = attendanceRecord ? attendanceRecord.day_type : undefined;

          // If there's no approved OT and the existing day_type is WORKDAY or undefined, clear attendance times so controller treats it as weekend
          if (!hasApprovedOT && (!existingDayType || existingDayType === 'WORKDAY')) {
            dayRecord.checkInTime = null;
            dayRecord.checkOutTime = null;
            dayRecord.hasApprovedOT = false;
          } else if (hasApprovedOT) {
            // attach OT detail if available
            dayRecord.hasApprovedOT = true;
            if (overtimeApplicationDetail) dayRecord.overtimeApplication = overtimeApplicationDetail;
          }
        }

        enrichedAttendanceData.push(dayRecord);
      }

      // Kiểm tra đã duyệt chưa
      const isApproved = await ApprovedAttendanceModel.isApproved(userId, month);

      // Tính toán thống kê - sử dụng query để đếm chính xác
      const totalLateDays = await this.calculateTotalLateDays(userId, month);
      const totalEarlyLeaveDays = await this.calculateTotalEarlyLeaveDays(userId, month);

      let totalWorkDays = 0;
      let totalWorkHours = 0;
      let totalOvertimeMinutes = 0;
      let totalPenalty = 0;
      let totalOvertimeSalary = 0;

      enrichedAttendanceData.forEach(record => {
        if (record.checkInTime && record.checkOutTime) {
          totalWorkDays++;
          totalWorkHours += parseFloat(record.dailyTotalWorkHours.toString());
          totalOvertimeMinutes += parseFloat(record.otMinutes.toString());
          totalPenalty += parseFloat(record.lateArrivalPenalty.toString()) +
            parseFloat(record.earlyLeavePenalty.toString());
          totalOvertimeSalary += parseFloat(record.otSalary.toString());
        }
      });

      // Lấy thông tin user (nếu có token)
      let userInfo: UserInfo | null = null;
      if (token) {
        try {
          const userResponse = await axios.get(
            `${API_GATEWAY_URL}/api/auth/users/detail/${userId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          userInfo = userResponse.data;
        } catch (error) {
          console.log('⚠️ Could not fetch user info');
        }
      }

      console.log(`✅ Generated ${enrichedAttendanceData.length} day records with application info merged`);

      return {
        userId,
        user: userInfo || {
          id: userId,
          name: 'N/A',
          email: 'N/A',
          departmentId: 0,
          department: { id: 0, name: 'N/A' }
        },
        month,
        totalWorkDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
        totalLateDays, // Đếm chính xác từ database
        totalEarlyLeaveDays, // Đếm chính xác từ database
        totalPenalty: Math.round(totalPenalty * 100) / 100,
        totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
        isApproved,
        attendanceData: enrichedAttendanceData  // ⭐ Trả về TẤT CẢ ngày trong tháng
      };
    } catch (error) {
      console.error('❌ Error getting user monthly attendance:', error);
      return null;
    }
  }

  /**
   * Lấy danh sách chấm công của phòng ban theo tháng để duyệt
   */
  static async getAttendanceForApproval(
    departmentId: number,
    month: string,
    token: string
  ): Promise<AttendanceSummary[]> {
    try {
      console.log(`📋 Getting attendance for department ${departmentId} in ${month}`);

      // Lấy danh sách users trong phòng ban
      const users = await this.getUsersInDepartment(departmentId, token);

      if (users.length === 0) {
        console.log('⚠️ No users found in department');
        return [];
      }

      console.log(`👥 Found ${users.length} users in department`);

      // Lấy thông tin chấm công cho từng user
      const attendanceSummaries: AttendanceSummary[] = [];

      for (const user of users) {
        const summary = await this.getUserMonthlyAttendance(user.id, month, token);

        if (summary) {
          summary.user = user; // Override với thông tin user đầy đủ
          attendanceSummaries.push(summary);
        }
      }

      console.log(`✅ Processed ${attendanceSummaries.length} attendance summaries`);

      return attendanceSummaries;
    } catch (error) {
      console.error('❌ Error getting attendance for approval:', error);
      throw error;
    }
  }

  /**
   * Duyệt bảng công tháng (xử lý overtime nếu có)
   */
  static async approveMonthlyAttendance(
    userId: number,
    month: string,
    approvedBy: number,
    token: string,
    extraData?: any
  ): Promise<{ success: boolean; message: string; data?: any; code?: string }> {
    try {
      console.log(`\n🔥 Starting approval/update process for user ${userId} in ${month}`);

      // === Bước 1: Tìm bản ghi đã duyệt trước đó ===
  const existingApproval: any = await ApprovedAttendanceModel.query().findOne({ userId, month });

      // Nếu đã tồn tại bản ghi duyệt thì trả về sớm để frontend biết rằng bảng công đã được duyệt
      if (existingApproval) {
        console.log(`⚠️ Approval already exists for user ${userId} in ${month} (ID: ${existingApproval.id}) - aborting create`);
        return {
          success: false,
          code: 'ALREADY_APPROVED',
          message: 'Bảng công của người dùng này đã được duyệt trong tháng này'
        };
      }

      // === Bước 2: Xử lý làm thêm (luôn chạy để có dữ liệu mới nhất) ===
      console.log('🔄 Processing overtime applications...');
      const overtimeResult = await OvertimeProcessingService.processAllOvertimeForMonth(
        userId,
        month,
        token
      );
      console.log('📊 Overtime processing result:', overtimeResult);

      // === Bước 2.5: Xử lý dailyData từ frontend (nếu có) ===
      // Frontend có thể gửi kèm dailyData chứa OT từng ngày
      if (extraData?.dailyData?.dailyDetails) {
        console.log('📋 Processing dailyData from frontend...');
        const dailyDetails = extraData.dailyData.dailyDetails;
        
        // Lưu OT từng ngày vào time_attendances nếu có attendance record
        for (const dayDetail of dailyDetails) {
          if (dayDetail.hasAttendance && dayDetail.attendanceData) {
            const attData = dayDetail.attendanceData;
            const dateKey = dayjs(dayDetail.date).format('YYYY-MM-DD');
            
            // Kiểm tra nếu có thông tin OT
            if ( attData.otMinutes || attData.otSalary) {
              try {
                // Tìm và cập nhật bản ghi attendance
                const existingRecord = await TimeAttendanceModel.query()
                  .where('userId', userId)
                  .where('date', dateKey)
                  .first();
                
                if (existingRecord) {
                  await TimeAttendanceModel.query()
                    .where('id', existingRecord.id)
                    .patch({
                      otMinutes: parseFloat(attData.otMinutes || '0'),
                      otSalary: parseFloat(attData.otSalary || '0'),
                      updated_at: dayjs().toISOString()
                    });

                  console.log(`   ✅ Updated OT for ${dateKey}: ${attData.otMinutes}h, ${attData.otSalary} VND`);
                }
              } catch (err) {
                console.error(`   ❌ Error updating OT for ${dateKey}:`, err);
              }
            }
          }
        }
        
        // === Tính lại tổng OT sau khi cập nhật ===
        console.log('🔄 Recalculating total overtime from updated records...');
        const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
        const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
        
        const updatedRecords = await TimeAttendanceModel.query()
          .where('userId', userId)
          .whereBetween('date', [startDate, endDate]);
        
        let recalculatedOTHours = 0;
        let recalculatedOTSalary = 0;
        let recalculatedOTDays = 0;
        
        updatedRecords.forEach(record => {
          const otMinutes = parseFloat(record.otMinutes?.toString() || '0');
          const otSalary = parseFloat(record.otSalary?.toString() || '0');

          recalculatedOTHours += Math.round((otMinutes / 60) * 100) / 100;
          recalculatedOTSalary += otSalary;

          // Đếm số ngày có OT (otMinutes > 0)
          if (otMinutes > 0) {
            recalculatedOTDays++;
          }
        });
        
        console.log(`📊 Recalculated OT: ${recalculatedOTHours}h, ${recalculatedOTDays} days, ${recalculatedOTSalary} VND`);
        
        // Cập nhật lại overtimeResult với giá trị mới
        overtimeResult.totalOvertimeHours = recalculatedOTHours;
        overtimeResult.totalOvertimeSalary = recalculatedOTSalary;
        // Note: totalOvertimeDays không có trong return type của OvertimeProcessingService
        // Sẽ tính riêng cho dataPayload
      }

      // === Bước 3: Chuẩn bị payload dữ liệu chính từ frontend ===
      const dataPayload: any = {};
      
      // Tính số ngày OT từ DB (đếm số record có otWorkingUnit > 0)
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
      const otRecords = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .where('otMinutes', '>', 0);
      const totalOvertimeDays = otRecords.length;
      
      if (extraData && extraData.monthlyStats) {
        console.log('🔎 Extracting stats from extraData.monthlyStats');
        const stats = extraData.monthlyStats;
        // Map dữ liệu từ monthlyStats sang các trường trong DB
        dataPayload.totalWorkDays = stats.totalDays ?? 0;
        dataPayload.totalWorkHours = stats.totalHours ?? 0;
        dataPayload.totalLateDays = stats.lateDays ?? 0;
        dataPayload.totalEarlyLeaveDays = stats.earlyLeaveDays ?? 0;
        dataPayload.totalLateMinutes = stats.totalLateMinutes ?? 0;
        dataPayload.totalEarlyLeaveMinutes = stats.totalEarlyLeaveMinutes ?? 0;
        dataPayload.totalPaidLeaveDays = stats.approvedLeaveDays ?? 0;
        dataPayload.totalUnpaidLeaveDays = stats.unauthorizedAbsenceDays ?? 0;
        dataPayload.totalLatePenalty = stats.totalLatePenalty ?? 0;
        dataPayload.totalEarlyLeavePenalty = stats.totalEarlyLeavePenalty ?? 0;
        dataPayload.totalPenalty = stats.totalPenalty ?? 0;
        dataPayload.totalOvertimeHours = overtimeResult.totalOvertimeHours ?? 0; // Luôn lấy từ kết quả xử lý mới nhất
        dataPayload.totalOvertimeDays = totalOvertimeDays; // ⭐ Số ngày OT
        dataPayload.totalOvertimeSalary = overtimeResult.totalOvertimeSalary ?? 0; // Luôn lấy từ kết quả xử lý mới nhất
      } else {
        // Nếu không có monthlyStats, vẫn cập nhật overtime
        dataPayload.totalOvertimeHours = overtimeResult.totalOvertimeHours;
        dataPayload.totalOvertimeDays = totalOvertimeDays;
        dataPayload.totalOvertimeSalary = overtimeResult.totalOvertimeSalary;
      }

      if (extraData?.notes) {
        dataPayload.notes = extraData.notes;
      }

      // === Bước 4: Lấy thông tin lương & tính toán lương cuối cùng ===
      let baseSalary: number | null = null;
      let totalAllowance = 0;
      try {
        // (Giữ nguyên logic lấy lương của bạn ở đây...)
        // Ví dụ:
        const internalResp = await axios.get(`http://localhost:${process.env['AUTH_SERVICE_PORT'] || 4001}/api/internal/users/${userId}/salary`);
        if (internalResp.data?.success && internalResp.data.data) {
          baseSalary = parseFloat(internalResp.data.data.baseSalary || internalResp.data.data.salary || '0');
          totalAllowance = parseFloat(internalResp.data.data.allowance || '0');
        }
        // ... các fallback call khác
      } catch (err) {
        console.warn('⚠️ Error fetching salary info:', err);
      }

      dataPayload.baseSalary = baseSalary;
      dataPayload.totalAllowance = totalAllowance;

      // ⭐ Tính lương cuối cùng = lương cơ bản + phụ cấp - phạt + tăng ca
      let finalSalary: number | null = null;
      if (baseSalary !== null) {
        finalSalary = (baseSalary || 0) + (totalAllowance || 0) - (dataPayload.totalPenalty || 0) + (dataPayload.totalOvertimeSalary || 0);
        
        console.log(`💰 Final salary calculation:`);
        console.log(`   - Base salary: ${baseSalary?.toLocaleString('vi-VN')} VND`);
        console.log(`   - Total allowance: ${totalAllowance?.toLocaleString('vi-VN')} VND`);
        console.log(`   - Total penalty: ${dataPayload.totalPenalty?.toLocaleString('vi-VN')} VND`);
        console.log(`   - Total overtime salary: ${dataPayload.totalOvertimeSalary?.toLocaleString('vi-VN')} VND`);
        console.log(`   - Final salary: ${finalSalary?.toLocaleString('vi-VN')} VND`);
      }
      dataPayload.finalSalary = finalSalary;

      // === Bước 5: Thêm mới hoặc Cập nhật vào DB ===
      let approvalRecord;

      if (existingApproval) {
        // --- CẬP NHẬT bản ghi đã có ---
        console.log(`🛠️ Updating existing approval record (ID: ${existingApproval.id})`);
        dataPayload.approvedBy = approvedBy; // Cập nhật người duyệt
        dataPayload.approvedAt = dayjs().toISOString(); // Cập nhật thời gian duyệt

        approvalRecord = await ApprovedAttendanceModel.query()
          .findById(existingApproval.id)
          .patchAndFetch(dataPayload);

        console.log('✅ Approval record updated!');

      } else {
        // --- THÊM MỚI bản ghi ---
        console.log('🛠️ Creating new approval record...');
        dataPayload.userId = userId;
        dataPayload.month = month;
        dataPayload.approvedBy = approvedBy;
        dataPayload.approvedAt = dayjs().toISOString();

        // Lấy departmentId nếu thiếu
        dataPayload.departmentId = extraData?.departmentId;
        if (!dataPayload.departmentId) {
          try {
            const userResp = await axios.get(`${API_GATEWAY_URL}/api/auth/users/detail/${userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const userData = userResp.data?.data || userResp.data;
            if (userData?.departmentId) dataPayload.departmentId = userData.departmentId;
          } catch (err: any) {
            console.warn('⚠️ Could not fetch departmentId for user:', err?.message || err);
          }
        }

        approvalRecord = await ApprovedAttendanceModel.query().insert(dataPayload);
        console.log('✅ New approval record created:', approvalRecord.id);
      }

      // === Bước 6: Trả về kết quả ===
      return {
        success: true,
        message: `Bảng công đã được ${existingApproval ? 'cập nhật' : 'duyệt'} thành công`,
        data: {
          approvalRecord,
        }
      };

    } catch (error: any) {
      console.error('❌ Error in approveMonthlyAttendance service:', error);
      // Ném lỗi để controller có thể bắt và trả về status 500
      throw new Error('Lỗi trong quá trình duyệt/cập nhật bảng công.');
    }
  }

  /**
   * Kiểm tra trạng thái duyệt
   */
  static async getApprovalStatus(userId: number, month: string): Promise<boolean> {
    return await ApprovedAttendanceModel.isApproved(userId, month);
  }

  /**
   * Lấy danh sách bảng công đã duyệt
   */
  static async getApprovedAttendances(
    month?: string
  ): Promise<any[]> {
    try {
      let query = ApprovedAttendanceModel.query();

      if (month) {
        query = query.where('month', month);
      }

      const approvals = await query.orderBy('approvedAt', 'desc');

      return approvals;
    } catch (error) {
      console.error('❌ Error fetching approved attendances:', error);
      return [];
    }
  }

  /**
   * Lấy đơn OT đã duyệt cho user trong ngày
   */
  static async getApprovedOvertimeApplication(
    userId: number,
    date: string
  ): Promise<any | null> {
    try {
      const response = await axios.get(
        `${APPLICATION_SERVICE_URL}/api/applications/user/${userId}/approved`,
        {
          params: {
            year: dayjs(date).year(),
            month: dayjs(date).month() + 1
          }
        }
      );

      const applications = response.data.data || [];

      // Lọc đơn OT (overtime) cho ngày cụ thể
      const overtimeApp = applications.find((app: any) => {
        if (app.type !== 'overtime') return false;

        // Parse data từ JSON string nếu cần
        const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;

        // Kiểm tra ngày OT có khớp không
        return appData.date === date;
      });

      if (overtimeApp) {
        console.log(`📋 Found approved OT application for user ${userId} on ${date}`);
        return overtimeApp;
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error fetching overtime applications:', error.message);
      return null;
    }
  }

  /**
   * Chấm công tự động (check-in lần đầu, check-out các lần sau)
   * Tích hợp kiểm tra đơn OT đã duyệt
   */
  static async recordAttendance(
    userId: number,
    time: string
  ): Promise<any> {
    try {
      const date = dayjs(time).format('YYYY-MM-DD');

  // Determine month/year for monthly summary
  const monthNum = dayjs(date).month() + 1; // 1-12
      const yearNum = dayjs(date).year();

      // Check monthly summary status (if exists)
      let monthlySummary = await MonthlySummaryModel.query()
        .where('user_id', userId)
        .where('month', monthNum)
        .where('year', yearNum)
        .first();

      if (monthlySummary && monthlySummary.status === 'CLOSED') {
        // If month is closed, do not allow attendance changes
        const err: any = new Error('Tháng này đã được chốt, không thể thay đổi chấm công');
        err.code = 'MONTH_CLOSED';
        throw err;
      }

  // Kiểm tra đã có record hôm nay chưa
      const existingRecord = await TimeAttendanceModel.query()
        .where('userId', userId)
        .where('date', date)
        .first();

      let record;
      let isCheckIn = false;

      // If record exists and day_type indicates non-workday (LEAVE/BUSINESS_TRIP/HOLIDAY) and there's no OT, skip processing
      const isWeekendRecord = existingRecord && existingRecord.day_type && existingRecord.day_type !== 'WORKDAY';

      // Determine if date is a working day via settings
      const workingDaysConfig = await this.getWorkingDaysConfig();
      const isWorkingDay = this.isWorkingDay(date, workingDaysConfig);

      // Check if there's an approved OT for this date (allow weekend check-in only if OT exists)
      const overtimeApp = await this.getApprovedOvertimeApplication(userId, date);

      if (isWeekendRecord && !overtimeApp) {
        console.log(`⚠️ Skipping attendance for ${date} because existing day_type=${existingRecord!.day_type} and no OT`);
        return {
          type: 'skipped',
          reason: `Day is marked as ${existingRecord!.day_type}`,
          record: existingRecord
        };
      }

      // If it's not a working day (weekend) and no OT approved, skip creating new record on first check-in
      if (!isWorkingDay && !existingRecord && !overtimeApp) {
        console.log(`⚠️ Skipping creation of attendance on weekend ${date} with no OT`);
        return { type: 'skipped', reason: 'Weekend without approved OT', record: null };
      }

      if (!existingRecord || !existingRecord.checkInTime) {
        // Lần đầu hoặc chưa có check-in -> Check-in
        isCheckIn = true;
        const recordData: any = {
          userId,
          date,
          checkInTime: time
        };

        // If weekend but there's an OT approved, mark day_type as WORKDAY (for counting) or as 'WEEKEND' but allow OT
        if (!isWorkingDay && overtimeApp) {
          // Prefer marking as WORKDAY to let calculations run; attach an indicator
          recordData.day_type = 'WORKDAY';
        }

        if (existingRecord) {
          record = await TimeAttendanceModel.query()
            .patchAndFetchById(existingRecord.id, recordData);
        } else {
    record = await TimeAttendanceModel.query().insert({ ...recordData, day_type: 'WORKDAY' });
        }

        console.log(`✅ Check-in recorded for user ${userId} at ${time}`);
      } else {
        // Đã có check-in -> Check-out (cập nhật mỗi lần)
        isCheckIn = false;
        const patchData: any = { checkOutTime: time };
        if (!isWorkingDay && !overtimeApp) {
          // Should not reach here due to earlier guards, but keep defensive
          return { type: 'skipped', reason: 'Weekend without OT', record: existingRecord };
        }

        // Ensure day_type remains correct
        patchData.day_type = 'WORKDAY';

        record = await TimeAttendanceModel.query()
          .patchAndFetchById(existingRecord.id, patchData);

        console.log(`✅ Check-out updated for user ${userId} at ${time}`);
      }

  // Note: overtimeApp was possibly fetched earlier
  let otEndTime: dayjs.Dayjs | null = null;

  if (overtimeApp) {
        const appData = typeof overtimeApp.data === 'string'
          ? JSON.parse(overtimeApp.data)
          : overtimeApp.data;

        // Lấy thời gian kết thúc OT từ đơn
        if (appData.endTime) {
          otEndTime = dayjs(`${date} ${appData.endTime}`);
          console.log(`⏰ OT approved until: ${otEndTime.format('HH:mm')}`);
        }
      }

      // Tính toán attendance ngay lập tức (có thể có OT)
      const calculation = await AttendanceCalculationService.calculateAttendance(
        record.checkInTime,
        record.checkOutTime,
        date,
        userId,
        undefined, // token
        otEndTime ? otEndTime.toISOString() : undefined // Truyền thời gian OT nếu có
      );

      // Compute new values for monthly summary delta
      const newDayValues = {
        workDay: (calculation.workHours && calculation.workHours > 0) ? 1 : 0,
        workHours: Number(calculation.workHours || 0),
        lateMinutes: Number(calculation.lateMinutes || 0),
        earlyLeaveMinutes: Number(calculation.earlyDepartureMinutes || 0),
        overtimeHours: Number((calculation.otMinutes || 0) / 60),
        overtimeSalary: Number(calculation.otSalary || 0),
        penalty: Number((calculation.latePenaltyAmount || 0) + (calculation.earlyLeavePenaltyAmount || 0))
      };

      // Determine old day values from existingRecord (before update)
      let oldDayValues = {
        workDay: 0,
        workHours: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeHours: 0,
        overtimeSalary: 0,
        penalty: 0
      };

      if (existingRecord && existingRecord.checkInTime && existingRecord.checkOutTime && (existingRecord.day_type === undefined || existingRecord.day_type === 'WORKDAY')) {
        oldDayValues.workDay = 1;
        oldDayValues.workHours = Number(existingRecord.dailyTotalWorkHours || 0);
        oldDayValues.lateMinutes = Number(existingRecord.lateMinutes || 0);
        oldDayValues.earlyLeaveMinutes = Number(existingRecord.earlyDepartureMinutes || 0);
        oldDayValues.overtimeHours = Number((existingRecord.otMinutes || 0) / 60);
        oldDayValues.overtimeSalary = Number(existingRecord.otSalary || 0);
        oldDayValues.penalty = Number((existingRecord.lateArrivalPenalty || 0) + (existingRecord.earlyLeavePenalty || 0));
      }

      // Cập nhật kết quả tính toán đầy đủ và set day_type
      const updatedRecord = await TimeAttendanceModel.query()
        .patchAndFetchById(record.id, {
          dailyTotalWorkHours: calculation.workHours,
          dailyWorkingUnit: calculation.workHours, // Số công trong ngày
          lateMinutes: calculation.lateMinutes,
          earlyDepartureMinutes: calculation.earlyDepartureMinutes,
          lateArrivalPenalty: calculation.latePenaltyAmount,
          earlyLeavePenalty: calculation.earlyLeavePenaltyAmount,
          otMinutes: calculation.otMinutes,
          otSalary: calculation.otSalary || 0,
          day_type: 'WORKDAY'
        });

      // Update or create monthly summary using subtract-old + add-new
      try {
        if (!monthlySummary) {
          // create new monthly summary
          monthlySummary = await MonthlySummaryModel.query().insert({
            user_id: userId,
            month: monthNum,
            year: yearNum,
            totalWorkDays: newDayValues.workDay,
            totalWorkHours: newDayValues.workHours,
            totalLateMinutes: newDayValues.lateMinutes,
            totalEarlyLeaveMinutes: newDayValues.earlyLeaveMinutes,
            totalOvertimeHours: newDayValues.overtimeHours,
            totalOvertimeSalary: newDayValues.overtimeSalary,
            totalPaidLeaveDays: 0,
            totalPenalty: newDayValues.penalty,
            finalSalary: 0 // will be calculated at approval time
          });
        } else {
          // patch: new = old - oldDay + newDay
          const patchData: any = {};

          patchData.totalWorkDays = Number(monthlySummary.totalWorkDays || 0) - oldDayValues.workDay + newDayValues.workDay;
          patchData.totalWorkHours = Number(monthlySummary.totalWorkHours || 0) - oldDayValues.workHours + newDayValues.workHours;
          patchData.totalLateMinutes = Number(monthlySummary.totalLateMinutes || 0) - oldDayValues.lateMinutes + newDayValues.lateMinutes;
          patchData.totalEarlyLeaveMinutes = Number(monthlySummary.totalEarlyLeaveMinutes || 0) - oldDayValues.earlyLeaveMinutes + newDayValues.earlyLeaveMinutes;
          patchData.totalOvertimeHours = Number(monthlySummary.totalOvertimeHours || 0) - oldDayValues.overtimeHours + newDayValues.overtimeHours;
          patchData.totalOvertimeSalary = Number(monthlySummary.totalOvertimeSalary || 0) - oldDayValues.overtimeSalary + newDayValues.overtimeSalary;
          patchData.totalPenalty = Number(monthlySummary.totalPenalty || 0) - oldDayValues.penalty + newDayValues.penalty;

          await MonthlySummaryModel.query().findById(monthlySummary.id).patch(patchData);
        }
      } catch (err) {
        console.error('❌ Error updating monthly summary:', err);
      }

      return {
        type: isCheckIn ? 'check_in' : 'check_out',
        record: updatedRecord,
        calculation,
        hasOvertimeApproval: !!overtimeApp
      };
    } catch (error) {
      console.error('Error in recordAttendance:', error);
      throw error;
    }
  }
}

import SettingsService from '../SettingsService';
import SalaryService from '../SalaryService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import axios from 'axios';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import {
  checkDateHasLeave,
  checkDateHasBusinessTrip,
  getWorkingDaysConfig,
  isWorkingDay,
  // checkDateHasHoliday as checkHasHoliday
} from './AttendanceHelpers';
import * as AttendanceHelpers from './AttendanceHelpers';
import HolidayModel from '@/Models/HolidayModel';
import knex from 'knex';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);



// Helper function to get user startDate from auth-service database directly
async function getUserStartDate(userId: number): Promise<string | null> {
  let authDbConnection: any = null;
  try {
    // Create direct connection to auth-service database
    authDbConnection = knex({
      client: 'pg',
      connection: {
        host: process.env['DB_HOST'] || 'localhost',
        port: Number(process.env['DB_PORT']) || 5432,
        database: 'auth_service_final', // Auth service database name
        user: process.env['DB_USER'] || 'postgres',
        password: process.env['DB_PASSWORD'] || '123456'
      }
    });

    const user = await authDbConnection('users')
      .where('id', userId)
      .select('startDate')
      .first();

    if (user && user.startDate) {
      const startDate = dayjs(user.startDate).format('YYYY-MM-DD');
      console.log(`✅ [getUserStartDate] User ${userId} startDate from DB: ${startDate}`);
      return startDate;
    }

    console.log(`⚠️ [getUserStartDate] User ${userId} has no startDate in database`);
    return null;
  } catch (e) {
    console.error(`❌ [getUserStartDate] Error fetching user startDate:`, (e as any)?.message);
    return null;
  } finally {
    if (authDbConnection) {
      await authDbConnection.destroy();
    }
  }
}



interface WorkingHours {
  start: string;
  end: string;
}

interface LunchBreak {
  start: string;
  end: string;
}

interface PenaltyConfig {
  rate: number;
}

interface UserSalaryInfo {
  baseSalary: number;
  allowance?: number;
}

/**
 * ✅ KẾT QUẢ TÍNH TOÁN CHẤM CÔNG
 * 
 * Các trường chính:
 * - workHours: Tổng giờ làm việc thực tế (không bao gồm OT)
 * - dailyWorkingUnit: Công cơ bản (không bao gồm OT)
 * - otWorkingUnit: Công OT RAW (chưa nhân hệ số) = overtimeHours / 8
 * - overtimeHours: Số giờ làm thêm thực tế (NEW)
 * - totalWorkingUnit: Tổng công = dailyWorkingUnit + otWorkingUnit
 */
interface AttendanceCalculation {
  workHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  otMinutes: number;
  otSalary: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  penaltyRate: number;
  latePenaltyAmount: number;
  earlyLeavePenaltyAmount: number;
  dailyWorkingUnit: number; // Công cơ bản (không bao gồm OT)
  totalWorkingUnit: number; // Tổng công (bao gồm cả OT)
  otWorkingUnit: number; // Công OT RAW (chưa nhân hệ số)
  overtimeHours?: number; // ✨ Số giờ làm thêm thực tế
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

export class AttendanceCalculationService {
  /**
   * Forces a full recalculation of attendance for a specific user and month.
   * Useful for fixing data inconsistencies or updating past months.
   */
  public static async recalculateMonthlyAttendance(userId: number, month: string): Promise<any> {
    console.log(`♻️ [attendance] Recalculating monthly attendance for User ${userId}, Month ${month}`);

    // 1. Delete ALL auto-generated "Absent" records for this month to allow fresh detection
    // Auto-generated records typically have checkInTime=null and NO associated application causing them to be valid leave
    const startOfMonth = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

    await TimeAttendanceModel.query()
      .delete()
      .where({ userId })
      .whereBetween('date', [startOfMonth, endOfMonth])
      .whereNull('checkInTime')
      .whereNull('checkOutTime');

    // 2. Call the main calculation function
    // We need to import MonthlyReportService here but prevent circular dependency if possible.
    // Actually MonthlyReportService imports AttendanceCalculationService.
    // So we might use a dynamic import or move this method to MonthlyReportService.
    // Let's check imports.
    const { MonthlyReportService } = await import('../MonthlyReportService');
    return await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, startOfMonth);
  }

  public static async calculateTotalLateDays(userId: number, month: string): Promise<number> {
    try {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      const result = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .where('lateMinutes', '>', 0)
        .count('* as count')
        .first() as any;

      const count = result ? parseInt(result.count as string) : 0;
      return count;
    } catch (error) {
      console.error('❌ Error calculating late days:', error);
      return 0;
    }
  }

  public static async calculateTotalEarlyLeaveDays(userId: number, month: string): Promise<number> {
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
      return count;
    } catch (error) {
      console.error('❌ Error calculating early leave days:', error);
      return 0;
    }
  }

  public static async getUserMonthlyAttendance(userId: number, month: string, _token?: string, useMonthlySummaryOnly: boolean = false, preFetchedApps?: any[]): Promise<any | null> {
    console.log(`🔍 [AttendanceCalculationService] getUserMonthlyAttendance: userId=${userId}, month=${month}`);
    try {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      const userStartDate = await getUserStartDate(userId);
      const monthlyRecord = await MonthlySummaryModel.getByUserAndMonth(userId, month);

      if (useMonthlySummaryOnly && monthlyRecord && (monthlyRecord as any)['dailyDetails']) {
        try {
          const dailyDetails = JSON.parse((monthlyRecord as any)['dailyDetails']);
          const isApprovedFlag = await MonthlySummaryModel.isApproved(userId, month);
          return {
            userId,
            user: { id: userId, name: 'N/A', email: 'N/A', departmentId: (monthlyRecord as any)['departmentId'] || 0, department: { id: (monthlyRecord as any)['departmentId'] || 0, name: 'N/A' } },
            month,
            presentDays: parseFloat(((monthlyRecord as any)['presentDays'] ?? 0).toString()) || 0,
            totalWorkHours: parseFloat(((monthlyRecord as any)['totalWorkHours'] ?? 0).toString()) || 0,
            totalOvertimeHours: parseFloat(((monthlyRecord as any)['totalOvertimeHours'] ?? 0).toString()) || 0,
            totalLateDays: parseFloat(((monthlyRecord as any)['lateDays'] ?? 0).toString()) || 0,
            totalEarlyLeaveDays: parseFloat(((monthlyRecord as any)['earlyLeaveDays'] ?? 0).toString()) || 0,
            totalPenalty: parseFloat(((monthlyRecord as any)['totalPenalty'] ?? 0).toString()) || 0,
            totalOvertimeSalary: parseFloat(((monthlyRecord as any)['totalOvertimeSalary'] ?? 0).toString()) || 0,
            // ✨ Full stats from DB
            totalWorkingUnits: parseFloat(((monthlyRecord as any)['totalWorkingUnits'] ?? 0).toString()) || 0,
            totalOtWorkingUnits: parseFloat(((monthlyRecord as any)['totalOtWorkingUnits'] ?? 0).toString()) || 0,
            totalLateMinutes: parseFloat(((monthlyRecord as any)['totalLateMinutes'] ?? 0).toString()) || 0,
            totalEarlyLeaveMinutes: parseFloat(((monthlyRecord as any)['totalEarlyLeaveMinutes'] ?? 0).toString()) || 0,
            unauthorizedAbsenceDays: parseFloat(((monthlyRecord as any)['unauthorizedAbsenceDays'] ?? 0).toString()) || 0,
            approvedLeaveDays: parseFloat(((monthlyRecord as any)['approvedLeaveDays'] ?? 0).toString()) || 0,
            businessTripDays: parseFloat(((monthlyRecord as any)['businessTripDays'] ?? 0).toString()) || 0,
            totalUnauthorizedAbsencePenalty: parseFloat(((monthlyRecord as any)['totalUnauthorizedAbsencePenalty'] ?? 0).toString()) || 0,
            totalLatePenalty: parseFloat(((monthlyRecord as any)['totalLatePenalty'] ?? 0).toString()) || 0,
            totalEarlyLeavePenalty: parseFloat(((monthlyRecord as any)['totalEarlyLeavePenalty'] ?? 0).toString()) || 0,
            totalScheduledDays: parseFloat(((monthlyRecord as any)['totalScheduledDays'] ?? 0).toString()) || 0,
            absentDays: parseFloat(((monthlyRecord as any)['absentDays'] ?? 0).toString()) || 0,
            baseSalary: parseFloat(((monthlyRecord as any)['baseSalary'] ?? 0).toString()) || 0, // ✨ Salary info
            averageWorkHours: parseFloat(((monthlyRecord as any)['averageWorkHours'] ?? 0).toString()) || 0, // ✨ Average work hours from DB
            isApproved: !!isApprovedFlag,
            attendanceData: dailyDetails
          };
        } catch (e) { /* fall through */ }
      }

      const rawAttendanceRows = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      const attendanceMap = new Map<string, any>();
      rawAttendanceRows.forEach((r: any) => {
        const dateKey = dayjs(r.date).format('YYYY-MM-DD');
        attendanceMap.set(dateKey, r.toJSON ? r.toJSON() : { ...r });
      });

      const workingDaysConfig = await getWorkingDaysConfig();
      const holidayRows: any[] = await HolidayModel.query()
        .where(function () {
          this.whereBetween('start_date', [startDate, endDate])
            .orWhereBetween('end_date', [startDate, endDate])
            .orWhere(function () {
              this.where('start_date', '<=', startDate).andWhere('end_date', '>=', endDate);
            });
        })
        .select('*')
        .catch(() => []);

      const holidaySet = new Set<string>();
      const holidayInfoMap = new Map<string, { name: string; isPublic: boolean }>();
      for (const hr of holidayRows) {
        if (hr.start_date && hr.end_date) {
          let cur = dayjs(hr.start_date);
          const end = dayjs(hr.end_date);
          while (cur.isBefore(end) || cur.isSame(end, 'day')) {
            const dateKey = cur.format('YYYY-MM-DD');
            holidaySet.add(dateKey);
            holidayInfoMap.set(dateKey, { name: hr.name || 'Ngày lễ', isPublic: (hr.importance || 0) >= 2 });
            cur = cur.add(1, 'day');
          }
        }
      }

      const approvedApplications: ApprovedLeaveApplication[] = [];
      if (preFetchedApps) {
        approvedApplications.push(...preFetchedApps);
      } else {
        try {
          const [year, monthNum] = month.split('-');
          const url = `${process.env['APPLICATION_SERVICE_URL'] || 'http://127.0.0.1:4008'}/api/applications/user/${userId}/approved`;
          const appResp = await axios.get(url, { params: { year: parseInt(year || ''), month: parseInt(monthNum || '') } });
          const apps = appResp.data.data || [];
          approvedApplications.push(...apps);
        } catch (e) { console.error('Error fetching apps:', (e as any).message); }
      }

      const daysInMonth = dayjs(`${month}-01`).daysInMonth();
      const enrichedAttendanceData: any[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = dayjs(`${month}-${String(day).padStart(2, '0')}`);
        const dateKey = currentDate.format('YYYY-MM-DD');

        if (userStartDate && dayjs(dateKey).isBefore(userStartDate, 'day')) continue;

        const isHoliday = holidaySet.has(dateKey);
        const holidayInfo = holidayInfoMap.get(dateKey);
        const isWork = isWorkingDay(dateKey, workingDaysConfig);
        const attendanceRecord = attendanceMap.get(dateKey);

        // 🔍 DEBUG LOG: Trace specific dates or all dates
        if (dateKey === '2026-02-12' || dateKey.endsWith('12')) {
          console.log(`🔍 [${dateKey}] Loop Start. isHoliday=${isHoliday}, hasRecord=${!!attendanceRecord}, RawCheckIn=${attendanceRecord?.checkInTime}`);
        }
        const leaveCheck = checkDateHasLeave(dateKey, approvedApplications as any);
        const businessTripCheck = checkDateHasBusinessTrip(dateKey, approvedApplications as any);

        const otApp = approvedApplications.find(a => {
          if (a.type !== 'overtime') return false;
          const d = typeof a.data === 'string' ? JSON.parse(a.data) : a.data;
          const appDate = d.overtimeDate || d.date;
          const normalizedAppDate = appDate ? dayjs(appDate).format('YYYY-MM-DD') : null;
          return normalizedAppDate === dateKey;
        });
        const hasApprovedOT = !!otApp;

        let dayRecord: any = {
          date: currentDate.format('YYYY-MM-DD'),
          userId,
          isHoliday,
          holidayName: holidayInfo?.name || null,
          isPublicHoliday: holidayInfo?.isPublic || false,
          isWorkingDay: isWork,
          hasApprovedOT,
          hasApprovedLeave: leaveCheck.hasLeave,
          leaveType: leaveCheck.leaveType,
          isPaidLeave: (leaveCheck as any).isPaidLeave,
          hasBusinessTrip: businessTripCheck.hasBusinessTrip,
          type: leaveCheck.hasLeave ? leaveCheck.leaveType : (businessTripCheck.hasBusinessTrip ? 'business-trip' : 'attendance')
        };

        // ✨ ATTACH OVERTIME DATA for any day with approved OT
        if (hasApprovedOT) {
          const appData = typeof otApp!.data === 'string' ? JSON.parse(otApp!.data) : otApp!.data;
          dayRecord.overtimeData = {
            hasApprovedOT: true,
            application: {
              ...otApp,
              data: appData
            }
          };
        }

        if (leaveCheck.hasLeave || businessTripCheck.hasBusinessTrip) {
          Object.assign(dayRecord, {
            id: null, checkInTime: null, checkOutTime: null,
            lateMinutes: 0, earlyDepartureMinutes: 0, dailyTotalWorkHours: 0,
            lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otSalary: 0,
            totalWorkingUnit: 0, otWorkingUnit: 0, dailyWorkingUnit: 0
          });
        } else if (attendanceRecord) {
          Object.assign(dayRecord, {
            ...attendanceRecord,
            date: dayjs(attendanceRecord.date).format('YYYY-MM-DD'),
            // ✨ Format times safely to HH:mm in VN timezone for frontend
            checkInTime: (() => {
              const val = attendanceRecord.checkInTime;
              if (!val) return null;
              if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(val)) return val.substring(0, 5);
              const d = dayjs(val);
              return d.isValid() ? d.tz('Asia/Ho_Chi_Minh').format('HH:mm') : null;
            })(),
            checkOutTime: (() => {
              const val = attendanceRecord.checkOutTime;
              if (!val) return null;
              if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(val)) return val.substring(0, 5);
              const d = dayjs(val);
              return d.isValid() ? d.tz('Asia/Ho_Chi_Minh').format('HH:mm') : null;
            })()
          });
          // Ensure calculated hasApprovedOT is not clobbered by DB record
          dayRecord.hasApprovedOT = hasApprovedOT;
        } else {
          Object.assign(dayRecord, {
            id: null, checkInTime: null, checkOutTime: null,
            lateMinutes: 0, earlyDepartureMinutes: 0, dailyTotalWorkHours: 0,
            lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otSalary: 0,
            totalWorkingUnit: 0, otWorkingUnit: 0, dailyWorkingUnit: 0,
            status: (isWork && dayjs(dateKey).isBefore(dayjs(), 'day')) ? 0 : undefined,
            type: (isWork && dayjs(dateKey).isBefore(dayjs(), 'day')) ? 'absent' : 'attendance'
          });
        }

        // ✨ Special override for any day with approved OT (Holiday or Normal day)
        // Re-calculate on the fly to ensure UI shows the effect of the OT app window
        if (hasApprovedOT) {
          const appData = dayRecord.overtimeData.application.data;

          // ✨ DETECT DURATION: Support multiple field names
          const rawDuration = appData.totalHours || appData.overtimeHours || appData.overtime_hours || appData.duration || 0;
          const otDuration = parseFloat(rawDuration.toString().replace(/[^0-9.]/g, ''));

          // Normalize start time
          let rawStart = appData.startTime || appData.start_time || '08:00';
          let startTimeFormatted = rawStart;
          if (rawStart.includes('T') || rawStart.length > 8) {
            startTimeFormatted = dayjs(rawStart).tz('Asia/Ho_Chi_Minh').format('HH:mm');
          }

          let endTimeFormatted: string;
          let rawEnd = appData.endTime || appData.end_time;

          if (!rawEnd && otDuration > 0) {
            const fullStart = startTimeFormatted.length <= 5 ? `${dateKey} ${startTimeFormatted}` : startTimeFormatted;
            const startTimeDerive = dayjs(fullStart).tz('Asia/Ho_Chi_Minh');
            const lunchBreak = await AttendanceCalculationService.getSettings().then(s => s.lunchBreak);

            const extendedEnd = AttendanceCalculationService.calculateExtendedEndTime(
              startTimeDerive,
              otDuration,
              lunchBreak,
              dateKey
            );
            endTimeFormatted = extendedEnd.format('HH:mm');
          } else if (!rawEnd) {
            endTimeFormatted = '17:00';
          } else {
            endTimeFormatted = rawEnd.includes('T') || rawEnd.length > 8
              ? dayjs(rawEnd).tz('Asia/Ho_Chi_Minh').format('HH:mm')
              : rawEnd.substring(0, 5);
          }

          // ✨ Update shift name and window to reflect the OT application
          // ONLY if it is a Holiday or Non-working day (Weekend/Day Off).
          // On Normal Working Days, we want to preserve the actual Shift info (e.g. Ca Hành Chính).
          if (isHoliday || !isWork) {
            dayRecord.shift = {
              name: isHoliday ? 'Làm thêm ngày lễ' : 'Làm thêm ngày nghỉ',
              start_time: startTimeFormatted,
              end_time: endTimeFormatted,
              working_unit: 0 // Optional but safe
            };
            dayRecord.shiftName = dayRecord.shift.name;
          }

          // ✨ RE-CALCULATE for accurate UI
          if (attendanceRecord && (attendanceRecord.checkInTime || attendanceRecord.checkOutTime)) {
            try {
              const calc = await AttendanceCalculationService.calculateAttendance(
                attendanceRecord.checkInTime,
                attendanceRecord.checkOutTime,
                dateKey,
                userId,
                _token,
                endTimeFormatted,
                isHoliday,
                undefined,
                startTimeFormatted
              );

              // Sync results to dayRecord
              dayRecord.lateMinutes = calc.lateMinutes;
              dayRecord.earlyDepartureMinutes = calc.earlyDepartureMinutes;
              dayRecord.lateArrivalPenalty = calc.latePenaltyAmount;
              dayRecord.earlyLeavePenalty = calc.earlyLeavePenaltyAmount;
              dayRecord.dailyTotalWorkHours = calc.workHours;
              dayRecord.totalWorkingUnit = calc.totalWorkingUnit;
              dayRecord.otWorkingUnit = calc.otWorkingUnit;
              dayRecord.dailyWorkingUnit = calc.dailyWorkingUnit;
              dayRecord.overtimeHours = calc.overtimeHours;
            } catch (e) {
              console.error('Error recalcing OT day:', e);
            }
          } else {
            // ✨ Planned OT without Check-in: Calculate based on application hours (full units)
            const settings = await AttendanceCalculationService.getSettings();
            const appHours = otDuration;
            const holidayRateMultiplier = settings.holidayRate?.rate || 3.0;
            const weekendRateMultiplier = settings.overtimeRate?.rate || 1.5;
            const rate = isHoliday ? holidayRateMultiplier : (isWork ? 1.5 : weekendRateMultiplier);

            const units = (appHours / 8) * rate;
            dayRecord.dailyWorkingUnit = 0;
            dayRecord.otWorkingUnit = units / rate;
            dayRecord.totalWorkingUnit = units;
            dayRecord.overtimeHours = appHours;
            console.log(`✨ [${dateKey}] Planned OT without Record: adding ${units.toFixed(2)} units`);
          }
        }
        else if (isHoliday || !isWork) {
          // ✨ Holiday / Weekend logic for days WITHOUT approved OT
          // Cuối tuần hoặc ngày lễ mà KHÔNG có đơn OT → không tính công
          // Giữ lại checkInTime/checkOutTime để hiển thị trên lịch nhưng zeroes working units
          if (attendanceRecord && (attendanceRecord.checkInTime || attendanceRecord.checkOutTime)) {
            // User checked in on holiday/weekend but no OT app -> keep times for display, zero units
            dayRecord.dailyWorkingUnit = 0;
            dayRecord.totalWorkingUnit = 0;
            dayRecord.otWorkingUnit = 0;
            dayRecord.overtimeHours = 0;
            dayRecord.lateMinutes = 0;
            dayRecord.earlyDepartureMinutes = 0;
            dayRecord.lateArrivalPenalty = 0;
            dayRecord.earlyLeavePenalty = 0;
            console.log(`📅 [${dateKey}] Weekend/Holiday no OT app: keeping checkIn=${dayRecord.checkInTime}, checkOut=${dayRecord.checkOutTime}, units=0`);
          } else {
            dayRecord.shift = null;
            dayRecord.shiftName = null;
            dayRecord.checkInTime = null;
            dayRecord.checkOutTime = null;
            dayRecord.dailyTotalWorkHours = 0;
            dayRecord.dailyWorkingUnit = 0;
            dayRecord.totalWorkingUnit = 0;
            dayRecord.otWorkingUnit = 0;
            dayRecord.lateMinutes = 0;
            dayRecord.earlyDepartureMinutes = 0;
            dayRecord.lateArrivalPenalty = 0;
            dayRecord.earlyLeavePenalty = 0;
          }
        }


        // Final unit calculation for leave/trip markers
        // ✨ FIX: Apply units regardless of attendanceRecord existence if it is a leave/trip day
        if (!isHoliday) {
          if (dayRecord.hasApprovedLeave && dayRecord.isPaidLeave) {
            dayRecord.dailyWorkingUnit = 1.0;
            dayRecord.totalWorkingUnit = 1.0;
          } else if (dayRecord.hasBusinessTrip) {
            dayRecord.dailyWorkingUnit = 1.0;
            dayRecord.totalWorkingUnit = 1.0;
          }
        }

        if (dateKey.includes('12')) {
          console.log(`🔍 [${dateKey}] Loop End. Final CheckIn=${dayRecord.checkInTime}, Unit=${dayRecord.dailyWorkingUnit}, Shift=${dayRecord.shiftName}`);
        }
        enrichedAttendanceData.push(dayRecord);
      }

      // Aggregate totals
      let totalWorkDays = 0, totalWorkHours = 0, totalPenalty = 0, totalWorkingUnits = 0, totalOtWorkingUnits = 0;
      let totalOtHours = 0, totalPaidLeaveDays = 0, totalUnpaidLeaveDays = 0;

      const todayStr = dayjs().format('YYYY-MM-DD');
      enrichedAttendanceData.forEach((r) => {
        if (dayjs(r.date).isAfter(todayStr, 'day')) return;

        if (r.checkInTime && r.checkOutTime && r.isWorkingDay) totalWorkDays++;
        totalWorkHours += parseFloat((r.dailyTotalWorkHours || 0).toString());
        totalPenalty += parseFloat((r.lateArrivalPenalty || 0).toString()) + parseFloat((r.earlyLeavePenalty || 0).toString());

        const units = parseFloat((r.totalWorkingUnit || 0).toString());
        totalWorkingUnits += units;

        totalOtWorkingUnits += parseFloat((r.otWorkingUnit || 0).toString());
        totalOtHours += parseFloat((r.overtimeHours || 0).toString());

        if (r.hasApprovedLeave) {
          if (r.isPaidLeave) totalPaidLeaveDays++;
          else totalUnpaidLeaveDays++;
        }
      });

      const totalLateDays = await AttendanceCalculationService.calculateTotalLateDays(userId, month);
      const totalEarlyLeaveDays = await AttendanceCalculationService.calculateTotalEarlyLeaveDays(userId, month);
      const isApproved = await MonthlySummaryModel.isApproved(userId, month);

      // ✨ FORCE SYNC: Ensure totalWorkingUnits matches the sum of dailyDetails
      // Only sum up PAST days for totals? User complained "Total Work" is too high.


      const finalUnits = enrichedAttendanceData.reduce((acc, r) => {
        if (dayjs(r.date).isAfter(todayStr, 'day')) return acc;
        return acc + (parseFloat(r.totalWorkingUnit?.toString() || '0'));
      }, 0);

      const finalOtUnits = enrichedAttendanceData.reduce((acc, r) => {
        if (dayjs(r.date).isAfter(todayStr, 'day')) return acc;
        return acc + (parseFloat(r.otWorkingUnit?.toString() || '0'));
      }, 0);

      // Recalculate working hours/penalty for past days only as well
      const finalWorkHours = enrichedAttendanceData.reduce((acc, r) => {
        if (dayjs(r.date).isAfter(todayStr, 'day')) return acc;
        return acc + (parseFloat(r.dailyTotalWorkHours?.toString() || '0'));
      }, 0);

      const finalPenalty = enrichedAttendanceData.reduce((acc, r) => {
        if (dayjs(r.date).isAfter(todayStr, 'day')) return acc;
        return acc + (parseFloat(r.lateArrivalPenalty?.toString() || '0')) + (parseFloat(r.earlyLeavePenalty?.toString() || '0'));
      }, 0);

      // Return real-time calculated totals to ensure UI accuracy
      return {
        userId, month,
        user: { id: userId, name: 'N/A', email: 'N/A' },
        presentDays: totalWorkDays,
        totalWorkHours: Math.round(finalWorkHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOtHours * 100) / 100,
        totalLateDays: totalLateDays,
        totalEarlyLeaveDays: totalEarlyLeaveDays,
        totalPenalty: Math.round(finalPenalty * 100) / 100,
        totalWorkingUnits: Number(finalUnits.toFixed(2)),
        totalOtWorkingUnits: Number(finalOtUnits.toFixed(2)),
        totalPaidLeaveDays,
        totalUnpaidLeaveDays,
        approvedLeaveDays: totalPaidLeaveDays + totalUnpaidLeaveDays,
        isApproved: !!isApproved,
        attendanceData: enrichedAttendanceData
      };
    } catch (error) {
      console.error('❌ Error getting user monthly attendance:', error);
      return null;
    }
  }

  public static async getApprovedOvertimeApplication(userId: number, date: string): Promise<any | null> {
    // Keep minimal logs here: call + result or error.
    console.log('getApprovedOvertimeApplication called', { userId, date });
    try {
      const serviceUrl = process.env['APPLICATION_SERVICE_URL'] || 'http://127.0.0.1:4008';
      const year = dayjs(date).year();
      const month = dayjs(date).month() + 1;
      const apiUrl = `${serviceUrl}/api/applications/user/${userId}/approved`;
      console.log('Fetching approved applications', { apiUrl, year, month });

      const response = await axios.get(apiUrl, { params: { year, month }, timeout: 10000 });
      const applications = response.data?.data || [];
      console.log('✅ API response:', { total: applications.length, status: response.status });

      // Find the first matching approved overtime app by comparing dates in VN timezone
      const overtimeApp = applications.find((app: any) => {
        // Accept different representations of approved status (string 'approved' or numeric 1)
        const isApprovedStatus = app.status === 'approved' || app.status === 1 || app.status === '1' || (typeof app.status === 'string' && app.status.toLowerCase() === 'approved');

        console.log(`🔍 Checking app ${app.id}:`, { type: app.type, status: app.status, isApprovedStatus });

        if (app.type !== 'overtime' || !isApprovedStatus) return false;

        const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
        const otDate = appData.overtimeDate || appData.date;
        if (!otDate) {
          console.log(`  ⚠️ App ${app.id}: No overtimeDate/date field`);
          return false;
        }

        const normalizedOtDate = dayjs(otDate).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
        const normalizedCheckDate = dayjs(date).format('YYYY-MM-DD');

        console.log(`  📅 App ${app.id} date comparison:`, {
          otDateUTC: otDate,
          otDateVN: normalizedOtDate,
          checkDate: normalizedCheckDate,
          match: normalizedOtDate === normalizedCheckDate
        });

        return normalizedOtDate === normalizedCheckDate;
      });

      if (overtimeApp) console.log('Found OT app', { id: overtimeApp.id });
      return overtimeApp || null;
    } catch (error: any) {
      console.error('Error fetching approved OT applications:', error?.message || error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
      }
      return null;
    }
  }

  // Lấy thông tin lương của user từ salary-service
  private static async getUserSalaryInfo(userId: number, token?: string): Promise<UserSalaryInfo | null> {
    try {
      console.log(`🔍 Getting salary info for user ${userId} from salary-service...`);

      // Use SalaryService to fetch from salary-service
      const salaryInfo = await SalaryService.fetchSalary(userId, token);

      if (salaryInfo) {
        console.log('✅ Salary info retrieved from salary-service:', salaryInfo);
        return salaryInfo;
      }

      console.log('⚠️ Will set penalty to 0 and continue attendance recording');
      return null;
    } catch (error) {
      console.error('❌ Error getting user salary info from salary-service:', error);
      console.log('⚠️ Will set penalty to 0 and continue attendance recording');
      return null;
    }
  }

  static async calculateTotalLeaveDays(_userId: number, _month: string): Promise<{ paid: number, unpaid: number }> {
    // Helper to count leave days if needed, but simpler to do in aggregation
    return { paid: 0, unpaid: 0 };
  }

  // Tính toán tiền phạt dựa trên lương thực tế
  private static calculatePenaltyAmount(
    minutes: number,
    salaryInfo: UserSalaryInfo | null,
    penaltyRatePercent: number
  ): number {
    if (!salaryInfo || !salaryInfo.baseSalary || minutes <= 0) {
      return 0;
    }

    // New formula requested:
    // Penalty amount = baseMonthlySalary * rate * minutes
    // where `rate` is taken from settings and is a fraction per minute (e.g. 0.0001)
    const baseSalary = parseFloat(salaryInfo.baseSalary.toString());
    const penaltyAmount = baseSalary * penaltyRatePercent * minutes;

    console.log(`💸 Penalty calculation for ${minutes} minutes:`);
    console.log(`- Base monthly salary: ${baseSalary.toLocaleString('vi-VN')} VND`);
    console.log(`- Penalty rate (fraction per minute): ${penaltyRatePercent}`);
    console.log(`- Minutes: ${minutes}`);
    console.log(`- Formula: baseSalary * rate * minutes = ${baseSalary} * ${penaltyRatePercent} * ${minutes}`);
    console.log(`- Penalty amount: ${penaltyAmount.toLocaleString('vi-VN')} VND`);

    return Math.round(penaltyAmount * 100) / 100; // Round to 2 decimal places
  }

  public static async getSettings() {
    console.log('🔧 ATTENDANCE CALCULATION SERVICE - Getting settings...');
    try {
      // Use SettingsService (attendance-service) to fetch attendance-related settings
      const [workingHoursVal, lunchBreakVal, overtimeRateVal, holidayRateVal, otRateInUnits, holidayOtRateInUnits, penaltyRateVal] = await Promise.all([
        SettingsService.getSettingValue('WorkingHours'),
        SettingsService.getSettingValue('LunchBreak'),
        SettingsService.getSettingValue('OvertimeRate'),
        SettingsService.getSettingValue('HolidayRate'),
        SettingsService.getSettingValue('OvertimeRateInUnits'),
        SettingsService.getSettingValue('HolidayOvertimeRateInUnits'),
        SettingsService.getSettingValue('PenaltyRate'),
      ]);

      const defaults = this.getDefaultSettings();

      return {
        workingHours: workingHoursVal || defaults.workingHours,
        lunchBreak: lunchBreakVal || defaults.lunchBreak,
        overtimeRate: otRateInUnits || overtimeRateVal || defaults.overtimeRate,
        holidayRate: holidayOtRateInUnits || holidayRateVal || defaults.holidayRate,
        // Use penalty rate from local settings, fallback to default
        penaltyRate: penaltyRateVal ? { rate: penaltyRateVal.rate } : defaults.penaltyRate
      };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return this.getDefaultSettings();
    }
  }

  public static getDefaultSettings() {
    return {
      workingHours: { start: '08:00', end: '17:00' },
      lunchBreak: { start: '12:00', end: '13:00' },
      overtimeRate: { rate: 1.5 },
      holidayRate: { rate: 3.0 },
      // penaltyRate is fraction per minute (e.g. 0.0001 == 0.01% per minute)
      penaltyRate: { rate: 0.0001 }
    };
  }

  static async calculateAttendance(
    checkInTime: string | null,
    checkOutTime: string | null,
    date: string,
    userId?: number,
    token?: string,
    approvedOtEndTime?: string | null,
    isHoliday?: boolean, // Thêm tham số để xác định ngày lễ
    shiftInfo?: { id: number; name: string; start_time: string; end_time: string; working_unit: number; is_default: boolean }, // ✨ Shift info
    approvedOtStartTime?: string | null, // ✨ OT start time để tính OT chính xác
    isWeekend?: boolean // ✨ New param for Saturday/Sunday
  ): Promise<AttendanceCalculation & { standardHours: number }> {
    console.log('🧮 Starting attendance calculation for:', { date, checkInTime, checkOutTime, userId, approvedOtEndTime, isHoliday, shiftInfo });

    // ✨ Auto-detect holiday if not explicit
    if (isHoliday === undefined) {
      const holidayCheck = await AttendanceHelpers.checkDateHasHoliday(date as string);
      isHoliday = holidayCheck.isHoliday;
      if (isHoliday) console.log(`🎉 Auto-detected holiday: ${holidayCheck.holidayName || 'Unknown'}`);
    }

    const settings = await this.getSettings();
    const lunchBreak = settings.lunchBreak as LunchBreak;
    const penaltyRate = (settings.penaltyRate as PenaltyConfig).rate;

    // ✨ Sử dụng shift info hoặc OT time nếu có
    let workingHours: WorkingHours;
    // Tính số giờ chuẩn (standardHours)
    let standardHours = 8;
    // ✨ Biến lưu số giờ OT đã duyệt để dùng khi tính công ngày lễ
    let approvedOtDurationHours = 0;

    // ✨ ƯU TIÊN 0: Nếu ngày lễ nhưng KHÔNG có đơn OT -> Coi như ngày nghỉ (không tính công)
    // "nếu không có đơn OT thì dù có chấm công thì ... không được tính"
    if (isHoliday && (!approvedOtStartTime || !approvedOtEndTime)) {
      console.log('🎉 Holiday with NO Approved OT. Treating as non-working day (0 stats).');
      return {
        workHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        otMinutes: 0,
        otSalary: 0,
        isLate: false,
        isEarlyLeave: false,
        penaltyRate,
        latePenaltyAmount: 0,
        earlyLeavePenaltyAmount: 0,
        dailyWorkingUnit: 0,
        totalWorkingUnit: 0,
        otWorkingUnit: 0,
        overtimeHours: 0,
        standardHours: 0
      };
    }

    // ✨ LOGIC TÁCH BIỆT: Ngày Thường vs Ngày Lễ/Cuối Tuần
    const isNormalWorkingDay = !isHoliday && !isWeekend;

    if (isNormalWorkingDay) {
      // 🟢 NGÀY THƯỜNG: Ưu tiên Ca làm việc (Shift) để tính Late/Early
      if (shiftInfo) {
        workingHours = {
          start: shiftInfo.start_time.substring(0, 5), // '08:00:00' -> '08:00'
          end: shiftInfo.end_time.substring(0, 5)
        };
        // Tính số giờ chuẩn của ca (trừ nghỉ trưa)
        const start = dayjs(`${date} ${shiftInfo.start_time}`).tz('Asia/Ho_Chi_Minh');
        const end = dayjs(`${date} ${shiftInfo.end_time}`).tz('Asia/Ho_Chi_Minh');
        const diffMinutes = end.diff(start, 'minute');
        const lunchBreakMinutes = diffMinutes > 360 ? 60 : 0; // Nếu ca > 6h thì trừ 1h nghỉ trưa
        standardHours = (diffMinutes - lunchBreakMinutes) / 60;
        console.log(`📋 NORMAL DAY: Sử dụng shift ${shiftInfo.name} (${workingHours.start}-${workingHours.end}), standardHours=${standardHours}h`);
      } else {
        // Fallback: dùng settings cũ
        workingHours = settings.workingHours as WorkingHours;
        const start = dayjs(`${date} ${workingHours.start}`).tz('Asia/Ho_Chi_Minh');
        const end = dayjs(`${date} ${workingHours.end}`).tz('Asia/Ho_Chi_Minh');
        const diff = end.diff(start, 'minute');
        if (diff > 0) standardHours = diff / 60;
        console.log(`📋 NORMAL DAY: Sử dụng default settings (${workingHours.start}-${workingHours.end})`);
      }

      // Nếu có OT vào ngày thường, chỉ tính duration để log, KHÔNG đè workingHours
      if (approvedOtEndTime && approvedOtStartTime) {
        const startStr = approvedOtStartTime.length <= 8 ? `${date} ${approvedOtStartTime}` : approvedOtStartTime;
        const endStr = approvedOtEndTime.length <= 8 ? `${date} ${approvedOtEndTime}` : approvedOtEndTime;
        const start = dayjs(startStr).tz('Asia/Ho_Chi_Minh');
        const end = dayjs(endStr).tz('Asia/Ho_Chi_Minh');
        approvedOtDurationHours = end.diff(start, 'hour', true);
        console.log(`🔥 NORMAL DAY has OT: ${approvedOtDurationHours}h. Keeping Shift as standard frame.`);
      }
    } else {
      // 🔴 NGÀY LỄ / CUỐI TUẦN: Ưu tiên Đơn Tăng Ca (OT Application)
      if (approvedOtEndTime && approvedOtStartTime) {
        // Extract HH:mm from ISO strings if needed, or use as is if already HH:mm
        const startTime = approvedOtStartTime.includes('T') ? dayjs(approvedOtStartTime).format('HH:mm') : approvedOtStartTime.substring(0, 5);
        const endTime = approvedOtEndTime.includes('T') ? dayjs(approvedOtEndTime).format('HH:mm') : approvedOtEndTime.substring(0, 5);

        workingHours = {
          start: startTime,
          end: endTime
        };

        const startStr = approvedOtStartTime.length <= 8 ? `${date} ${approvedOtStartTime}` : approvedOtStartTime;
        const endStr = approvedOtEndTime.length <= 8 ? `${date} ${approvedOtEndTime}` : approvedOtEndTime;

        const start = dayjs(startStr).tz('Asia/Ho_Chi_Minh');
        const end = dayjs(endStr).tz('Asia/Ho_Chi_Minh');
        const diffMinutes = end.diff(start, 'minute');

        // Deduct lunch break for holiday/weekend OT shifts using the setting
        const lunchOverlap = this.calculateLunchBreakTime(start, end, lunchBreak, date);
        standardHours = Math.max(0, (diffMinutes - lunchOverlap) / 60);
        approvedOtDurationHours = standardHours; // Lưu lại
        console.log(`🎉 HOLIDAY/WEEKEND: Calculated standardHours based on OT: ${standardHours}h (Duration: ${diffMinutes}m, Lunch: ${lunchOverlap}m)`);
      } else {
        // Không có OT vào ngày nghỉ -> Không có giờ làm chuẩn
        workingHours = { start: '00:00', end: '00:00' };
        standardHours = 0;
        console.log(`🎉 HOLIDAY/WEEKEND with NO OT: Standard Hours = 0`);
      }
    }

    // Lấy thông tin lương của user nếu có userId
    let salaryInfo: UserSalaryInfo | null = null;
    if (userId) {
      salaryInfo = await this.getUserSalaryInfo(userId, token);
    }

    console.log('⚙️ Using settings:', { workingHours, lunchBreak, penaltyRate, standardHours });
    console.log('💰 User salary info:', salaryInfo);
    console.log('🎉 Is holiday:', isHoliday);

    // Nếu không có check-in thì return default
    if (!checkInTime) {
      console.log('❌ No check-in time provided');
      return {
        workHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        otMinutes: 0,
        otSalary: 0,
        isLate: false,
        isEarlyLeave: false,
        penaltyRate,
        latePenaltyAmount: 0,
        earlyLeavePenaltyAmount: 0,
        dailyWorkingUnit: 0,
        totalWorkingUnit: 0,
        otWorkingUnit: 0,
        overtimeHours: 0,
        standardHours
      };
    }

    // Convert all times to Vietnam timezone (UTC+7) for consistent calculation
    const checkIn = dayjs.utc(checkInTime).tz('Asia/Ho_Chi_Minh');
    const expectedCheckIn = dayjs(`${date} ${workingHours.start}`).tz('Asia/Ho_Chi_Minh');
    const expectedCheckOut = dayjs(`${date} ${workingHours.end}`).tz('Asia/Ho_Chi_Minh');

    console.log('🕐 Time comparison (Vietnam timezone):');
    console.log('- Check-in raw input:', checkInTime);
    console.log('- Check-in in UTC:', dayjs(checkInTime).utc().format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Check-in in Vietnam:', checkIn.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Expected check-in:', expectedCheckIn.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Expected check-out:', expectedCheckOut.format('YYYY-MM-DD HH:mm:ss'));

    // ✨ Lấy grace period từ settings (mặc định 0)
    const allowedLateMinutesVal = await SettingsService.getSettingValue('AllowedLateMinutes');
    const allowedLateMinutes = allowedLateMinutesVal ? parseInt(allowedLateMinutesVal.value) : 0;

    // Tính late minutes - trừ đi thời gian cho phép đi muộn
    const rawLateMinutes = checkIn.isAfter(expectedCheckIn)
      ? checkIn.diff(expectedCheckIn, 'minute')
      : 0;
    const lateMinutes = Math.max(0, rawLateMinutes - allowedLateMinutes);

    if (rawLateMinutes > 0 && lateMinutes === 0) {
      console.log(`✅ [attendance] Late but within grace period (${rawLateMinutes} <= ${allowedLateMinutes}m) -> Not late.`);
    }

    console.log('⏰ Late calculation:');
    console.log('- checkIn.isAfter(expectedCheckIn):', checkIn.isAfter(expectedCheckIn));
    console.log('- Diff in minutes:', checkIn.diff(expectedCheckIn, 'minute'));
    console.log('- Final lateMinutes:', lateMinutes);

    let result: AttendanceCalculation = {
      workHours: 0,
      lateMinutes,
      earlyDepartureMinutes: 0,
      otMinutes: 0,
      otSalary: 0,
      isLate: lateMinutes > 0,
      isEarlyLeave: false,
      penaltyRate,
      latePenaltyAmount: 0,
      earlyLeavePenaltyAmount: 0,
      dailyWorkingUnit: 0,
      totalWorkingUnit: 0,
      otWorkingUnit: 0,
      overtimeHours: 0
    };

    // Tính toán tiền phạt đi muộn ngay cả khi chưa có check-out
    if (salaryInfo && lateMinutes > 0) {
      result.latePenaltyAmount = this.calculatePenaltyAmount(
        lateMinutes,
        salaryInfo,
        penaltyRate
      );
      console.log('💰 Late penalty calculated (at check-in):', result.latePenaltyAmount);
    }

    // Nếu có check-out thì tính toán chi tiết
    if (checkOutTime) {
      const checkOut = dayjs.utc(checkOutTime).tz('Asia/Ho_Chi_Minh');
      console.log('- Actual check-out:', checkOut.format('YYYY-MM-DD HH:mm:ss'));

      // Tính early departure minutes - chỉ tính nếu check-out sớm hơn giờ quy định
      const earlyDepartureMinutes = checkOut.isBefore(expectedCheckOut)
        ? expectedCheckOut.diff(checkOut, 'minute')
        : 0;

      result.earlyDepartureMinutes = earlyDepartureMinutes;
      result.isEarlyLeave = earlyDepartureMinutes > 0;

      console.log('🏃 Early departure calculation:', { earlyDepartureMinutes });

      // Tính tổng giờ làm việc (trừ lunch break)
      const totalMinutes = checkOut.diff(checkIn, 'minute');
      const lunchBreakMinutes = this.calculateLunchBreakTime(
        checkIn,
        checkOut,
        lunchBreak,
        date
      );

      const workMinutes = Math.max(0, totalMinutes - lunchBreakMinutes);
      result.workHours = Math.round((workMinutes / 60) * 100) / 100; // Round to 2 decimal places

      console.log('💼 Work hours calculation:');
      console.log('- Total minutes:', totalMinutes);
      console.log('- Lunch break minutes:', lunchBreakMinutes);
      console.log('- Actual work minutes:', workMinutes);
      console.log('- Work hours:', result.workHours);

      // Tính overtime nếu có đơn OT đã duyệt
      console.log('\n🔍 ===== BẮT ĐẦU TÍNH OT =====');
      console.log('📋 Thông tin kiểm tra OT:');
      console.log('  - Có approvedOtEndTime?:', !!approvedOtEndTime);
      console.log('  - approvedOtEndTime:', approvedOtEndTime);
      console.log('  - approvedOtStartTime:', approvedOtStartTime);
      console.log('  - checkOutTime:', checkOut.format('HH:mm:ss'));
      console.log('  - expectedCheckOutTime (hết giờ làm việc):', expectedCheckOut.format('HH:mm:ss'));
      console.log('  - Checkout sau giờ làm việc?:', checkOut.isAfter(expectedCheckOut));
      console.log('  - Ngày là holiday?:', isHoliday);

      // ✨ FIX: Bỏ điều kiện checkOut.isAfter(expectedCheckOut) - chỉ cần có đơn OT đã duyệt là tính
      // condition: Must have approved OT end time.
      // EXCEPTION: If it is a Holiday, we treat the OT Application as the "Standard Shift" (see logic above).
      //            The compensation is calculated via `dailyWorkingUnit` (WorkHours / OT_Standard * HolidayRate).
      //            Therefore, we MUST NOT calculate `otWorkingUnit` here to avoid double counting.
      if (approvedOtEndTime && !isHoliday) {
        // ✨ Handle full date or time string for approvedOtEndTime
        const otEndStr = approvedOtEndTime.length <= 8 ? `${date} ${approvedOtEndTime}` : approvedOtEndTime;
        const approvedOtEnd = dayjs(otEndStr).tz('Asia/Ho_Chi_Minh');

        // ✨ Handle full date or time string for approvedOtStartTime
        let approvedOtStart: dayjs.Dayjs;
        if (approvedOtStartTime) {
          const otStartStr = approvedOtStartTime.length <= 8 ? `${date} ${approvedOtStartTime}` : approvedOtStartTime;
          approvedOtStart = dayjs(otStartStr).tz('Asia/Ho_Chi_Minh');
        } else {
          // Fallback to expectedCheckOut if not provided
          approvedOtStart = expectedCheckOut;
        }

        console.log('✅ Has approved OT, checking validity...');
        console.log('- Approved OT start:', approvedOtStart.format('YYYY-MM-DD HH:mm:ss'));
        console.log('- Approved OT end:', approvedOtEnd.format('YYYY-MM-DD HH:mm:ss'));
        console.log('- Check out:', checkOut.format('YYYY-MM-DD HH:mm:ss'));

        /**
         * ✅ LOGIC TÍNH OT (ƯU TIÊN CAO)
         * 
         * Điều kiện tính OT:
         * - Phải có đơn OT đã duyệt (approvedOtEndTime có giá trị)
         * - Checkout >= OT start time
         * 
         * Công thức tính:
         * 1. Xác định effective OT end = MIN(checkout, registered OT end)
         *    → Nếu checkout sớm hơn → tính đến checkout
         *    → Nếu checkout muộn hơn → tính full OT đã đăng ký
         * 
         * 2. OT minutes = effectiveOtEnd - OT start
         * 3. OT hours = OT minutes / 60
         * 4. otWorkingUnit = OT hours / 8 (RAW - chưa nhân hệ số)
         *    → Hệ số sẽ được nhân ở MonthlyReportService khi tổng hợp
         */
        if (checkOut.isAfter(approvedOtStart) || checkOut.isSame(approvedOtStart)) {
          // Tính số phút OT thực tế: từ OT start đến MIN(checkout, OT end)
          const effectiveOtEnd = checkOut.isBefore(approvedOtEnd) ? checkOut : approvedOtEnd;
          const otTotalMinutes = effectiveOtEnd.diff(approvedOtStart, 'minute');

          // ✨ Subtract lunch break from OT time if it overlaps
          const otLunchMinutes = this.calculateLunchBreakTime(approvedOtStart, effectiveOtEnd, lunchBreak, date);
          result.otMinutes = Math.max(0, otTotalMinutes - otLunchMinutes);

          // Tính số giờ OT (raw - chưa nhân hệ số)
          const otHours = result.otMinutes / 60;

          // ✨ Tính công OT dựa trên thời gian ca hành chính
          // 1 công = thời gian làm việc của ca (ví dụ: 8 tiếng cho ca hành chính)
          // Lấy thời gian ca từ shiftInfo hoặc mặc định 8 giờ
          // Use standard working hours (excluding lunch) for calculation
          // @ts-ignore
          const shiftDurationHours = settings.standardHours || 8;

          // Công OT = (số giờ OT / thời gian ca) * hệ số OT
          const overtimeRateMultiplier = settings.overtimeRate?.rate || 1.5;
          result.otWorkingUnit = (otHours / shiftDurationHours) * overtimeRateMultiplier;
          result.overtimeHours = otHours; // ✨ Số giờ làm thêm thực tế
          result.otSalary = 0; // Không tính lương OT riêng

          console.log('\n✅ ===== TÍNH OT THÀNH CÔNG =====');
          console.log('⏰ Chi tiết tính toán OT:');
          console.log('  - OT start:', approvedOtStart.format('HH:mm:ss'));
          console.log('  - OT end (registered):', approvedOtEnd.format('HH:mm:ss'));
          console.log('  - Checkout:', checkOut.format('HH:mm:ss'));
          console.log('  - Effective OT end:', effectiveOtEnd.format('HH:mm:ss'));
          console.log('  - OT minutes:', result.otMinutes);
          console.log('  - OT hours:', otHours.toFixed(2));
          console.log('  - Shift duration:', shiftDurationHours, 'hours');
          console.log('  - OT Rate Multiplier:', overtimeRateMultiplier);
          console.log('  - Công thức: (', otHours.toFixed(2), '/', shiftDurationHours, ') *', overtimeRateMultiplier, ' = OT working unit');
          console.log('  - 🎯 OT working units (ĐÃ nhân hệ số):', result.otWorkingUnit.toFixed(4));
          console.log('  - 📊 Overtime hours:', result.overtimeHours.toFixed(2));
          console.log('===== KẾT THÚC TÍNH OT =====\n');
        } else {
          result.otMinutes = 0;
          result.otSalary = 0;
          result.otWorkingUnit = 0;
          result.overtimeHours = 0;
          console.log('\n❌ ===== KHÔNG TÍNH OT =====');
          console.log('⚠️ Lý do: Checkout trước giờ bắt đầu OT');
          console.log('  - Checkout:', checkOut.format('HH:mm:ss'));
          console.log('  - OT start:', approvedOtStart.format('HH:mm:ss'));
          console.log('===== KẾT THÚC =====\n');
        }
      } else {
        result.otMinutes = 0;
        result.otSalary = 0;
        result.otWorkingUnit = 0;
        console.log('\n❌ ===== KHÔNG TÍNH OT =====');
        console.log('⚠️ Lý do: Không có đơn OT đã duyệt');
        console.log('  - Có approvedOtEndTime?:', !!approvedOtEndTime);
        console.log('  - 🎯 otWorkingUnit được set = 0');
        console.log('===== KẾT THÚC =====\n');
      }
    }

    // Tính toán tiền phạt dựa trên lương thực tế
    if (salaryInfo) {
      // Nếu chưa tính late penalty (chưa có check-in trước đó), tính bây giờ
      if (result.latePenaltyAmount === 0 && result.lateMinutes > 0) {
        result.latePenaltyAmount = this.calculatePenaltyAmount(
          result.lateMinutes,
          salaryInfo,
          penaltyRate
        );
      }

      // Tính early leave penalty (chỉ khi có check-out)
      if (checkOutTime && result.earlyDepartureMinutes > 0) {
        result.earlyLeavePenaltyAmount = this.calculatePenaltyAmount(
          result.earlyDepartureMinutes,
          salaryInfo,
          penaltyRate
        );
      }

      console.log('💰 Penalty amounts calculated:');
      console.log('- Late penalty:', result.latePenaltyAmount);
      console.log('- Early leave penalty:', result.earlyLeavePenaltyAmount);
    } else {
      console.warn('⚠️ WARNING: Cannot get salary info - penalty will be set to 0');
      console.warn('- User ID:', userId);
      console.warn('- Token available:', !!token);
      console.warn('- Late minutes:', result.lateMinutes);
      console.warn('- Early departure minutes:', result.earlyDepartureMinutes);
      console.warn('- Penalty rate:', penaltyRate);
      console.warn('- Attendance will be saved but penalty amounts will be 0');

      // Không tính penalty nếu không có thông tin lương
      result.latePenaltyAmount = 0;
      result.earlyLeavePenaltyAmount = 0;

      console.log('💰 Penalty amounts set to 0 due to missing salary info');
    }

    // ✨ Tính công cơ bản (không bao gồm OT)
    // Công cơ bản = min(1, số giờ làm / số giờ chuẩn) * working_unit của shift
    const shiftWorkingUnit = parseFloat((shiftInfo?.working_unit || 1.0).toString());
    if (result.workHours > 0 && standardHours > 0) {
      let baseUnits = Math.min(1, result.workHours / standardHours) * shiftWorkingUnit;

      // ✨ Tolerance: If worked within 1 hour of standard hours, count as full day (handles lunch break discrepancies)
      if (result.workHours >= (standardHours - 1.0)) {
        baseUnits = shiftWorkingUnit;
        console.log(`✅ [attendance] User worked ${result.workHours}h (Standard ${standardHours}h). Rounded up to full unit ${baseUnits}.`);
      }

      // ✨ Nếu là ngày lễ hoặc cuối tuần, CHỈ TÍNH CÔNG NẾU CÓ ĐƠN OT ĐÃ DUYỆT
      if (isHoliday) {
        if (!approvedOtEndTime) {
          result.dailyWorkingUnit = 0;
          console.log(`🎉 Holiday work detected but NO Approved OT: dailyWorkingUnit = 0`);
        } else {
          // ✨ USER REQUEST: Dựa vào thời gian làm trong đơn OT
          // Nếu làm đủ giờ registered -> otUnits ~ 1. Nếu làm ít hơn -> < 1.

          // Logic mới:
          // 1. Xác định khung giờ OT đc duyệt (Approved Window)
          // 2. So sánh Check-in/Check-out với khung giờ này để tính muộn/sớm
          // 3. Công thực nhận = (Tổng giờ đơn - Giờ muộn - Giờ về sớm) / 8.0 * Hệ số

          const actualShiftWorkHours = 8.0;
          const holidayRateMultiplier = settings.holidayRate?.rate || 3.0;

          // Tính thời gian của đơn (App Duration) - Sử dụng approvedOtDurationHours đã trừ nghỉ trưa
          const appHours = approvedOtDurationHours || 0;

          const otStart = (approvedOtStartTime && approvedOtStartTime.includes('T'))
            ? dayjs(approvedOtStartTime).tz('Asia/Ho_Chi_Minh')
            : dayjs(`${date} ${approvedOtStartTime}`).tz('Asia/Ho_Chi_Minh');
          const otEnd = (approvedOtEndTime && approvedOtEndTime.includes('T'))
            ? dayjs(approvedOtEndTime).tz('Asia/Ho_Chi_Minh')
            : dayjs(`${date} ${approvedOtEndTime}`).tz('Asia/Ho_Chi_Minh');

          // ✨ SAFETY FIX: Initialize to 0
          result.lateMinutes = 0;
          result.earlyDepartureMinutes = 0;

          // Tính đi muộn so với giờ bắt đầu OT
          if (checkInTime) {
            const checkInDayjs = dayjs.utc(checkInTime).tz('Asia/Ho_Chi_Minh');
            if (checkInDayjs.isValid() && otStart.isValid()) {
              // Chỉ tính muộn nếu check-in SAU giờ bắt đầu OT
              result.lateMinutes = Math.max(0, checkInDayjs.diff(otStart, 'minute'));
            }
          }

          // Tính về sớm so với giờ kết thúc OT
          if (checkOutTime) {
            const checkOutDayjs = dayjs.utc(checkOutTime).tz('Asia/Ho_Chi_Minh');
            if (checkOutDayjs.isValid() && otEnd.isValid()) {
              // Chỉ tính về sớm nếu check-out TRƯỚC giờ kết thúc OT
              result.earlyDepartureMinutes = Math.max(0, otEnd.diff(checkOutDayjs, 'minute'));
            }
          }

          const lateMinutesVal = Number(result.lateMinutes) || 0;
          const earlyMinutesVal = Number(result.earlyDepartureMinutes) || 0;

          // Tổng thời gian bị trừ (tính bằng giờ)
          const lostHours = (lateMinutesVal + earlyMinutesVal) / 60;

          // Thời gian thực tế được tính công (không được < 0)
          const actualEarnedHours = Math.max(0, appHours - lostHours);

          result.dailyWorkingUnit = Math.round((actualEarnedHours / actualShiftWorkHours) * 100) / 100;
          // Chữ nâu (Brown): Công thực nhận (Actual Earned)
          result.otWorkingUnit = (actualEarnedHours / actualShiftWorkHours) * holidayRateMultiplier;

          // Chữ xanh (Blue): Tổng công thực nhận (Total Earned) = OT Earned (vì ngày lễ base = 0)
          result.totalWorkingUnit = result.otWorkingUnit;

          // Cập nhật lại overtimeHours để hiển thị đúng số giờ làm được
          result.overtimeHours = Math.round(actualEarnedHours * 100) / 100;

          console.log(`🎉 Holiday work CALCULATION (Fixed Window):`);
          console.log(`   - Window: ${otStart.format('HH:mm')} - ${otEnd.format('HH:mm')} (${appHours}h)`);
          console.log(`   - Check: ${checkInTime ? dayjs(checkInTime).tz('Asia/Ho_Chi_Minh').format('HH:mm') : 'N/A'} - ${checkOutTime ? dayjs(checkOutTime).tz('Asia/Ho_Chi_Minh').format('HH:mm') : 'N/A'}`);
          console.log(`   - Late: ${lateMinutesVal}m, Early: ${earlyMinutesVal}m -> Lost: ${lostHours.toFixed(2)}h`);
          console.log(`   - Earned Hours: ${actualEarnedHours.toFixed(2)}h`);
          console.log(`   - Multiplier: ${holidayRateMultiplier}`);
          console.log(`   - Blue (App): ${result.totalWorkingUnit.toFixed(4)}`);
          console.log(`   - Brown (Earned): ${result.otWorkingUnit.toFixed(4)}`);
        }
      }
      else if (isWeekend) {
        if (!approvedOtEndTime) {
          result.dailyWorkingUnit = 0;
          result.otWorkingUnit = 0;
          result.totalWorkingUnit = 0;
          console.log(`🏖️ Weekend work detected but NO Approved OT: units = 0`);
        } else {
          const actualShiftWorkHours = 8.0;
          const weekendRateMultiplier = settings.overtimeRate?.rate || 1.5;
          const appHours = approvedOtDurationHours || 0;

          // ✨ SAFETY FIX: Initialize to 0
          result.lateMinutes = 0;
          result.earlyDepartureMinutes = 0;

          const otStart = (approvedOtStartTime && approvedOtStartTime.includes('T'))
            ? dayjs(approvedOtStartTime).tz('Asia/Ho_Chi_Minh')
            : dayjs(`${date} ${approvedOtStartTime}`).tz('Asia/Ho_Chi_Minh');
          const otEnd = (approvedOtEndTime && approvedOtEndTime.includes('T'))
            ? dayjs(approvedOtEndTime).tz('Asia/Ho_Chi_Minh')
            : dayjs(`${date} ${approvedOtEndTime}`).tz('Asia/Ho_Chi_Minh');

          if (checkInTime) {
            const checkInDayjs = dayjs.utc(checkInTime).tz('Asia/Ho_Chi_Minh');
            if (checkInDayjs.isValid() && otStart.isValid()) {
              result.lateMinutes = Math.max(0, checkInDayjs.diff(otStart, 'minute')) || 0;
            }
          }

          if (checkOutTime) {
            const checkOutDayjs = dayjs(checkOutTime).tz('Asia/Ho_Chi_Minh');
            if (checkOutDayjs.isValid() && otEnd.isValid()) {
              result.earlyDepartureMinutes = Math.max(0, otEnd.diff(checkOutDayjs, 'minute')) || 0;
            }
          }

          const lateMinutesVal = Number(result.lateMinutes) || 0;
          const earlyMinutesVal = Number(result.earlyDepartureMinutes) || 0;
          const penaltyHours = (lateMinutesVal + earlyMinutesVal) / 60;
          const actualEarnedHours = Math.max(0, appHours - penaltyHours);

          // Chữ xanh (Blue): Số công (Raw units before multiplier)
          result.dailyWorkingUnit = Math.round((actualEarnedHours / actualShiftWorkHours) * 100) / 100;
          result.totalWorkingUnit = (appHours / actualShiftWorkHours) * weekendRateMultiplier;
          result.otWorkingUnit = (actualEarnedHours / actualShiftWorkHours) * weekendRateMultiplier;

          console.log(`🏖️ Weekend work CALCULATION (Safety Fixed):`);
          console.log(`   - Blue (App): ${result.totalWorkingUnit.toFixed(4)}`);
          console.log(`   - Brown (Earned): ${result.otWorkingUnit.toFixed(4)}`);
        }
      }
      else {
        // Ngày thường
        result.dailyWorkingUnit = baseUnits;
        // For regular days, totalWorkingUnit is dailyWorkingUnit + otWorkingUnit
        result.totalWorkingUnit = result.dailyWorkingUnit + result.otWorkingUnit;
      }
    } else {
      result.dailyWorkingUnit = 0;
    }

    // ✨ Tổng công = Công cơ bản + Công OT
    result.totalWorkingUnit = result.dailyWorkingUnit + result.otWorkingUnit;

    console.log('📊 Working units calculation:');
    console.log('- Standard hours:', standardHours);
    console.log('- Work hours:', result.workHours);
    console.log('- Shift working unit:', shiftWorkingUnit);
    console.log('- Daily working unit (base):', result.dailyWorkingUnit.toFixed(4));
    console.log('- OT working unit:', result.otWorkingUnit.toFixed(4));
    console.log('- Total working unit:', result.totalWorkingUnit.toFixed(4));

    console.log('✅ Final calculation result:', result);
    // Attach standardHours to result
    return {
      ...result,
      standardHours
    };
  }

  private static calculateLunchBreakTime(
    checkIn: dayjs.Dayjs,
    checkOut: dayjs.Dayjs,
    lunchBreak: LunchBreak,
    date: string
  ): number {
    const lunchStart = dayjs(`${date} ${lunchBreak.start}`).tz('Asia/Ho_Chi_Minh');
    const lunchEnd = dayjs(`${date} ${lunchBreak.end}`).tz('Asia/Ho_Chi_Minh');

    console.log('🍽️ Lunch break calculation:');
    console.log('- Lunch break period:', `${lunchStart.format('HH:mm')} - ${lunchEnd.format('HH:mm')}`);
    console.log('- Work period:', `${checkIn.format('HH:mm')} - ${checkOut.format('HH:mm')}`);

    // Nếu không có overlap với lunch break thì return 0
    if (checkOut.isBefore(lunchStart) || checkIn.isAfter(lunchEnd)) {
      console.log('- No overlap with lunch break');
      return 0;
    }

    // Tính overlap time
    const overlapStart = checkIn.isAfter(lunchStart) ? checkIn : lunchStart;
    const overlapEnd = checkOut.isBefore(lunchEnd) ? checkOut : lunchEnd;

    const overlapMinutes = Math.max(0, overlapEnd.diff(overlapStart, 'minute'));
    console.log(`- Lunch break overlap: ${overlapMinutes} minutes`);

    return overlapMinutes;
  }

  /**
   * Tính toán thời gian kết thúc mở rộng (bao gồm cả giờ nghỉ trưa)
   * Để đảm bảo đủ số giờ làm việc thực tế (duration)
   */
  public static calculateExtendedEndTime(
    startTime: dayjs.Dayjs,
    durationHours: number,
    lunchBreak: LunchBreak,
    date: string
  ): dayjs.Dayjs {
    const durationMinutes = durationHours * 60;
    // Thời gian kết thúc dự kiến (chưa tính nghỉ trưa)
    let endTime = startTime.add(durationMinutes, 'minute');

    // Nếu khoảng làm việc bao trùm hoặc giao thoa với giờ nghỉ trưa
    // Chúng ta cần cộng thêm thời gian nghỉ trưa vào checkout
    const overlapMinutes = this.calculateLunchBreakTime(startTime, endTime, lunchBreak, date);

    if (overlapMinutes > 0) {
      console.log(`🍱 Extending OT frame by ${overlapMinutes}m lunch break`);
      endTime = endTime.add(overlapMinutes, 'minute');

      // Re-verify in case the extension created more overlap (rare but possible)
      const finalOverlap = this.calculateLunchBreakTime(startTime, endTime, lunchBreak, date);
      if (finalOverlap > overlapMinutes) {
        endTime = startTime.add(durationMinutes, 'minute').add(finalOverlap, 'minute');
      }
    }

    return endTime;
  }

  // Helper method để format time cho logging
  static formatTimeForLog(time: string | null): string {
    if (!time) return 'N/A';
    return dayjs(time).format('HH:mm:ss');
  }

  // Helper method để validate working hours format
  static validateWorkingHours(workingHours: WorkingHours): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(workingHours.start) && timeRegex.test(workingHours.end);
  }

  /**
   * Tính lương tăng ca dựa trên số giờ và lương cơ bản của nhân viên
   * @param userId ID của nhân viên
   * @param overtimeHours Số giờ tăng ca
   * @returns Lương tăng ca
   */
  static async calculateOvertimeSalary(_userId: number, _overtimeHours: number): Promise<number> {
    // ✨ DEPRECATED: Tiền lương OT hiện tại được tính bằng cách quy đổi sang CÔNG (working units)
    // Logic mới:
    // - Attendance Service: Tính ra số công (Standard + OT converted) -> totalWorkingUnit
    // - Salary Service: Lấy totalWorkingUnit * Đơn giá lương
    // Hàm này giữ lại để tránh lỗi type, nhưng sẽ luôn trả về 0.
    console.log('💰 calculateOvertimeSalary called - returning 0 (Using Unit-based calculation)');
    return 0;
  }
}

// Provide a default export for compatibility with different import styles
export default AttendanceCalculationService;

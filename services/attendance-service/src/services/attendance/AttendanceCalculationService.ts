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
            totalWorkingUnit: 0, otWorkingUnit: 0, dailyWorkingUnit: 0
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
            const calculatedEnd = dayjs(fullStart).add(otDuration, 'hour');
            endTimeFormatted = calculatedEnd.tz('Asia/Ho_Chi_Minh').format('HH:mm');
          } else if (!rawEnd) {
            endTimeFormatted = '17:00';
          } else {
            endTimeFormatted = rawEnd.includes('T') || rawEnd.length > 8
              ? dayjs(rawEnd).tz('Asia/Ho_Chi_Minh').format('HH:mm')
              : rawEnd.substring(0, 5);
          }

          // Update shift name if it's a holiday or specialized OT
          if (isHoliday) {
            dayRecord.shift = {
              name: 'Làm thêm ngày lễ',
              start_time: startTimeFormatted,
              end_time: endTimeFormatted
            };
            dayRecord.shiftName = 'Làm thêm ngày lễ';
          } else if (!isWork) {
            dayRecord.shiftName = 'Làm thêm ngày nghỉ';
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
          }
        }
        else if (isHoliday) {
          // ✨ Holiday logic for days WITHOUT approved OT
          if (attendanceRecord && (attendanceRecord.checkInTime || attendanceRecord.checkOutTime)) {
            // User worked on holiday but no OT app -> strictly speaking shouldn't be here if we follow "no app = no work"
            // but we keep it for visibility, just won't have OT units.
            dayRecord.dailyWorkingUnit = dayRecord.dailyWorkingUnit || 0;
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
        if (!attendanceRecord && !isHoliday) {
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

      enrichedAttendanceData.forEach((r) => {
        if (r.checkInTime && r.checkOutTime) totalWorkDays++;
        totalWorkHours += parseFloat((r.dailyTotalWorkHours || 0).toString());
        totalPenalty += parseFloat((r.lateArrivalPenalty || 0).toString()) + parseFloat((r.earlyLeavePenalty || 0).toString());
        totalWorkingUnits += parseFloat((r.dailyWorkingUnit || 0).toString());
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

      // Return real-time calculated totals to ensure UI accuracy
      return {
        userId, month,
        user: { id: userId, name: 'N/A', email: 'N/A', departmentId: monthlyRecord?.departmentId || 0, department: { id: monthlyRecord?.departmentId || 0, name: 'N/A' } },
        presentDays: totalWorkDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOtHours * 100) / 100,
        totalLateDays: totalLateDays,
        totalEarlyLeaveDays: totalEarlyLeaveDays,
        totalPenalty: Math.round(totalPenalty * 100) / 100,
        totalWorkingUnits: Math.round(totalWorkingUnits * 100) / 100,
        totalOtWorkingUnits: Math.round(totalOtWorkingUnits * 100) / 100,
        totalPaidLeaveDays, totalUnpaidLeaveDays,
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

  private static async getSettings() {
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

  private static getDefaultSettings() {
    return {
      workingHours: { start: '09:00', end: '18:00' },
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

    // ✨ ƯU TIÊN 1: Nếu có OT đã duyệt (approvedOtEndTime)
    // Trường hợp này thường dùng cho làm thêm ngày lễ/cuối tuần
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

      // Deduct lunch break for long OT shifts (similar to standard shifts)
      const lunchBreakMinutes = diffMinutes > 360 ? 60 : 0;
      standardHours = (diffMinutes - lunchBreakMinutes) / 60;
      approvedOtDurationHours = standardHours; // Lưu lại
      console.log(`🎉 Calculated standardHours based on OT: ${standardHours}h (Total: ${diffMinutes}m, Lunch: ${lunchBreakMinutes}m)`);
      console.log(`   Approved OT Duration: ${approvedOtDurationHours}h`);
    }
    // ✨ ƯU TIÊN 2: Dùng Shift Info (nếu không phải trường hợp trên)
    else if (shiftInfo) {
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
      console.log(`📋 Sử dụng shift: ${shiftInfo.name}, working_unit=${shiftInfo.working_unit}, standardHours=${standardHours}h`);
    } else {
      // Fallback: dùng settings cũ
      workingHours = settings.workingHours as WorkingHours;
      const start = dayjs(`${date} ${workingHours.start}`).tz('Asia/Ho_Chi_Minh');
      const end = dayjs(`${date} ${workingHours.end}`).tz('Asia/Ho_Chi_Minh');
      const diff = end.diff(start, 'minute');
      if (diff > 0) standardHours = diff / 60;
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
    const checkIn = dayjs(checkInTime).tz('Asia/Ho_Chi_Minh');
    const expectedCheckIn = dayjs(`${date} ${workingHours.start}`).tz('Asia/Ho_Chi_Minh');
    const expectedCheckOut = dayjs(`${date} ${workingHours.end}`).tz('Asia/Ho_Chi_Minh');

    console.log('🕐 Time comparison (Vietnam timezone):');
    console.log('- Check-in raw input:', checkInTime);
    console.log('- Check-in in UTC:', dayjs(checkInTime).utc().format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Check-in in Vietnam:', checkIn.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Expected check-in:', expectedCheckIn.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Expected check-out:', expectedCheckOut.format('YYYY-MM-DD HH:mm:ss'));

    // Tính late minutes - chỉ tính nếu check-in muộn hơn giờ quy định
    const lateMinutes = checkIn.isAfter(expectedCheckIn)
      ? checkIn.diff(expectedCheckIn, 'minute')
      : 0;

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
      const checkOut = dayjs(checkOutTime).tz('Asia/Ho_Chi_Minh');
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
          result.otMinutes = effectiveOtEnd.diff(approvedOtStart, 'minute');

          // Tính số giờ OT (raw - chưa nhân hệ số)
          const otHours = result.otMinutes / 60;

          // ✨ Tính công OT dựa trên thời gian ca hành chính
          // 1 công = thời gian làm việc của ca (ví dụ: 8 tiếng cho ca hành chính)
          // Lấy thời gian ca từ shiftInfo hoặc mặc định 8 giờ
          const shiftDurationHours = shiftInfo ?
            (dayjs(`${date} ${shiftInfo.end_time}`).diff(dayjs(`${date} ${shiftInfo.start_time}`), 'hour', true)) :
            8;

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
    const shiftWorkingUnit = shiftInfo?.working_unit || 1.0;
    if (result.workHours > 0 && standardHours > 0) {
      const baseUnits = Math.min(1, result.workHours / standardHours) * shiftWorkingUnit;

      // ✨ Nếu là ngày lễ hoặc cuối tuần, CHỈ TÍNH CÔNG NẾU CÓ ĐƠN OT ĐÃ DUYỆT
      if (isHoliday) {
        if (!approvedOtEndTime) {
          result.dailyWorkingUnit = 0;
          console.log(`🎉 Holiday work detected but NO Approved OT: dailyWorkingUnit = 0`);
        } else {
          // ✨ USER REQUEST: Dựa vào thời gian làm trong đơn OT
          // Nếu làm đủ giờ registered -> otUnits ~ 1. Nếu làm ít hơn -> < 1.

          // Tuy nhiên, logic "1 công = 8 tiếng" có thể khác với "1 công = full ca OT".
          // Nếu ca OT là 4 tiếng, làm đủ 4 tiếng => tính là 1 công ca đó? Hay 0.5 công chuẩn?
          // Theo yêu cầu "có thể là 4 tiếng thì 0.5 công" -> vậy phải so với chuẩn 8 tiếng hoặc chuẩn ca hành chính.

          // Giả sử working_unit của shiftInfo là chuẩn (thường là 1).
          // standardHours ở đây là độ dài của ca OT (đã tính ở trên).

          // Để nhất quán: Lấy số giờ OT thực tế (hoặc approved) chia cho 8 (giờ chuẩn hành chính) 
          // rồi nhân hệ số.
          // Hoặc nếu shiftInfo có working_unit = 1 (8h).

          // Sử dụng approvedOtDurationHours (giờ đăng ký)
          // Nếu approvedOtDurationHours = 4h. Thì base là 0.5.
          // ✨ USER REQUEST: 
          // Chữ xanh (totalWorkingUnit) = (Giờ đơn / 8.0) * Tỉ lệ
          // Chữ nâu (otWorkingUnit) = ((Giờ đơn - Giờ muộn/về sớm) / 8.0) * Tỉ lệ
          const actualShiftWorkHours = 8.0;

          const holidayRateMultiplier = settings.holidayRate?.rate || 3.0;
          const appHours = approvedOtDurationHours || 0;

          // ✨ SAFETY FIX: Initialize to 0 to avoid DB validation errors
          result.lateMinutes = 0;
          result.earlyDepartureMinutes = 0;

          // Parse OT times safely
          const otStart = (approvedOtStartTime && approvedOtStartTime.includes('T'))
            ? dayjs(approvedOtStartTime).tz('Asia/Ho_Chi_Minh')
            : dayjs(`${date} ${approvedOtStartTime}`).tz('Asia/Ho_Chi_Minh');
          const otEnd = (approvedOtEndTime && approvedOtEndTime.includes('T'))
            ? dayjs(approvedOtEndTime).tz('Asia/Ho_Chi_Minh')
            : dayjs(`${date} ${approvedOtEndTime}`).tz('Asia/Ho_Chi_Minh');

          if (checkInTime) {
            const checkInDayjs = dayjs(checkInTime).tz('Asia/Ho_Chi_Minh');
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

          result.dailyWorkingUnit = 0;
          // Chữ xanh (Blue): Công tối đa theo đơn
          result.totalWorkingUnit = (appHours / actualShiftWorkHours) * holidayRateMultiplier;
          // Chữ nâu (Brown): Công thực nhận sau khi trừ muộn/sớm
          result.otWorkingUnit = (actualEarnedHours / actualShiftWorkHours) * holidayRateMultiplier;

          console.log(`🎉 Holiday work CALCULATION (Safety Fixed):`);
          console.log(`   - App Hours: ${appHours}, Penalty: ${penaltyHours}h`);
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
            const checkInDayjs = dayjs(checkInTime).tz('Asia/Ho_Chi_Minh');
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

          result.dailyWorkingUnit = 0;
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

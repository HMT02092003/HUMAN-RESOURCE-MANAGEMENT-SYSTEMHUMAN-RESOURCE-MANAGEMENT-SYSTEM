import SettingsService from '../SettingsService';
import SalaryService from '../SalaryService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import axios from 'axios';
import os from 'os';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import {
  getWorkingDaysConfig as helpersGetWorkingDaysConfig,
  isWorkingDay as helpersIsWorkingDay,
  checkDateHasLeave as helpersCheckDateHasLeave,
  checkDateHasBusinessTrip as helpersCheckDateHasBusinessTrip
} from './AttendanceHelpers';
import HolidayModel from '@/Models/HolidayModel';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

// Helper function to get local IP address
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

  public static async getUserMonthlyAttendance(userId: number, month: string, token?: string, useMonthlySummaryOnly: boolean = false): Promise<any | null> {
    try {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      const monthlyRecord = await MonthlySummaryModel.getByUserAndMonth(userId, month);
      // If caller explicitly requests to use the monthly summary only and a snapshot exists,
      // return the stored dailyDetails directly without performing enrichment/recalculation.
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
        } catch (e) {
          // parse error - fall through to enrichment path
        }
      }
      // Always load raw rows for the month. We'll enrich them into a full-month dataset below
      const rawAttendanceRows = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      const attendancePlain = rawAttendanceRows.map((r: any) => (r.toJSON ? r.toJSON() : { ...r }));

      // Note: if monthlyRecord exists we still want to return a full-month, enriched attendanceData
      // that includes leave/business-trip markers for days without TimeAttendance rows. We'll reuse
      // the enrichment logic below (approvedApplications, attendanceMap, enrichedAttendanceData).

      const attendanceData = attendancePlain; // use preloaded rows

      const workingDaysConfig = await helpersGetWorkingDaysConfig();

      // ✨ Load holidays using Objection.js HolidayModel
      const holidayRows: any[] = await HolidayModel.query()
        .where(function () {
          this.whereBetween('start_date', [startDate, endDate])
            .orWhereBetween('end_date', [startDate, endDate])
            .orWhere(function () {
              // Trường hợp kỳ nghỉ lễ bao trùm cả tháng
              this.where('start_date', '<=', startDate).andWhere('end_date', '>=', endDate);
            });
        })
        .select('*')
        .catch(() => []);

      const holidaySet = new Set<string>();
      const holidayInfoMap = new Map<string, { name: string; isPublic: boolean }>();

      for (const hr of holidayRows) {
        // Bảng holidays chỉ có start_date và end_date (không có cột date riêng lẻ)
        if (hr.start_date && hr.end_date) {
          let cur = dayjs(hr.start_date);
          const end = dayjs(hr.end_date);
          while (cur.isBefore(end) || cur.isSame(end, 'day')) {
            const dateKey = cur.format('YYYY-MM-DD');
            holidaySet.add(dateKey);
            // importance >= 2 được coi là ngày lễ công ty (isPublic: true)
            holidayInfoMap.set(dateKey, { name: hr.name || 'Ngày lễ', isPublic: (hr.importance || 0) >= 2 });
            cur = cur.add(1, 'day');
          }
        }
      }

      console.log(`🎉 [attendance] Found ${holidaySet.size} holiday dates in ${month}:`, Array.from(holidaySet));

      const [year, monthNum] = month.split('-');
      const approvedApplications: ApprovedLeaveApplication[] = [];
      try {
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const appResp = await axios.get(`${process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004'}/api/applications/user/${userId}/approved`, { params: { year: parseInt(year || ''), month: parseInt(monthNum || '') }, headers });
        approvedApplications.push(...(appResp.data.data || []));
      } catch (e) {
        // ignore
      }

      const attendanceMap = new Map<string, any>();
      attendanceData.forEach((record: any) => {
        const dateKey = dayjs(record.date).format('YYYY-MM-DD');
        const plainRecord = record.toJSON ? record.toJSON() : { ...record };
        attendanceMap.set(dateKey, plainRecord);
      });

      const daysInMonth = dayjs(`${month}-01`).daysInMonth();
      const enrichedAttendanceData: any[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = dayjs(`${month}-${String(day).padStart(2, '0')}`);
        const dateKey = currentDate.format('YYYY-MM-DD');

        const isWork = helpersIsWorkingDay(dateKey, workingDaysConfig);
        const isFuture = currentDate.isAfter(dayjs(), 'day');
        const attendanceRecord = attendanceMap.get(dateKey);
        const leaveCheck = helpersCheckDateHasLeave(dateKey, approvedApplications as any);
        const businessTripCheck = helpersCheckDateHasBusinessTrip(dateKey, approvedApplications as any);

        const hasApprovedOT = approvedApplications.some(app => {
          if (app.type !== 'overtime') return false;
          const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
          return appData.date === dateKey;
        });

        // ✨ Kiểm tra xem ngày này có phải ngày lễ không
        const isHoliday = holidaySet.has(dateKey);
        const holidayInfo = holidayInfoMap.get(dateKey);

        const dayRecord: any = {
          date: currentDate.toISOString(),
          userId,
          isWorkingDay: isWork,
          isFuture,
          hasApprovedOT,
          // Keep legacy fields for backward compatibility
          hasApprovedLeave: leaveCheck.hasLeave,
          leaveType: leaveCheck.leaveType,
          leaveInfo: leaveCheck.leaveInfo,
          type: leaveCheck.hasLeave ? leaveCheck.leaveType : (businessTripCheck.hasBusinessTrip ? 'business_trip' : 'attendance'),
          hasBusinessTrip: businessTripCheck.hasBusinessTrip,
          businessTripInfo: businessTripCheck.tripInfo,
          businessTripDestination: businessTripCheck.destination,
          tripInfo: businessTripCheck.tripInfo,
          destination: businessTripCheck.destination,
          isHoliday,
          holidayName: holidayInfo?.name || null,
          isPublicHoliday: holidayInfo?.isPublic || false
        };

        if (attendanceRecord) {
          Object.assign(dayRecord, {
            ...attendanceRecord,
            date: currentDate.toISOString(),
            userId,
            isWorkingDay: isWork,
            isFuture,
            hasApprovedOT,
            hasApprovedLeave: leaveCheck.hasLeave,
            leaveType: leaveCheck.leaveType,
            leaveInfo: leaveCheck.leaveInfo,
            type: leaveCheck.hasLeave ? leaveCheck.leaveType : (businessTripCheck.hasBusinessTrip ? 'business_trip' : 'attendance'),
            hasBusinessTrip: businessTripCheck.hasBusinessTrip,
            businessTripInfo: businessTripCheck.tripInfo,
            businessTripDestination: businessTripCheck.destination,
            tripInfo: businessTripCheck.tripInfo,
            destination: businessTripCheck.destination,
            isHoliday,
            holidayName: holidayInfo?.name || null,
            isPublicHoliday: holidayInfo?.isPublic || false
          });
        } else {
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

        enrichedAttendanceData.push(dayRecord);
      }

      const isApproved = await MonthlySummaryModel.isApproved(userId, month);

      const totalLateDays = await AttendanceCalculationService.calculateTotalLateDays(userId, month);
      const totalEarlyLeaveDays = await AttendanceCalculationService.calculateTotalEarlyLeaveDays(userId, month);

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
          totalPenalty += parseFloat(record.lateArrivalPenalty.toString()) + parseFloat(record.earlyLeavePenalty.toString());
          totalOvertimeSalary += parseFloat(record.otSalary.toString());
        }
      });

      // If there is an existing monthlyRecord use its totals to preserve any manual adjustments
      const totalsFromDb = monthlyRecord ? {
        presentDays: parseFloat((monthlyRecord.presentDays ?? totalWorkDays).toString()) || totalWorkDays,
        totalWorkHours: parseFloat((monthlyRecord.totalWorkHours ?? totalWorkHours).toString()) || Math.round(totalWorkHours * 100) / 100,
        totalOvertimeHours: parseFloat((monthlyRecord.totalOvertimeHours ?? Math.round(totalOvertimeMinutes / 60 * 100) / 100).toString()) || Math.round(totalOvertimeMinutes / 60 * 100) / 100,
        totalLateDays: parseFloat((monthlyRecord.lateDays ?? totalLateDays).toString()) || totalLateDays,
        totalEarlyLeaveDays: parseFloat((monthlyRecord.earlyLeaveDays ?? totalEarlyLeaveDays).toString()) || totalEarlyLeaveDays,
        totalPenalty: parseFloat((monthlyRecord.totalPenalty ?? Math.round(totalPenalty * 100) / 100).toString()) || Math.round(totalPenalty * 100) / 100,
        totalOvertimeSalary: parseFloat((monthlyRecord.totalOvertimeSalary ?? Math.round(totalOvertimeSalary * 100) / 100).toString()) || Math.round(totalOvertimeSalary * 100) / 100,
        isApproved: monthlyRecord ? !!isApproved : isApproved
      } : null;

      return {
        userId,
        user: { id: userId, name: 'N/A', email: 'N/A', departmentId: monthlyRecord?.departmentId || 0, department: { id: monthlyRecord?.departmentId || 0, name: 'N/A' } },
        month,
        presentDays: totalsFromDb ? totalsFromDb.presentDays : totalWorkDays,
        totalWorkHours: totalsFromDb ? totalsFromDb.totalWorkHours : Math.round(totalWorkHours * 100) / 100,
        totalOvertimeHours: totalsFromDb ? totalsFromDb.totalOvertimeHours : Math.round(totalOvertimeMinutes / 60 * 100) / 100,
        totalLateDays: totalsFromDb ? totalsFromDb.totalLateDays : totalLateDays,
        totalEarlyLeaveDays: totalsFromDb ? totalsFromDb.totalEarlyLeaveDays : totalEarlyLeaveDays,
        totalPenalty: totalsFromDb ? totalsFromDb.totalPenalty : Math.round(totalPenalty * 100) / 100,
        totalOvertimeSalary: totalsFromDb ? totalsFromDb.totalOvertimeSalary : Math.round(totalOvertimeSalary * 100) / 100,
        isApproved: totalsFromDb ? totalsFromDb.isApproved : isApproved,
        attendanceData: enrichedAttendanceData
      };
    } catch (error) {
      console.error('❌ Error getting user monthly attendance:', error);
      return null;
    }
  }

  public static async getApprovedOvertimeApplication(userId: number, date: string): Promise<any | null> {
    try {
      const response = await axios.get(`${process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004'}/api/applications/user/${userId}/approved`, { params: { year: dayjs(date).year(), month: dayjs(date).month() + 1 } });
      const applications = response.data.data || [];
      const overtimeApp = applications.find((app: any) => {
        if (app.type !== 'overtime') return false;
        const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
        return appData.date === date;
      });
      return overtimeApp || null;
    } catch (error: any) {
      console.error('Error fetching overtime applications:', error?.message || error);
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

      console.log('⚠️ No salary info found for user - penalty will be 0');
      return null;
    } catch (error) {
      console.error('❌ Error getting user salary info from salary-service:', error);
      console.log('⚠️ Will set penalty to 0 and continue attendance recording');
      return null;
    }
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
      // Fetch penalty rates from salary-service
      const penaltyRates = await SalaryService.fetchPenaltyRates();
      
      // Use SettingsService (attendance-service) to fetch attendance-related settings only
      const [workingHoursVal, lunchBreakVal, overtimeRateVal, holidayRateVal] = await Promise.all([
        SettingsService.getSettingValue('WorkingHours'),
        SettingsService.getSettingValue('LunchBreak'),
        SettingsService.getSettingValue('OvertimeRate'),
        SettingsService.getSettingValue('HolidayRate'),
      ]);

      const defaults = this.getDefaultSettings();

      return {
        workingHours: workingHoursVal || defaults.workingHours,
        lunchBreak: lunchBreakVal || defaults.lunchBreak,
        overtimeRate: overtimeRateVal || defaults.overtimeRate,
        holidayRate: holidayRateVal || defaults.holidayRate,
        // Use penalty rate from salary-service, fallback to default
        penaltyRate: penaltyRates ? { rate: penaltyRates.late } : defaults.penaltyRate
      };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return this.getDefaultSettings();
    }
  }

  private static getDefaultSettings() {
    return {
      workingHours: { start: '08:00', end: '17:00' },
      lunchBreak: { start: '12:00', end: '13:00' },
      overtimeRate: { rate: 1.5 },
      holidayRate: { rate: 3.0 },
      penaltyRate: { rate: 0.01 } // 0.01% lương cơ bản mỗi phút (tương đương ~600 VND/phút với lương 6M)
    };
  }

  static async calculateAttendance(
    checkInTime: string | null,
    checkOutTime: string | null,
    date: string,
    userId?: number,
    token?: string,
    approvedOtEndTime?: string | null,
    isHoliday?: boolean // ✨ Thêm tham số để xác định ngày lễ
  ): Promise<AttendanceCalculation & { standardHours: number }> {
    console.log('🧮 Starting attendance calculation for:', { date, checkInTime, checkOutTime, userId, approvedOtEndTime, isHoliday });

    const settings = await this.getSettings();
    const workingHours = settings.workingHours as WorkingHours;
    const lunchBreak = settings.lunchBreak as LunchBreak;
    const penaltyRate = (settings.penaltyRate as PenaltyConfig).rate;

    // Lấy thông tin lương của user nếu có userId
    let salaryInfo: UserSalaryInfo | null = null;
    if (userId) {
      salaryInfo = await this.getUserSalaryInfo(userId, token);
    }

    console.log('⚙️ Using settings:', { workingHours, lunchBreak, penaltyRate });
    console.log('💰 User salary info:', salaryInfo);
    console.log('🎉 Is holiday:', isHoliday);

    // Calculate standard working hours for the day
    let standardHours = 8; // fallback default
    if (workingHours && workingHours.start && workingHours.end) {
      const start = dayjs(`${date} ${workingHours.start}`).tz('Asia/Ho_Chi_Minh');
      const end = dayjs(`${date} ${workingHours.end}`).tz('Asia/Ho_Chi_Minh');
      const diff = end.diff(start, 'minute');
      if (diff > 0) {
        standardHours = diff / 60;
      }
    }

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
      earlyLeavePenaltyAmount: 0
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
      if (approvedOtEndTime && checkOut.isAfter(expectedCheckOut)) {
        const approvedOtEnd = dayjs(approvedOtEndTime).tz('Asia/Ho_Chi_Minh');

        // Chỉ tính OT nếu checkout sau giờ làm việc và trước/bằng giờ OT đã duyệt
        if (checkOut.isAfter(expectedCheckOut) && checkOut.isSameOrBefore(approvedOtEnd)) {
          result.otMinutes = checkOut.diff(expectedCheckOut, 'minute');

          // Tính lương OT nếu có thông tin lương
          if (salaryInfo) {
            // ✨ Tính lương OT theo ngày lễ hoặc ngày thường
            // Công thức: Lương OT = (Lương / Số ngày làm việc) * Tỷ lệ OT * Số phút OT

            // Lấy tỷ lệ OT từ settings
            const otRate = isHoliday
              ? ((settings.holidayRate as any)?.rate || 3.0)  // Ngày lễ: 300%
              : ((settings.overtimeRate as any)?.rate || 1.5); // Ngày thường: 150%

            // Số ngày làm việc trong tháng (mặc định 22 ngày)
            const workingDaysInMonth = 22;

            // Tính lương OT theo công thức mới:
            // Lương ngày = Lương tháng / Số ngày làm việc
            // Lương OT = (Lương ngày / (8 giờ * 60 phút)) * Tỷ lệ OT * Số phút OT
            const baseSalary = parseFloat(salaryInfo.baseSalary.toString());
            const dailySalary = baseSalary / workingDaysInMonth;
            const perMinuteSalary = dailySalary / (8 * 60); // 8 giờ làm việc

            result.otSalary = Math.round(perMinuteSalary * otRate * result.otMinutes);

            console.log('⏰ Overtime calculation:');
            console.log('- Is holiday:', isHoliday);
            console.log('- OT rate:', otRate);
            console.log('- Base salary:', baseSalary.toLocaleString('vi-VN'), 'VND');
            console.log('- Daily salary:', dailySalary.toLocaleString('vi-VN'), 'VND');
            console.log('- Per-minute salary:', perMinuteSalary.toLocaleString('vi-VN'), 'VND');
            console.log('- OT minutes:', result.otMinutes);
            console.log('- OT salary:', result.otSalary.toLocaleString('vi-VN'), 'VND');
          }
        } else {
          result.otMinutes = 0;
          result.otSalary = 0;
          console.log('⚠️ Checkout time exceeds approved OT time - no OT calculated');
        }
      } else {
        result.otMinutes = 0;
        result.otSalary = 0;
        console.log('ℹ️ No approved OT or checkout before expected time - no OT calculated');
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
  static async calculateOvertimeSalary(userId: number, overtimeHours: number): Promise<number> {
    try {
      console.log(`💰 Calculating overtime salary for user ${userId}, hours: ${overtimeHours}`);

      // Lấy thông tin lương của nhân viên từ Employee Service
      const employeeResponse = await axios.get(
        `${API_GATEWAY_URL}/api/employee/users/${userId}/salary`,
        {
          timeout: 10000
        }
      );

      const salaryInfo: UserSalaryInfo = employeeResponse.data.data;
      console.log('👤 Employee salary info:', salaryInfo);

      if (!salaryInfo || !salaryInfo.baseSalary) {
        console.log('⚠️ No salary info found, using default calculation');
        return 0;
      }

      // Lấy cấu hình tỷ lệ lương tăng ca từ bảng settings
      let overtimeRate = 1.5; // Mặc định 150% lương cơ bản
      try {
        const overtimeRateSetting = await SettingsService.getSettingValue('OvertimeRate');
        if (overtimeRateSetting) {
          const value = overtimeRateSetting;
          if (typeof value === 'object' && value !== null) {
            const valueObj = value as any;
            overtimeRate = parseFloat(valueObj.rate || valueObj.value || 1.5);
          } else if (typeof value === 'string') {
            try {
              const parsedValue = JSON.parse(value);
              overtimeRate = parseFloat(parsedValue.rate || parsedValue.value || parsedValue || 1.5);
            } catch {
              overtimeRate = parseFloat(value);
            }
          } else if (typeof value === 'number') {
            overtimeRate = value;
          }
          console.log(`✅ Loaded overtime rate from settings: ${overtimeRate}`);
        } else {
          console.log('⚠️ OvertimeRate setting not found, using default: 1.5');
        }
      } catch (error) {
        console.log('⚠️ Error loading overtime rate from settings, using default: 1.5', error);
      }

      // Tính lương theo giờ = (lương cơ bản + phụ cấp) / (22 ngày * 8 giờ)
      const totalMonthlySalary = salaryInfo.baseSalary + (salaryInfo.allowance || 0);
      const hourlyRate = totalMonthlySalary / (22 * 8); // 22 ngày làm việc, 8 giờ/ngày

      // Lương tăng ca: use base monthly salary * per-minute OT rate * minutes
      // Convert overtimeHours to minutes
      const overtimeMinutes = Math.round(overtimeHours * 60);

      // derive per-minute OT rate (same logic as above)
      let perMinuteOtRate = 0;
      try {
        const overtimeRateSetting2 = await SettingsService.getSettingValue('OvertimeRate');
        if (overtimeRateSetting2) {
          let otSetting: any = overtimeRateSetting2;
          if (typeof otSetting === 'string') {
            try { otSetting = JSON.parse(otSetting); } catch { };
          }

          if (otSetting && typeof otSetting === 'object') {
            if (otSetting.perMinute) perMinuteOtRate = parseFloat(otSetting.perMinute);
            else if (otSetting.rate) {
              const days = otSetting.workingDaysPerMonth || 22;
              const hours = otSetting.hoursPerDay || 8;
              perMinuteOtRate = parseFloat(otSetting.rate) / (days * hours * 60);
            }
          } else if (typeof otSetting === 'number') {
            perMinuteOtRate = otSetting / (22 * 8 * 60);
          }
        }
      } catch (e) {
        console.log('⚠️ Error reading OvertimeRate setting for calculateOvertimeSalary, using default');
      }

      if (!perMinuteOtRate || isNaN(perMinuteOtRate) || perMinuteOtRate <= 0) {
        perMinuteOtRate = 1.5 / (22 * 8 * 60);
      }

      const overtimeSalary = Math.round(salaryInfo.baseSalary * perMinuteOtRate * overtimeMinutes);

      console.log(`💰 Overtime salary calculation:`, {
        baseSalary: salaryInfo.baseSalary,
        allowance: salaryInfo.allowance || 0,
        totalMonthlySalary,
        hourlyRate: hourlyRate.toFixed(2),
        overtimeRate,
        overtimeHours,
        overtimeSalary: overtimeSalary.toFixed(2)
      });

      return overtimeSalary;

    } catch (error) {
      console.error('❌ Error calculating overtime salary:', error);
      // Trả về 0 nếu có lỗi, không throw để không ảnh hưởng đến việc duyệt đơn
      return 0;
    }
  }
}

// Provide a default export for compatibility with different import styles
export default AttendanceCalculationService;

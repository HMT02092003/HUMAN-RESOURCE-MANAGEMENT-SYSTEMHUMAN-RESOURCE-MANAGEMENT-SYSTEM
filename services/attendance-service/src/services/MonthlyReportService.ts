import dayjs from 'dayjs';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import axios from 'axios';
import connection from '@/lib/Databases/Connection';
import SettingsService from './SettingsService';
import SalaryService from './SalaryService';
import * as AttendanceQueryService from './AttendanceQueryService';
import AttendanceCalculationService from './AttendanceCalculationService';

/**
 * Builds the "monthly-full" payload expected by frontend.
 * Keeps logic isolated and easier to test. Reuses DB queries where possible.
 */
export class MonthlyReportService {
  static async buildMonthlyFull(userId: number, month: string, token?: string) {
    // Reuse existing attendance summary if available by calling TimeAttendance + MonthlySummary
    // Call AttendanceQueryService directly (no circular import expected)
    const summary = await AttendanceQueryService.getUserMonthlyAttendance(userId, month, token);
    if (!summary) return null;

    // Load UA penalty rate setting via SettingsService
    let uaRate = (await SettingsService.getUnauthorizedAbsencePenaltyRate()) || 0;

    // Fetch salary via SalaryService
    const salary = await SalaryService.fetchSalary(userId, token);
    const baseSalary = salary?.baseSalary ?? null;
    const unauthorizedAbsencePenaltyPerDay = baseSalary ? Math.round((baseSalary / 100) * uaRate) : 0;

    // Build processed daily details
    const attendanceRows = summary.attendanceData || [];
    let presentDays = 0, lateDays = 0, earlyLeaveDays = 0, approvedLeaveDays = 0, businessTripDays = 0, unauthorizedAbsenceDays = 0;
    let totalLateMinutes = 0, totalEarlyLeaveMinutes = 0, totalLatePenalty = 0, totalEarlyLeavePenalty = 0, onTimeDays = 0, weekendDays = 0;

    const processedDailyDetails = attendanceRows.map((record: any) => {
      const checkInTime = record.checkInTime ? new Date(record.checkInTime) : null;
      const lateMinutes = parseFloat(record.lateMinutes || '0');
      const earlyDepartureMinutes = parseFloat(record.earlyDepartureMinutes || '0');
      const lateArrivalPenalty = parseFloat(record.lateArrivalPenalty || '0');
      const earlyLeavePenalty = parseFloat(record.earlyLeavePenalty || '0');
      const dailyTotalWorkHours = parseFloat(record.dailyTotalWorkHours || '0');
      const otMinutes = parseFloat(record.otMinutes || '0');
      const otSalary = parseFloat(record.otSalary || '0');

      const isLate = lateMinutes > 0;
      const isEarlyLeave = earlyDepartureMinutes > 0;
      const hasLatePenalty = lateArrivalPenalty > 0;
      const hasEarlyLeavePenalty = earlyLeavePenalty > 0;

      if (hasLatePenalty) lateDays++;
      if (hasEarlyLeavePenalty) earlyLeaveDays++;
      totalLateMinutes += lateMinutes;
      totalEarlyLeaveMinutes += earlyDepartureMinutes;
      totalLatePenalty += lateArrivalPenalty;
      totalEarlyLeavePenalty += earlyLeavePenalty;

      let status: string = 'working';
      let statusText = 'Đã chấm công';
      let isOnTime = false;
      let isWorkDay = record.isWorkingDay !== false;
      const isFuture = record.isFuture === true;

      if (!isWorkDay && !record.hasApprovedOT) {
        status = 'weekend';
        statusText = 'Cuối tuần';
        weekendDays++;
      } else if (record.hasBusinessTrip || record.type === 'business_trip') {
        status = 'business_trip';
        statusText = 'Công tác';
        businessTripDays++;
      } else if (record.hasApprovedLeave || record.type === 'leave' || record.type === 'sick-leave') {
        status = 'approved_leave';
        statusText = record.leaveInfo || record.leaveTypeName || 'Nghỉ phép';
        approvedLeaveDays++;
      } else if (isWorkDay && !record.checkInTime && !isFuture) {
        status = 'absent';
        statusText = 'Nghỉ không phép';
        unauthorizedAbsenceDays++;
      } else if (record.checkInTime) {
        presentDays++;
        if (!isLate && !isEarlyLeave) {
          isOnTime = true;
          onTimeDays++;
          statusText = 'Đúng giờ';
        } else if (isLate && isEarlyLeave) {
          statusText = 'Đi muộn & về sớm';
        } else if (isLate) {
          statusText = 'Đi muộn';
        } else if (isEarlyLeave) {
          statusText = 'Về sớm';
        }
      }

      return {
        date: record.date,
        dayOfWeek: checkInTime ? checkInTime.getDay() : new Date(record.date).getDay(),
        dayName: checkInTime
          ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][checkInTime.getDay()]
          : ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(record.date).getDay()],
        isWorkingDay: record.isWorkingDay !== false,
        hasAttendance: !!record.checkInTime,
        attendanceData: record.checkInTime ? {
          id: record.id,
          userId: record.userId,
          date: record.date,
          checkIn: record.checkIn || record.checkInTime,
          checkOut: record.checkOut || record.checkOutTime,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          status: status as any,
          totalHours: dailyTotalWorkHours,
          workHours: dailyTotalWorkHours,
          lateMinutes,
          earlyDepartureMinutes,
          lateArrivalPenalty,
          earlyLeavePenalty,
          dailyTotalWorkHours,
          otMinutes,
          otSalary
        } : undefined,
        hasApprovedLeave: status === 'approved_leave',
        leaveType: record.leaveType || record.type,
        leaveInfo: record.leaveInfo || record.reason,
        status: status as any,
        statusText,
        unauthorizedAbsencePenalty: status === 'absent' ? unauthorizedAbsencePenaltyPerDay : 0,
        isOnTime,
        lateMinutes,
        earlyLeaveMinutes: earlyDepartureMinutes,
        businessTripInfo: record.tripInfo || record.businessTripInfo,
        businessTripDestination: record.destination || record.businessTripDestination
      };
    });

    const totalUnauthorizedAbsencePenalty = unauthorizedAbsenceDays * unauthorizedAbsencePenaltyPerDay;
    const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;
    const absentDays = approvedLeaveDays + businessTripDays;

    const monthlyRecord = await MonthlySummaryModel.getByUserAndMonth(userId, month);
    const db: any = monthlyRecord as any;
    const monthlyStatsFromDb = monthlyRecord ? {
  totalDays: parseFloat((db.totalScheduledDays ?? summary.presentDays ?? 0).toString()) || 0,
      presentDays: parseFloat((db.presentDays ?? presentDays).toString()) || presentDays,
  absentDays: parseFloat((db.absentDays ?? (db.approvedLeaveDays ?? db.approvedLeaveDays) ?? absentDays).toString()) || absentDays,
  lateDays: parseFloat((db.lateDays ?? lateDays).toString()) || lateDays,
  earlyLeaveDays: parseFloat((db.earlyLeaveDays ?? earlyLeaveDays).toString()) || earlyLeaveDays,
      totalHours: parseFloat((db.totalWorkHours ?? 0).toString()) || summary.totalWorkHours,
  averageHours: parseFloat((db.averageWorkHours ?? (db.totalWorkHours && (db.totalScheduledDays || presentDays) ? db.totalWorkHours / (db.totalScheduledDays || presentDays) : undefined) ?? (presentDays > 0 ? summary.totalWorkHours / presentDays : 0)).toString()) || (presentDays > 0 ? summary.totalWorkHours / presentDays : 0),
      overtimeHours: parseFloat((db.totalOvertimeHours ?? summary.totalOvertimeHours).toString()) || summary.totalOvertimeHours,
      totalLatePenalty: parseFloat((db.totalLatePenalty ?? totalLatePenalty).toString()) || totalLatePenalty,
      totalEarlyLeavePenalty: parseFloat((db.totalEarlyLeavePenalty ?? totalEarlyLeavePenalty).toString()) || totalEarlyLeavePenalty,
      totalPenalty: parseFloat((db.totalPenalty ?? totalPenalty).toString()) || totalPenalty,
      totalOvertimePay: parseFloat((db.totalOvertimeSalary ?? summary.totalOvertimeSalary).toString()) || summary.totalOvertimeSalary,
      totalLateMinutes: parseFloat((db.totalLateMinutes ?? totalLateMinutes).toString()) || totalLateMinutes,
      totalEarlyLeaveMinutes: parseFloat((db.totalEarlyLeaveMinutes ?? totalEarlyLeaveMinutes).toString()) || totalEarlyLeaveMinutes,
  unauthorizedAbsenceDays: parseFloat((db.unauthorizedAbsenceDays ?? unauthorizedAbsenceDays).toString()) || unauthorizedAbsenceDays,
      totalUnauthorizedAbsencePenalty: parseFloat((db.totalUnauthorizedAbsencePenalty ?? totalUnauthorizedAbsencePenalty).toString()) || totalUnauthorizedAbsencePenalty,
  approvedLeaveDays: parseFloat((db.approvedLeaveDays ?? approvedLeaveDays).toString()) || approvedLeaveDays,
      businessTripDays: parseFloat((db.businessTripDays ?? businessTripDays).toString()) || businessTripDays,
      totalWorkingUnits: parseFloat((db.totalWorkingUnits ?? 0).toString()) || 0,
      totalOtWorkingUnits: parseFloat((db.totalOtWorkingUnits ?? 0).toString()) || 0,
    } : null;

    const monthlyStats = monthlyStatsFromDb ?? {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0,
      totalHours: 0,
      averageHours: 0,
      overtimeHours: 0,
      totalLatePenalty: 0,
      totalEarlyLeavePenalty: 0,
      totalPenalty: 0,
      totalOvertimePay: 0,
      totalLateMinutes: 0,
      totalEarlyLeaveMinutes: 0,
      unauthorizedAbsenceDays: 0,
      totalUnauthorizedAbsencePenalty: 0,
      approvedLeaveDays: 0,
      businessTripDays: 0,
      totalWorkingUnits: 0,
      totalOtWorkingUnits: 0
    };

    const [yearStr, monthStr] = (month || '').split('-');
    const response = {
      success: true,
      data: {
        monthlyStats,
        dailyData: {
          userId: summary.userId,
          year: parseInt(yearStr || '0'),
          month: parseInt(monthStr || '0'),
          monthlySalary: monthlyRecord?.baseSalary ?? 0,
          penaltyRate: 0,
          dailyDetails: processedDailyDetails,
          summary: {
            totalDays: (summary.attendanceData || []).length,
            workingDays: (summary.attendanceData || []).filter((r: any) => r.isWorkingDay !== false).length,
            attendedDays: presentDays,
            approvedLeaveDays,
            unauthorizedAbsenceDays,
            totalUnauthorizedAbsencePenalty,
            weekendDays,
            totalLateMinutes,
            totalEarlyLeaveMinutes,
            onTimeDays
          }
        }
      }
    };

    return response;
  }

  /**
   * Calculate aggregates for a given user and date (any date inside month) and upsert into monthly_attendances
   */
  static async calculateAndSaveMonthlyAttendance(userId: number, date: string) {
  // use top-level imports (dayjs, TimeAttendanceModel, HolidayModel, axios, SettingsService, SalaryService)
    try {
      const m = dayjs(date).format('YYYY-MM');
      const startDate = dayjs(`${m}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${m}-01`).endOf('month').format('YYYY-MM-DD');

      // Load rows for the month
      const rows: any[] = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      // Settings and holidays
      const workingDaysConfig = await SettingsService.getWorkingDays();
      // holidays table may store either a single 'date' column or a start_date/end_date range
      const holidayRows: any[] = await connection('holidays').where(function () {
        // try to match rows that overlap the month range
        this.whereBetween('date', [startDate, endDate]).orWhereBetween('start_date', [startDate, endDate]).orWhereBetween('end_date', [startDate, endDate]);
      }).select('*').catch(() => []);

      const holidaySet = new Set<string>();
      for (const hr of holidayRows) {
        if (hr.date) {
          holidaySet.add(hr.date);
        } else if (hr.start_date && hr.end_date) {
          let cur = dayjs(hr.start_date);
          const end = dayjs(hr.end_date);
          while (cur.isBefore(end) || cur.isSame(end, 'day')) {
            const d = cur.format('YYYY-MM-DD');
            holidaySet.add(d);
            cur = cur.add(1, 'day');
          }
        } else if (hr.start_date) {
          // single-day represented by start_date
          holidaySet.add(dayjs(hr.start_date).format('YYYY-MM-DD'));
        }
      }

      // Fetch approved applications (leave / business trip) from application service
      let approvedApplications: any[] = [];
      try {
        const [yearStr, monthStr] = m.split('-');
        const appUrl = (process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004') as string;
        const resp = await axios.get(`${appUrl}/api/applications/user/${userId}/approved`, { params: { year: parseInt(yearStr || '0'), month: parseInt(monthStr || '0') } });
        approvedApplications = resp.data.data || [];
      } catch (e) {
        // fallback to local DB leave_requests if external app service is unavailable
        try {
          const rows = await connection('leave_requests').where('userId', userId).andWhere(function () {
            // try common column names for date ranges
            this.whereBetween('date', [startDate, endDate]).orWhereBetween('startDate', [startDate, endDate]).orWhereBetween('endDate', [startDate, endDate]);
          }).andWhere('status', 'approved').select('*');
          approvedApplications = (rows || []).map((r: any) => ({ type: r.type || 'leave', data: r.data || r, status: r.status, id: r.id }));
        } catch (innerErr) {
          // ignore if local table doesn't exist or query fails
        }
      }

      // Aggregations
      let totalWorkHours = 0;
      let totalLateMinutes = 0;
      let totalEarlyLeaveMinutes = 0;
      let totalWorkingUnits = 0;
      let totalLatePenalty = 0;
      let totalEarlyLeavePenalty = 0;
      let totalOvertimeSalary = 0;
      let totalOvertimeMinutes = 0;

      let presentDays = 0;
      let lateDays = 0;
      let earlyLeaveDays = 0;

      // Map applications to days
      const leaveDaysSet = new Set<string>();
      const businessTripDaysSet = new Set<string>();
      for (const app of approvedApplications) {
        try {
          const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
          if (app.type === 'leave' && data && data.date) leaveDaysSet.add(data.date);
          if (app.type === 'business_trip' && data && data.date) businessTripDaysSet.add(data.date);
          if (app.type === 'leave' && data && data.startDate && data.endDate) {
            let cur = dayjs(data.startDate);
            while (cur.isBefore(dayjs(data.endDate)) || cur.isSame(dayjs(data.endDate), 'day')) { leaveDaysSet.add(cur.format('YYYY-MM-DD')); cur = cur.add(1, 'day'); }
          }
          if (app.type === 'business_trip' && data && data.startDate && data.endDate) {
            let cur = dayjs(data.startDate);
            while (cur.isBefore(dayjs(data.endDate)) || cur.isSame(dayjs(data.endDate), 'day')) { businessTripDaysSet.add(cur.format('YYYY-MM-DD')); cur = cur.add(1, 'day'); }
          }
        } catch (e) { /* ignore */ }
      }

      // Iterate days in month
      const daysInMonth = dayjs(`${m}-01`).daysInMonth();
      let totalScheduledDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs(`${m}-${String(d).padStart(2, '0')}`).format('YYYY-MM-DD');
        const isWorking = (function (dateStr: string) {
          if (!workingDaysConfig) return true; // default all days
          try {
            const dow = dayjs(dateStr).day(); // 0-6 Sun-Sat
            const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const key = map[dow] as keyof any;
            return workingDaysConfig && workingDaysConfig[key] ? !!workingDaysConfig[key] : true;
          } catch (e) { return true; }
        })(dateKey);
        const isHoliday = holidaySet.has(dateKey);
        if (isWorking && !isHoliday) totalScheduledDays++;
      }

      // Process attendance rows
      for (const r of rows) {
        // Normalize date key
        const dateKey = dayjs(r.date).format('YYYY-MM-DD');

        // Recalculate per-day values to avoid timezone/format drift or stale DB values
        try {
          const calc = await AttendanceCalculationService.calculateAttendance(r.checkInTime || null, r.checkOutTime || null, dateKey, userId);

          const workHours = parseFloat((calc.workHours || 0).toString());
          const lateMin = parseFloat((calc.lateMinutes || 0).toString());
          const earlyMin = parseFloat((calc.earlyDepartureMinutes || 0).toString());
          const latePenalty = parseFloat((calc.latePenaltyAmount || 0).toString());
          const earlyPenalty = parseFloat((calc.earlyLeavePenaltyAmount || 0).toString());
          const otMin = parseFloat((calc.otMinutes || 0).toString());
          const otSal = parseFloat((calc.otSalary || 0).toString());

          totalWorkHours += workHours;
          totalLateMinutes += lateMin;
          totalEarlyLeaveMinutes += earlyMin;
          totalWorkingUnits += workHours; // dailyWorkingUnit ~ workHours
          totalLatePenalty += latePenalty;
          totalEarlyLeavePenalty += earlyPenalty;
          totalOvertimeSalary += otSal;
          totalOvertimeMinutes += otMin;

          const hasAttendance = workHours > 0 || (parseFloat(r.dailyWorkingUnit?.toString() || '0') > 0);
          if (hasAttendance) presentDays++;
          if (lateMin > 0) lateDays++;
          if (earlyMin > 0) earlyLeaveDays++;
        } catch (e) {
          // fallback to using stored DB values if recalculation fails
          totalWorkHours += parseFloat(r.dailyTotalWorkHours?.toString() || '0');
          totalLateMinutes += parseFloat(r.lateMinutes?.toString() || '0');
          totalEarlyLeaveMinutes += parseFloat(r.earlyDepartureMinutes?.toString() || '0');
          totalWorkingUnits += parseFloat(r.dailyWorkingUnit?.toString() || '0');
          totalLatePenalty += parseFloat(r.lateArrivalPenalty?.toString() || '0');
          totalEarlyLeavePenalty += parseFloat(r.earlyLeavePenalty?.toString() || '0');
          totalOvertimeSalary += parseFloat(r.otSalary?.toString() || '0');
          totalOvertimeMinutes += parseFloat(r.otMinutes?.toString() || '0');

          const hasAttendance = !!(r.checkInTime && r.checkOutTime) || (parseFloat(r.dailyWorkingUnit?.toString() || '0') > 0);
          if (hasAttendance) presentDays++;
          if (parseFloat(r.lateMinutes?.toString() || '0') > 0) lateDays++;
          if (parseFloat(r.earlyDepartureMinutes?.toString() || '0') > 0) earlyLeaveDays++;
        }
      }

      // Approved leave / businessTrip counts
      const approvedLeaveDays = Array.from(leaveDaysSet).filter(d => d.startsWith(m)).length;
      const businessTripDays = Array.from(businessTripDaysSet).filter(d => d.startsWith(m)).length;

      const unauthorizedAbsenceDays = Math.max(0, totalScheduledDays - (presentDays + approvedLeaveDays + businessTripDays));

      const averageWorkHours = presentDays > 0 ? Math.round((totalWorkHours / presentDays) * 100) / 100 : 0;

      // Unauthorized absence penalty calculation
  const uaRate = (await SettingsService.getUnauthorizedAbsencePenaltyRate()) || 0;
  const salary = await SalaryService.fetchSalary(userId);
  const baseSalary = salary?.baseSalary ? parseFloat(salary.baseSalary.toString()) : null;
  const totalUnauthorizedAbsencePenalty = baseSalary ? Math.round((baseSalary / 100) * uaRate) * unauthorizedAbsenceDays : 0;

      const totalOvertimeHours = Math.round((totalOvertimeMinutes / 60) * 100) / 100;

      // Build upsert payload — map to migration columns
      const payload: any = {
        userId,
        month: m,
        totalScheduledDays,
        presentDays,
        // absentDays = scheduled - present - approved - businessTrip
        absentDays: Math.max(0, totalScheduledDays - (presentDays + approvedLeaveDays + businessTripDays)),
        approvedLeaveDays,
        unauthorizedAbsenceDays,
        businessTripDays,
        lateDays,
        earlyLeaveDays,
  totalLateMinutes: Math.round(totalLateMinutes * 100) / 100,
  totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes * 100) / 100,
  totalWorkHours: Math.round(totalWorkHours * 100) / 100,
  averageWorkHours: Math.round(averageWorkHours * 100) / 100,
  totalWorkingUnits: Math.round(totalWorkingUnits * 100) / 100,
  totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
  totalOtWorkingUnits: 0,
  totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
  totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty * 100) / 100,
  totalUnauthorizedAbsencePenalty: Math.round(totalUnauthorizedAbsencePenalty * 100) / 100,
  totalPenalty: Math.round((totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty) * 100) / 100,
  totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
        notes: null
      };

      // Upsert using objection: if exists update, else insert
      // Filter payload to allowed DB columns to avoid insert errors
      const allowed = [
        'userId','month','totalScheduledDays','presentDays','absentDays','approvedLeaveDays','unauthorizedAbsenceDays','businessTripDays',
        'lateDays','earlyLeaveDays','totalLateMinutes','totalEarlyLeaveMinutes','totalWorkHours','averageWorkHours','totalWorkingUnits',
        'totalOvertimeHours','totalOtWorkingUnits','totalLatePenalty','totalEarlyLeavePenalty','totalUnauthorizedAbsencePenalty','totalPenalty',
        'totalOvertimeSalary','isApproved','approvedBy','approvedAt','notes'
      ];
      const filtered = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));

      const existing = await MonthlySummaryModel.query().findOne({ userId, month: m });
      if (existing) {
        await MonthlySummaryModel.query().where('id', existing.id).patch(filtered);
        return { success: true, action: 'updated', data: filtered };
      } else {
        const inserted = await MonthlySummaryModel.query().insert({ userId, month: m, ...filtered });
        return { success: true, action: 'inserted', data: inserted };
      }
    } catch (error: any) {
      console.error('Error in calculateAndSaveMonthlyAttendance:', error);
      return { success: false, error: error.message };
    }
  }
}

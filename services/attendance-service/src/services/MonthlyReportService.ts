import dayjs from 'dayjs';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import axios from 'axios';
import HolidayModel from '@/Models/HolidayModel';
import SettingsService from './SettingsService';
import SalaryService from './SalaryService';
import AttendanceCalculationService from './attendance/AttendanceCalculationService';
import knex from 'knex';

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
        database: 'auth_service', // Auth service database name
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

/**
 * Builds the "monthly-full" payload expected by frontend.
 * Keeps logic isolated and easier to test. Reuses DB queries where possible.
 */
export class MonthlyReportService {
  static async buildMonthlyFull(userId: number, month: string, token?: string) {
    // Reuse existing attendance summary if available by calling TimeAttendance + MonthlySummary
    // Call AttendanceQueryService directly (no circular import expected)
    const summary = await AttendanceCalculationService.getUserMonthlyAttendance(userId, month, token);
    if (!summary) return null;

    // Fetch salary via SalaryService
    const salary = await SalaryService.fetchSalary(userId, token);
    const baseSalary = salary?.baseSalary ? parseFloat(salary.baseSalary.toString()) : 0;

    // Derive scheduled working days for this month from the attendance summary so
    // that the unauthorized absence penalty per day is computed on a daily salary
    // basis (baseSalary / totalScheduledDays) — kept consistent with
    // calculateAndSaveMonthlyAttendance.
    const attendanceDataForCalc = summary.attendanceData || [];
    const totalScheduledDaysFromSummary = Array.isArray(attendanceDataForCalc)
      ? attendanceDataForCalc.filter((d: any) => (d.isWorkingDay !== false) && !d.isHoliday).length
      : 0;
    const dailySalaryForSummary = totalScheduledDaysFromSummary > 0 ? baseSalary / totalScheduledDaysFromSummary : 0;
    // Calculate penalty per day as daily salary (rounded to integer, no decimals)
    const unauthorizedAbsencePenaltyPerDay = Math.round(dailySalaryForSummary);

    // Build processed daily details using a small builder and a single loop for aggregates
    const attendanceRows = summary.attendanceData || [];

    // Fetch full holiday rows for the month and build a date->holiday map so we can
    // include full holiday objects in the response (preferred over small holiday fields)
    // Note: we already load holidays in calculateAndSaveMonthlyAttendance, but here
    // we fetch the HolidayModel entries to provide richer info to the frontend.
    let holidayRowsForMonth: any[] = [];
    try {
      const [y, mStr] = (month || '').split('-');
      const monthStart = dayjs(`${y}-${mStr}-01`).startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs(`${y}-${mStr}-01`).endOf('month').format('YYYY-MM-DD');
      holidayRowsForMonth = await HolidayModel.query()
        .where(function () {
          this.whereBetween('start_date', [monthStart, monthEnd])
            .orWhereBetween('end_date', [monthStart, monthEnd])
            .orWhere(function () {
              this.where('start_date', '<=', monthStart).andWhere('end_date', '>=', monthEnd);
            });
        })
        .select('*')
        .catch(() => []);
    } catch (e) {
      holidayRowsForMonth = [];
    }

    // Build a map from date -> holiday full object (if holiday spans multiple days, map each day)
    const holidayMap = new Map<string, any>();
    for (const hr of holidayRowsForMonth) {
      if (hr && hr.start_date && hr.end_date) {
        let cur = dayjs(hr.start_date);
        const end = dayjs(hr.end_date);
        while (cur.isBefore(end) || cur.isSame(end, 'day')) {
          holidayMap.set(cur.format('YYYY-MM-DD'), hr);
          cur = cur.add(1, 'day');
        }
      }
    }

    // Attach full holiday object to each attendance row if available
    for (const r of attendanceRows) {
      try {
        const d = dayjs(r.date).format('YYYY-MM-DD');
        if (holidayMap.has(d)) {
          (r as any)._holidayFullObject = holidayMap.get(d);
          // also set isHoliday flag for backward-compat
          r.isHoliday = true;
          r.holidayName = r.holidayName || holidayMap.get(d).name || null;
          r.isPublicHoliday = r.isPublicHoliday ?? !!holidayMap.get(d).is_public;
        }
      } catch (e) {
        // ignore attach errors
      }
    }

    // --- Attach full approved application objects (leave / business trip) to rows ---
    let approvedAppsForMonth: any[] = [];
    try {
      const [y, mStr] = (month || '').split('-');
      const appUrl = (process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004') as string;
      const resp = await axios.get(`${appUrl}/api/applications/user/${userId}/approved`, {
        params: { year: parseInt(y || '0'), month: parseInt(mStr || '0') }
      });
      approvedAppsForMonth = resp.data?.data || [];
    } catch (e) {
      approvedAppsForMonth = [];
    }

    const leaveAppMap = new Map<string, any[]>();
    const businessTripAppMap = new Map<string, any[]>();
    for (const app of approvedAppsForMonth) {
      try {
        const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};
        const t = (app.type || '').toString().toLowerCase();
        const isLeaveApp = t.includes('leave');
        const isBusinessTripApp = t.includes('business') || t.includes('trip') || t.includes('businesstrip') || t.includes('business_trip') || t.includes('business-trip') || t === 'businesstrip';

        // single-day
        // Single-day (explicit date) or date range. Normalize dates before expansion.
        if (data.date) {
          const d = dayjs(data.date).format('YYYY-MM-DD');
          if (isLeaveApp) {
            const arr = leaveAppMap.get(d) || [];
            arr.push(app);
            leaveAppMap.set(d, arr);
          }
          if (isBusinessTripApp) {
            const arr = businessTripAppMap.get(d) || [];
            arr.push(app);
            businessTripAppMap.set(d, arr);
          }
        } else if (data.startDate && data.endDate) {
          // Ensure start <= end
          let start = dayjs(data.startDate);
          let end = dayjs(data.endDate);
          if (start.isAfter(end)) {
            const tmp = start; start = end; end = tmp;
          }
          let cur = start;
          while (cur.isBefore(end) || cur.isSame(end, 'day')) {
            const d = cur.format('YYYY-MM-DD');
            if (isLeaveApp) {
              const arr = leaveAppMap.get(d) || [];
              arr.push(app);
              leaveAppMap.set(d, arr);
            }
            if (isBusinessTripApp) {
              const arr = businessTripAppMap.get(d) || [];
              arr.push(app);
              businessTripAppMap.set(d, arr);
            }
            cur = cur.add(1, 'day');
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // Attach app objects to attendance rows for convenience
    for (const r of attendanceRows) {
      try {
        const d = dayjs(r.date).format('YYYY-MM-DD');
        const leaves = leaveAppMap.get(d) || [];
        const trips = businessTripAppMap.get(d) || [];
        if (leaves.length > 0) {
          (r as any)._leaveFullObjects = leaves;
          (r as any)._leaveFullObject = leaves[0];
          r.hasApprovedLeave = r.hasApprovedLeave || true;
          r.leaveInfo = r.leaveInfo || leaves[0].title || leaves[0].reason || null;
        }
        if (trips.length > 0) {
          (r as any)._businessTripFullObjects = trips;
          (r as any)._businessTripFullObject = trips[0];
          r.hasBusinessTrip = r.hasBusinessTrip || true;
          r.businessTripInfo = r.businessTripInfo || trips[0].title || trips[0].reason || null;
        }
      } catch (e) {
        // ignore
      }
    }

    const weekdayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    const buildDay = (record: any) => {
      const checkInDate = record.checkInTime ? new Date(record.checkInTime) : null;
      const lateMinutes = Number(record.lateMinutes ?? 0);
      const earlyDepartureMinutes = Number(record.earlyDepartureMinutes ?? 0);
      const lateArrivalPenalty = Number(record.lateArrivalPenalty ?? 0);
      const earlyLeavePenalty = Number(record.earlyLeavePenalty ?? 0);
      const workHours = Number(record.dailyTotalWorkHours ?? record.workHours ?? record.totalHours ?? 0);

      const isWorkDay = (record.isWorkingDay !== false) && !record.isHoliday;
      const isFuture = record.isFuture === true;

      let status = 'working';
      let statusText = 'Đã chấm công';
      let isOnTime = false;

      if (!isWorkDay && !record.hasApprovedOT) { status = 'weekend'; statusText = 'Cuối tuần'; }
      else if (record.hasBusinessTrip || record.type === 'business_trip') { status = 'business_trip'; statusText = 'Công tác'; }
      else if (record.hasApprovedLeave || ['leave','sick-leave'].includes(record.type)) { status = 'approved_leave'; statusText = record.leaveInfo ?? record.leaveTypeName ?? 'Nghỉ phép'; }
      else if (isWorkDay && !record.checkInTime && !isFuture) { status = 'absent'; statusText = 'Nghỉ không phép'; }
      else if (record.checkInTime) {
        const late = lateMinutes > 0;
        const early = earlyDepartureMinutes > 0;
        if (!late && !early) { isOnTime = true; statusText = 'Đúng giờ'; }
        else if (late && early) statusText = 'Đi muộn & về sớm';
        else if (late) statusText = 'Đi muộn';
        else if (early) statusText = 'Về sớm';
      }

  // Prefer the full HolidayModel object for the date if available (added map below)
      const holidayObjForDate = (record._holidayFullObject) ? record._holidayFullObject : undefined;
      const holidayData = holidayObjForDate ? {
        // include full holiday object fields: keep original keys for consumers
        isHoliday: Boolean(record.isHoliday || true),
        holidayName: holidayObjForDate.name ?? record.holidayName ?? null,
        isPublicHoliday: Boolean(holidayObjForDate.is_public ?? record.isPublicHoliday),
        // attach raw holiday object for consumers who want full data
        holiday: holidayObjForDate
      } : ((record.isHoliday || record.holidayName) ? {
        isHoliday: Boolean(record.isHoliday),
        holidayName: record.holidayName ?? null,
        isPublicHoliday: Boolean(record.isPublicHoliday)
      } : undefined);

      // Date key to lookup apps maps if full objects were not attached to the record
      const dateKey = dayjs(record.date).format('YYYY-MM-DD');
      const leaveAppsFromMap = (leaveAppMap && leaveAppMap.get) ? (leaveAppMap.get(dateKey) || []) : [];

      // Determine single leave object (prefer attached record-level object, then first from map)
      const singleLeaveObj = (record as any)._leaveFullObject ?? (leaveAppsFromMap[0] ?? undefined);
      // Determine leaveApplications array only when no single leave object is set (avoid redundancy)
      const leaveAppsArray = !(singleLeaveObj) ? ((record as any)._leaveFullObjects ?? (leaveAppsFromMap.length > 0 ? leaveAppsFromMap : undefined)) : undefined;

      const leaveData = (record.hasApprovedLeave || ['leave','sick-leave'].includes(record.type) || singleLeaveObj || (leaveAppsFromMap && leaveAppsFromMap.length > 0)) ? {
        hasApprovedLeave: Boolean(record.hasApprovedLeave),
        leaveType: record.leaveType ?? record.type,
        leaveInfo: record.leaveInfo ?? record.reason ?? null,
        leaveTypeName: record.leaveTypeName ?? null,
        // embed full application object (single) if attached earlier or found in approvedAppsForMonth map
        leave: singleLeaveObj,
        // Only include leaveApplications when single leave object is not present
        leaveApplications: leaveAppsArray
      } : undefined;

      const tripAppsFromMap = (businessTripAppMap && businessTripAppMap.get) ? (businessTripAppMap.get(dateKey) || []) : [];
      const businessTripData = (record.hasBusinessTrip || record.type === 'business_trip' || record._businessTripFullObject || (tripAppsFromMap && tripAppsFromMap.length > 0)) ? {
        hasBusinessTrip: Boolean(record.hasBusinessTrip),
        businessTripInfo: record.tripInfo ?? record.businessTripInfo ?? null,
        businessTripDestination: record.destination ?? record.businessTripDestination ?? null,
        // embed full application objects (prefer attached objects, otherwise use map)
        businessTrip: (record as any)._businessTripFullObject ?? (tripAppsFromMap[0] ?? undefined),
        businessTripApplications: (record as any)._businessTripFullObjects ?? (tripAppsFromMap.length > 0 ? tripAppsFromMap : undefined)
      } : undefined;

      const attendanceData = record.checkInTime ? {
        id: record.id,
        userId: record.userId,
        date: record.date,
        checkIn: record.checkIn ?? record.checkInTime ?? null,
        checkOut: record.checkOut ?? record.checkOutTime ?? null,
        checkInTime: record.checkInTime ?? null,
        checkOutTime: record.checkOutTime ?? null,
        status,
        totalHours: Number(record.totalHours ?? workHours),
        workHours,
        lateMinutes,
        earlyDepartureMinutes,
        lateArrivalPenalty,
        earlyLeavePenalty,
        dailyTotalWorkHours: workHours,
        otMinutes: Number(record.otMinutes ?? 0),
        otSalary: Number(record.otSalary ?? 0)
      } : undefined;

      const dayIndex = checkInDate ? checkInDate.getDay() : new Date(record.date).getDay();

      return {
        date: record.date,
        dayOfWeek: dayIndex,
        dayName: weekdayNames[dayIndex],
        isWorkingDay: record.isWorkingDay !== false,
        hasAttendance: !!record.checkInTime,
        holidayData,
        leaveData,
        businessTripData,
        attendanceData,
        status,
        statusText,
        unauthorizedAbsencePenalty: status === 'absent' ? unauthorizedAbsencePenaltyPerDay : 0,
        isOnTime,
        lateMinutes,
        earlyLeaveMinutes: earlyDepartureMinutes
      };
    };

    const processedDailyDetails = attendanceRows.map(buildDay);

    // Compute aggregates (used later) in a single pass
    const agg = processedDailyDetails.reduce((acc: any, d: any) => {
      acc.totalLateMinutes += Number(d.lateMinutes ?? 0);
      acc.totalEarlyLeaveMinutes += Number(d.earlyLeaveMinutes ?? 0);
      acc.totalLatePenalty += Number(d.attendanceData?.lateArrivalPenalty ?? 0);
      acc.totalEarlyLeavePenalty += Number(d.attendanceData?.earlyLeavePenalty ?? 0);

      if (d.isWorkingDay) {
        if (d.status === 'approved_leave') acc.approvedLeaveDays++;
        if (d.status === 'business_trip') acc.businessTripDays++;
        if (d.status === 'absent') acc.unauthorizedAbsenceDays++;
        if (d.hasAttendance) acc.presentDays++;
        if (d.attendanceData && Number(d.attendanceData.lateMinutes ?? 0) > 0) acc.lateDays++;
        if (d.attendanceData && Number(d.attendanceData.earlyDepartureMinutes ?? 0) > 0) acc.earlyLeaveDays++;
      }

      if (d.status === 'weekend') acc.weekendDays++;
      if (d.isOnTime) acc.onTimeDays++;

      return acc;
    }, {
      totalLateMinutes: 0,
      totalEarlyLeaveMinutes: 0,
      totalLatePenalty: 0,
      totalEarlyLeavePenalty: 0,
      presentDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0,
      approvedLeaveDays: 0,
      businessTripDays: 0,
      unauthorizedAbsenceDays: 0,
      weekendDays: 0,
      onTimeDays: 0
    } as any);

    const presentDays = agg.presentDays;
    const lateDays = agg.lateDays;
    const earlyLeaveDays = agg.earlyLeaveDays;
    const approvedLeaveDays = agg.approvedLeaveDays;
    const businessTripDays = agg.businessTripDays;
    const unauthorizedAbsenceDays = agg.unauthorizedAbsenceDays;
    const totalLateMinutes = agg.totalLateMinutes;
    const totalEarlyLeaveMinutes = agg.totalEarlyLeaveMinutes;
    const totalLatePenalty = agg.totalLatePenalty;
    const totalEarlyLeavePenalty = agg.totalEarlyLeavePenalty;
    const onTimeDays = agg.onTimeDays;
    const weekendDays = agg.weekendDays;

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
      // Round to integer (no decimals)
      totalUnauthorizedAbsencePenalty: Math.round(parseFloat((db.totalUnauthorizedAbsencePenalty ?? totalUnauthorizedAbsencePenalty).toString()) || totalUnauthorizedAbsencePenalty),
      // Per-day unauthorized absence penalty (VND) - rounded to integer
      unauthorizedAbsencePenaltyPerDay: Math.round(parseFloat(((db as any).unauthorizedAbsencePenaltyPerDay ?? unauthorizedAbsencePenaltyPerDay).toString()) || unauthorizedAbsencePenaltyPerDay),
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
            // Total unauthorized absence penalty for the month (rounded to integer)
            totalUnauthorizedAbsencePenalty: Math.round(totalUnauthorizedAbsencePenalty),
            // Unauthorized absence penalty per day (VND) - rounded to integer
            unauthorizedAbsencePenaltyPerDay: Math.round(unauthorizedAbsencePenaltyPerDay),
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
   * ✨ CẬP NHẬT: Tính toán theo công thức mới của user
   */
  static async calculateAndSaveMonthlyAttendance(userId: number, date: string) {
    try {
      console.log(`\n📊 [attendance] Starting calculateAndSaveMonthlyAttendance for user ${userId}, date ${date}`);

      const m = dayjs(date).format('YYYY-MM');
      const startDate = dayjs(`${m}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${m}-01`).endOf('month').format('YYYY-MM-DD');

      // ✨ Lấy thông tin user startDate trực tiếp từ database của auth-service
      const userStartDate = await getUserStartDate(userId);
      if (userStartDate) {
        console.log(`👤 [attendance] User ${userId} started working on: ${userStartDate}`);
      }

      // 1️⃣ Load attendance rows for the month
      const rows: any[] = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      console.log(`📋 [attendance] Found ${rows.length} attendance records for ${m}`);

      // 2️⃣ Load settings and holidays
      const workingDaysConfig = await SettingsService.getWorkingDays();
      console.log(`⚙️ [attendance] Working days config:`, workingDaysConfig);

      // Load holidays using Objection.js HolidayModel
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
      for (const hr of holidayRows) {
        // Bảng holidays chỉ có start_date và end_date
        if (hr.start_date && hr.end_date) {
          let cur = dayjs(hr.start_date);
          const end = dayjs(hr.end_date);
          while (cur.isBefore(end) || cur.isSame(end, 'day')) {
            holidaySet.add(cur.format('YYYY-MM-DD'));
            cur = cur.add(1, 'day');
          }
        }
      }
      console.log(`🎉 [attendance] Found ${holidaySet.size} holiday dates:`, Array.from(holidaySet));

      // 3️⃣ Fetch approved applications (leave/business trip)
      let approvedApplications: any[] = [];
      try {
        const [yearStr, monthStr] = m.split('-');
        const appUrl = (process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004') as string;
        const resp = await axios.get(`${appUrl}/api/applications/user/${userId}/approved`, {
          params: { year: parseInt(yearStr || '0'), month: parseInt(monthStr || '0') }
        });
        approvedApplications = resp.data.data || [];
        console.log(`✅ [attendance] Found ${approvedApplications.length} approved applications`);
      } catch (e) {
        console.log(`⚠️ [attendance] Failed to fetch applications, using fallback`);
      }

      // 4️⃣ Tính tổng số ngày làm việc trong tháng (loại trừ ngày nghỉ theo setting)
      const daysInMonth = dayjs(`${m}-01`).daysInMonth();
      let totalScheduledDays = 0;
      // We also compute scheduled working days up to today (for unauthorized absence calculation)
      const todayStr = dayjs().format('YYYY-MM-DD');
      const isCurrentMonth = dayjs().format('YYYY-MM') === m;
      let totalScheduledDaysUpToToday = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs(`${m}-${String(d).padStart(2, '0')}`).format('YYYY-MM-DD');
        
        // ✨ Chỉ tính những ngày từ startDate trở đi
        if (userStartDate && dayjs(dateKey).isBefore(userStartDate, 'day')) {
          console.log(`⏭️ [attendance] Skipping ${dateKey} (before startDate ${userStartDate})`);
          continue; // Bỏ qua những ngày trước khi user bắt đầu làm việc
        }
        
        const dow = dayjs(dateKey).day(); // 0-6 Sun-Sat
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = dayNames[dow] || 'monday';

        // Kiểm tra xem ngày này có phải ngày làm việc không (theo setting)
        const isWorkingDay = workingDaysConfig ? !!(workingDaysConfig as any)[dayKey] : true;
        const isHoliday = holidaySet.has(dateKey);

        // Chỉ tính những ngày là ngày làm việc và không phải ngày lễ
        if (isWorkingDay && !isHoliday) {
          totalScheduledDays++;
          // If month is current month, only count up to today
          if (!isCurrentMonth || dayjs(dateKey).isSameOrBefore(todayStr, 'day')) {
            totalScheduledDaysUpToToday++;
          }
        }
      }

      console.log(`📅 [attendance] Total scheduled working days in ${m}: ${totalScheduledDays} (excluding holidays, weekend, and days before startDate)`);
      console.log(`📅 [attendance] Scheduled working days up to today in ${m}: ${totalScheduledDaysUpToToday}`);

      // 5️⃣ Map applications to days
      const leaveDaysSet = new Set<string>();
      const businessTripDaysSet = new Set<string>();

      for (const app of approvedApplications) {
        try {
          const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;

          if (app.type === 'leave') {
            if (data.date) {
              leaveDaysSet.add(dayjs(data.date).format('YYYY-MM-DD'));
            } else if (data.startDate && data.endDate) {
              let start = dayjs(data.startDate);
              let end = dayjs(data.endDate);
              if (start.isAfter(end)) { const tmp = start; start = end; end = tmp; }
              let cur = start;
              while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                leaveDaysSet.add(cur.format('YYYY-MM-DD'));
                cur = cur.add(1, 'day');
              }
            }
          }

          if (app.type === 'business_trip') {
            if (data.date) {
              businessTripDaysSet.add(dayjs(data.date).format('YYYY-MM-DD'));
            } else if (data.startDate && data.endDate) {
              let start = dayjs(data.startDate);
              let end = dayjs(data.endDate);
              if (start.isAfter(end)) { const tmp = start; start = end; end = tmp; }
              let cur = start;
              while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                businessTripDaysSet.add(cur.format('YYYY-MM-DD'));
                cur = cur.add(1, 'day');
              }
            }
          }
        } catch (e) {
          console.error(`⚠️ [attendance] Error parsing application:`, e);
        }
      }

      console.log(`📝 [attendance] Leave days: ${leaveDaysSet.size}, Business trip days: ${businessTripDaysSet.size}`);

      // 6️⃣ Process attendance rows và tính toán

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

      // Helper to check scheduled working day (respect settings + holidays)
      const isScheduledWorkingDay = (dateKey: string) => {
        const dow = dayjs(dateKey).day();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = dayNames[dow] || 'monday';
        const cfgIsWork = workingDaysConfig ? !!(workingDaysConfig as any)[dayKey] : true;
        return cfgIsWork && !holidaySet.has(dateKey);
      };

      // Build a set of all days in month for fast lookup
      const allDaysInMonth = Array.from({ length: daysInMonth }, (_, i) => dayjs(`${m}-${String(i + 1).padStart(2, '0')}`).format('YYYY-MM-DD'));
      // Track which days already have attendance
      const attendanceDaysSet = new Set(rows.map(r => dayjs(r.date).format('YYYY-MM-DD')));

      for (const r of rows) {
        const dateKey = dayjs(r.date).format('YYYY-MM-DD');
        const isHoliday = holidaySet.has(dateKey);
        const rowIsScheduledWorkDay = isScheduledWorkingDay(dateKey);
        const isFuture = dayjs(dateKey).isAfter(todayStr, 'day');

        try {
          // Recalculate để có dữ liệu chính xác nhất
          const calc = await AttendanceCalculationService.calculateAttendance(
            r.checkInTime || null,
            r.checkOutTime || null,
            dateKey,
            userId,
            undefined, // token
            r.approvedOtEndTime || null, // approvedOtEndTime
            isHoliday // ✨ Truyền thông tin ngày lễ để tính lương OT đúng
          );

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
          totalWorkingUnits += Math.min(1, workHours / (calc.standardHours || 8)); // Chỉ tính tối đa 1 công/ngày
          totalLatePenalty += latePenalty;
          totalEarlyLeavePenalty += earlyPenalty;
          totalOvertimeSalary += otSal;
          totalOvertimeMinutes += otMin;

          // ✨ Tổng số ngày đi làm = số ngày có chấm công
          const hasAttendance = !!(r.checkInTime || r.checkOutTime);
          if (hasAttendance && rowIsScheduledWorkDay && !isFuture) presentDays++;
          if (lateMin > 0 && rowIsScheduledWorkDay && !isFuture) lateDays++;
          if (earlyMin > 0 && rowIsScheduledWorkDay && !isFuture) earlyLeaveDays++;

        } catch (e) {
          console.error(`⚠️ [attendance] Error calculating for date ${dateKey}:`, e);
          // Fallback to stored values
          totalWorkHours += parseFloat(r.dailyTotalWorkHours?.toString() || '0');
          totalLateMinutes += parseFloat(r.lateMinutes?.toString() || '0');
          totalEarlyLeaveMinutes += parseFloat(r.earlyDepartureMinutes?.toString() || '0');
          totalWorkingUnits += Math.min(1, parseFloat(r.dailyWorkingUnit?.toString() || '0')); // Chỉ tính tối đa 1 công/ngày
          totalLatePenalty += parseFloat(r.lateArrivalPenalty?.toString() || '0');
          totalEarlyLeavePenalty += parseFloat(r.earlyLeavePenalty?.toString() || '0');
          totalOvertimeSalary += parseFloat(r.otSalary?.toString() || '0');
          totalOvertimeMinutes += parseFloat(r.otMinutes?.toString() || '0');

          const hasAttendance = !!(r.checkInTime && r.checkOutTime);
          if (hasAttendance && rowIsScheduledWorkDay && !isFuture) presentDays++;
          if (parseFloat(r.lateMinutes?.toString() || '0') > 0 && rowIsScheduledWorkDay && !isFuture) lateDays++;
          if (parseFloat(r.earlyDepartureMinutes?.toString() || '0') > 0 && rowIsScheduledWorkDay && !isFuture) earlyLeaveDays++;
        }
      }

      // ✨ Bổ sung công cho các ngày nghỉ phép, công tác, ngày lễ có đơn công tác (không có chấm công)
      for (const dateKey of allDaysInMonth) {
        // ✨ Bỏ qua những ngày trước startDate
        if (userStartDate && dayjs(dateKey).isBefore(userStartDate, 'day')) {
          continue;
        }
        
        // Chỉ cộng 1 công cho các ngày nghỉ phép, công tác, hoặc ngày lễ có đơn công tác nếu KHÔNG có chấm công
        if (!attendanceDaysSet.has(dateKey) && isScheduledWorkingDay(dateKey) && dayjs(dateKey).isSameOrBefore(todayStr, 'day')) {
          if (leaveDaysSet.has(dateKey)) {
            totalWorkingUnits += 1;
          } else if (businessTripDaysSet.has(dateKey)) {
            totalWorkingUnits += 1;
          } else if (holidaySet.has(dateKey) && businessTripDaysSet.has(dateKey)) {
            totalWorkingUnits += 1;
          }
        }
      }


      // 7️⃣ Tính các số liệu tổng hợp
      // Count approved leave and business trip days only when they fall on scheduled working days
      // ✨ Lấy enriched attendance data để có đầy đủ thông tin nghỉ phép/công tác
      const enrichedData = await AttendanceCalculationService.getUserMonthlyAttendance(userId, m, undefined);
      const enrichedRows = enrichedData?.attendanceData || [];

      // Kết hợp ngày nghỉ phép/công tác từ enriched data (đã có đầy đủ thông tin)
      const approvedLeaveDaysSetCombined = new Set(
        enrichedRows
          .filter((r: any) => r.hasApprovedLeave && isScheduledWorkingDay(dayjs(r.date).format('YYYY-MM-DD')) && dayjs(r.date).isSameOrBefore(todayStr, 'day'))
          .map((r: any) => dayjs(r.date).format('YYYY-MM-DD'))
      );
      const businessTripDaysSetCombined = new Set(
        enrichedRows
          .filter((r: any) => r.hasBusinessTrip && isScheduledWorkingDay(dayjs(r.date).format('YYYY-MM-DD')) && dayjs(r.date).isSameOrBefore(todayStr, 'day'))
          .map((r: any) => dayjs(r.date).format('YYYY-MM-DD'))
      );
      const approvedLeaveDaysArr = Array.from(approvedLeaveDaysSetCombined);
      const businessTripDaysArr = Array.from(businessTripDaysSetCombined);
      const approvedLeaveDays = approvedLeaveDaysArr.length;
      const businessTripDays = businessTripDaysArr.length;

      // ✨ LOGIC ĐÚNG theo public/2.0.3:
      // - absentDays = Vắng mặt (có lý do) = nghỉ phép + công tác
      // - unauthorizedAbsenceDays = Nghỉ không phép = Tổng ngày làm việc - (Có chấm công + Nghỉ phép + Công tác)
      const absentDays = approvedLeaveDays + businessTripDays;

      // Tìm danh sách các ngày bị tính là nghỉ không phép
      // Lấy ngày có chấm công hợp lệ
      const presentDaysSet = new Set(rows.filter(r => {
        const dateKey = dayjs(r.date).format('YYYY-MM-DD');
        return isScheduledWorkingDay(dateKey) && !!(r.checkInTime || r.checkOutTime) && dayjs(dateKey).isSameOrBefore(todayStr, 'day');
      }).map(r => dayjs(r.date).format('YYYY-MM-DD')));

      const unauthorizedAbsenceDates: string[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs(`${m}-${String(d).padStart(2, '0')}`).format('YYYY-MM-DD');
        
        // ✨ Bỏ qua những ngày trước startDate
        if (userStartDate && dayjs(dateKey).isBefore(userStartDate, 'day')) {
          console.log(`⏭️ [attendance] Skipping unauthorized check for ${dateKey} (before startDate ${userStartDate})`);
          continue;
        }
        
        if (
          isScheduledWorkingDay(dateKey)
          && dayjs(dateKey).isSameOrBefore(todayStr, 'day')
          && !presentDaysSet.has(dateKey)
          && !approvedLeaveDaysSetCombined.has(dateKey)
          && !businessTripDaysSetCombined.has(dateKey)
        ) {
          console.log(`❗ [attendance] ${dateKey} marked as unauthorized absence`);
          unauthorizedAbsenceDates.push(dateKey);
        }
      }
      const unauthorizedAbsenceDaysFinal = unauthorizedAbsenceDates.length;

      // Debug log các ngày bị tính là nghỉ không phép
      console.log(`\n❗ [attendance] Unauthorized absence days (${unauthorizedAbsenceDaysFinal}):`, unauthorizedAbsenceDates);

      const averageWorkHours = presentDays > 0 ? Math.round((totalWorkHours / presentDays) * 100) / 100 : 0;

      // ✨ Tiền phạt nghỉ không phép = (Lương / Số ngày làm việc trong tháng) * Số ngày nghỉ không phép
      const salary = await SalaryService.fetchSalary(userId);
      const baseSalary = salary?.baseSalary ? parseFloat(salary.baseSalary.toString()) : 0;

      // Dùng totalScheduledDays (tổng số ngày làm việc trong tháng) để tính lương ngày
      const dailySalary = totalScheduledDays > 0 ? baseSalary / totalScheduledDays : 0;
      // Calculate penalty: dailySalary * unauthorizedAbsenceDays, rounded to integer (no decimals)
      const totalUnauthorizedAbsencePenalty = Math.round(dailySalary * unauthorizedAbsenceDaysFinal);

      const totalOvertimeHours = Math.round((totalOvertimeMinutes / 60) * 100) / 100;

      console.log(`\n📊 [attendance] Calculation summary for ${m}:`);
      console.log(`   - Total scheduled days: ${totalScheduledDays}`);
      console.log(`   - Present days (có chấm công): ${presentDays}`);
      console.log(`   - Approved leave days: ${approvedLeaveDays}`);
      console.log(`   - Business trip days: ${businessTripDays}`);
      console.log(`   - Absent days (= nghỉ phép + công tác): ${absentDays}`);
      console.log(`   - Unauthorized absence days (nghỉ không phép): ${unauthorizedAbsenceDaysFinal}`);
      console.log(`   - Late days: ${lateDays}`);
      console.log(`   - Early leave days: ${earlyLeaveDays}`);
      console.log(`   - Total work hours: ${totalWorkHours.toFixed(2)}`);
      console.log(`   - Average work hours: ${averageWorkHours}`);
      console.log(`   - Total overtime hours: ${totalOvertimeHours}`);
      console.log(`   - Total late penalty: ${totalLatePenalty} VND`);
      console.log(`   - Total early leave penalty: ${totalEarlyLeavePenalty} VND`);
      console.log(`   - Total unauthorized absence penalty: ${totalUnauthorizedAbsencePenalty} VND`);
      console.log(`   - Total penalty: ${totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty} VND`);
      console.log(`   - Total overtime salary: ${totalOvertimeSalary} VND`);

      // Build upsert payload — map to migration columns
      const payload: any = {
        userId,
        month: m,
        totalScheduledDays,
        presentDays,
        absentDays, // ✨ Vắng mặt = nghỉ phép + công tác
        approvedLeaveDays,
        unauthorizedAbsenceDays: unauthorizedAbsenceDaysFinal,
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

      console.log(`\n📝 [attendance] Full payload to save:`);
      console.log(JSON.stringify(payload, null, 2));

      // Upsert using objection: if exists update, else insert
      // Filter payload to allowed DB columns to avoid insert errors
      const allowed = [
        'userId', 'month', 'totalScheduledDays', 'presentDays', 'absentDays', 'approvedLeaveDays', 'unauthorizedAbsenceDays', 'businessTripDays',
        'lateDays', 'earlyLeaveDays', 'totalLateMinutes', 'totalEarlyLeaveMinutes', 'totalWorkHours', 'averageWorkHours', 'totalWorkingUnits',
        'totalOvertimeHours', 'totalOtWorkingUnits', 'totalLatePenalty', 'totalEarlyLeavePenalty', 'totalUnauthorizedAbsencePenalty', 'totalPenalty',
        'totalOvertimeSalary', 'isApproved', 'approvedBy', 'approvedAt', 'notes', 'dailyDetails'
      ];
      const filtered = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));

      // ✨ Lưu full daily details snapshot vào dailyDetails
      try {
        // Build the enriched daily data for storage by reusing the same enrichment
        // logic used by getUserMonthlyAttendance
        console.log(`🔄 [attendance] Building dailyDetails snapshot...`);
        const full = await AttendanceCalculationService.getUserMonthlyAttendance(userId, m, undefined);
        if (full && full.attendanceData) {
          filtered['dailyDetails'] = JSON.stringify(full.attendanceData);
          console.log(`✅ [attendance] dailyDetails snapshot saved (${full.attendanceData.length} days)`);
        }
      } catch (e) {
        console.error(`⚠️ [attendance] Failed to build dailyDetails snapshot:`, e);
      }

      // ✨ Upsert logic: Nếu có rồi thì update, chưa có thì insert
      const existing = await MonthlySummaryModel.query().findOne({ userId, month: m });
      if (existing) {
        console.log(`🔄 [attendance] Updating existing monthly record id=${existing.id}`);
        await MonthlySummaryModel.query().where('id', existing.id).patch(filtered);
        console.log(`✅ [attendance] Updated monthly_attendances for user ${userId} month ${m}`);
        return { success: true, action: 'updated', data: filtered, id: existing.id };
      } else {
        console.log(`➕ [attendance] Inserting new monthly record`);
        const inserted = await MonthlySummaryModel.query().insert(filtered);
        console.log(`✅ [attendance] Inserted monthly_attendances for user ${userId} month ${m}, id=${inserted.id}`);
        return { success: true, action: 'inserted', data: inserted };
      }
    } catch (error: any) {
      console.error('❌ [attendance] Error in calculateAndSaveMonthlyAttendance:', error);
      return { success: false, error: error.message };
    }
  }

  static async getMonthlyAttendanceForAllUsers(page: number, pageSize: number, sortField: string, sortOrder: 'asc' | 'desc') {
    try {
      const result = await MonthlySummaryModel.query()
        .orderBy(sortField || 'id', sortOrder || 'asc')
        .page(Math.max(0, page - 1), pageSize);

      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ [attendance] Error in getMonthlyAttendanceForAllUsers:', error);
      return { success: false, error: error.message };
    }
  }
}

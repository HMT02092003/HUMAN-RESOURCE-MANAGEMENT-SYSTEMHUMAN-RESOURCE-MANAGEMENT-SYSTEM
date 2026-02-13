import dayjs from 'dayjs';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import { EmployeeScheduleModel } from '@/Models/EmployeeScheduleModel';
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

/**
 * Builds the "monthly-full" payload expected by frontend.
 * Keeps logic isolated and easier to test. Reuses DB queries where possible.
 */
export class MonthlyReportService {
  static async buildMonthlyFull(userId: number, month: string, token?: string, userData?: any) {
    // Fetch OT rates from settings upfront
    const normalOtRate = await SettingsService.getOvertimeRateInUnits();
    const holidayOtRate = await SettingsService.getHolidayOvertimeRateInUnits();
    // ✨ New simplified buildMonthlyFull logic: Read-only from DB (requested by user)
    // 1. Fetch pre-calculated summary from DB (fast path)
    const summary = await AttendanceCalculationService.getUserMonthlyAttendance(userId, month, token, true);

    if (!summary) {
      console.log(`⚠️ [attendance] No summary found for user ${userId} month ${month}. Returning null/empty.`);
      return null;
    }

    const [yearStr, monthStr] = (month || '').split('-');

    // 2. Map directly to response structure without re-calculation
    const monthlyStats = {
      totalDays: summary.totalScheduledDays || 0,
      presentDays: summary.presentDays || 0,
      absentDays: summary.absentDays || 0,
      lateDays: summary.totalLateDays || 0,
      earlyLeaveDays: summary.totalEarlyLeaveDays || 0,
      totalHours: summary.totalWorkHours || 0,
      averageHours: (summary.presentDays > 0 ? Number((summary.totalWorkHours / summary.presentDays).toFixed(2)) : 0),
      overtimeHours: summary.totalOvertimeHours || 0,
      totalLatePenalty: summary.totalLatePenalty || 0,
      totalEarlyLeavePenalty: summary.totalEarlyLeavePenalty || 0,
      totalPenalty: summary.totalPenalty || 0,
      totalOvertimePay: summary.totalOvertimeSalary || 0,
      totalLateMinutes: summary.totalLateMinutes || 0,
      totalEarlyLeaveMinutes: summary.totalEarlyLeaveMinutes || 0,
      unauthorizedAbsenceDays: summary.unauthorizedAbsenceDays || 0,
      totalUnauthorizedAbsencePenalty: summary.totalUnauthorizedAbsencePenalty || 0,
      // Derived for display
      unauthorizedAbsencePenaltyPerDay: Math.round(summary.unauthorizedAbsenceDays > 0 ? summary.totalUnauthorizedAbsencePenalty / summary.unauthorizedAbsenceDays : 0),
      approvedLeaveDays: summary.approvedLeaveDays || 0,
      businessTripDays: summary.businessTripDays || 0,
      totalWorkingUnits: summary.totalWorkingUnits || 0,
      totalOtWorkingUnits: summary.totalOtWorkingUnits || 0,
      totalEffectiveOtWorkingUnits: summary.totalOtWorkingUnits || 0,
      totalOvertimeHours: summary.totalOvertimeHours || 0
    };

    // 3. Use snapshot directly from DB JSON
    const dailyDetails = summary.attendanceData || [];

    // 4. Lightweight formatting for UI (Status Text, Color)
    const mappedDetails = dailyDetails.map((d: any) => {
      let statusText = '';
      let color = '';
      const isFuture = dayjs(d.date).isAfter(dayjs(), 'day');

      if (d.isHoliday) {
        statusText = d.holidayName || 'Ngày lễ';
        color = '#ff4d4f';
        if (d.hasApprovedOT) statusText += ' (OT)';
      } else if (d.hasApprovedLeave) {
        statusText = d.isPaidLeave ? 'Nghỉ phép (Lương)' : 'Nghỉ (K.Lương)';
        color = '#faad14';
      } else if (d.hasBusinessTrip) {
        statusText = 'Công tác';
        color = '#1890ff';
      } else if (d.checkInTime) {
        if ((d.lateMinutes || 0) > 0) { statusText = 'Đi muộn'; color = '#ffec3d'; }
        else if ((d.earlyDepartureMinutes || 0) > 0) { statusText = 'Về sớm'; color = '#ffec3d'; }
        else { statusText = 'Đúng giờ'; color = '#52c41a'; }
      } else if (d.isWorkingDay && !isFuture) {
        statusText = 'Nghỉ không phép';
        color = '#cf1322';
      } else {
        statusText = isFuture ? '--' : 'Ngày nghỉ';
        color = '#d9d9d9';
      }

      return {
        ...d,
        statusText,
        color
      };
    });

    // 5. Wrap in API response structure (matching old contract)
    return {
      success: true,
      data: {
        monthlyStats,
        dailyData: {
          userId: summary.userId,
          year: parseInt(yearStr || '0'),
          month: parseInt(monthStr || '0'),
          monthlySalary: (summary as any).baseSalary || 0,
          penaltyRate: 0,
          dailyDetails: mappedDetails,
          summary: {
            totalDays: mappedDetails.length,
            workingDays: mappedDetails.filter((d: any) => d.isWorkingDay !== false).length,
            attendedDays: summary.presentDays,
            approvedLeaveDays: summary.approvedLeaveDays,
            unauthorizedAbsenceDays: summary.unauthorizedAbsenceDays,
            totalUnauthorizedAbsencePenalty: Math.round(summary.totalUnauthorizedAbsencePenalty),
            unauthorizedAbsencePenaltyPerDay: Math.round(summary.unauthorizedAbsenceDays > 0 ? summary.totalUnauthorizedAbsencePenalty / summary.unauthorizedAbsenceDays : 0),
            weekendDays: 0,
            totalLateMinutes: summary.totalLateMinutes,
            totalEarlyLeaveMinutes: summary.totalEarlyLeaveMinutes,
            onTimeDays: 0,
            totalOvertimeHours: summary.totalOvertimeHours
          }
        }
      }
    };
  }

  /**
   * Calculate aggregates for a given user and date (any date inside month) and upsert into monthly_attendances
   * ✨ CẬP NHẬT: Tính toán theo công thức mới của user
   */
  static async calculateAndSaveMonthlyAttendance(userId: number, date: string, userData?: any) {
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
        const appUrl = (process.env['APPLICATION_SERVICE_URL'] || 'http://127.0.0.1:4008') as string;
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

          if (app.type === 'business-trip' || app.type === 'business_trip') {
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

      // 5.5️⃣ Lấy các ngày đăng ký ca "Nghỉ ngày" đã được duyệt
      // Những ngày này sẽ không tính công và không bị phạt
      const dayOffSchedules = await EmployeeScheduleModel.query()
        .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
        .where('employee_schedules.user_id', userId)
        .where('employee_schedules.status', 'approved')
        .whereRaw("employee_schedules.date >= ? AND employee_schedules.date <= ?", [startDate, endDate])
        .whereRaw("LOWER(shifts.name) LIKE '%ngh%' OR shifts.start_time = '00:00:00'") // Ca nghỉ ngày
        .select('employee_schedules.date');

      const dayOffDaysSet = new Set<string>();
      for (const schedule of dayOffSchedules) {
        dayOffDaysSet.add(dayjs(schedule.date).format('YYYY-MM-DD'));
      }
      console.log(`📝 [attendance] Day-off days (nghỉ ngày đã duyệt): ${dayOffDaysSet.size}`, Array.from(dayOffDaysSet));

      // 6️⃣ Process attendance rows và tính toán

      /**
       * ✅ KHỞI TẠO CÁC BIẾN TỔNG HỢP THÁNG
       * 
       * - totalWorkHours: Tổng giờ làm việc thực tế
       * - totalWorkingUnits: Tổng công (bao gồm cả OT, nghỉ phép, công tác)
       * - totalOtWorkingUnits: Tổng công OT RAW (chưa nhân hệ số)
       * - totalOvertimeHours: Tổng số giờ làm thêm thực tế (mới)
       * - totalLatePenalty/totalEarlyLeavePenalty: Tổng tiền phạt
       */
      let totalWorkHours = 0;
      let totalLateMinutes = 0;
      let totalEarlyLeaveMinutes = 0;
      let totalWorkingUnits = 0;
      let totalOtWorkingUnits = 0;
      let totalOvertimeHours = 0; // ✨ Tổng giờ OT thực tế
      let totalLatePenalty = 0;
      let totalEarlyLeavePenalty = 0;

      let presentDays = 0;
      let lateDays = 0;
      let earlyLeaveDays = 0;

      // Helper to check scheduled working day (respect settings + holidays)
      const isScheduledWorkingDay = (dateKey: string) => {
        const dow = dayjs(dateKey).day();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = dayNames[dow] || 'monday';
        const cfgIsWork = workingDaysConfig ? !!(workingDaysConfig as any)[dayKey] : (dayKey !== 'sunday' && dayKey !== 'saturday');
        return cfgIsWork && !holidaySet.has(dateKey);
      };

      // Build a set of all days in month for fast lookup
      const allDaysInMonth = Array.from({ length: daysInMonth }, (_, i) => dayjs(`${m}-${String(i + 1).padStart(2, '0')}`).format('YYYY-MM-DD'));

      for (const r of rows) {
        const dateKey = dayjs(r.date).format('YYYY-MM-DD');
        const isHoliday = holidaySet.has(dateKey);
        const rowIsScheduledWorkDay = isScheduledWorkingDay(dateKey);
        const isFuture = dayjs(dateKey).isAfter(todayStr, 'day');


        const isLeave = leaveDaysSet.has(dateKey);
        const isTrip = businessTripDaysSet.has(dateKey);

        // ✨ ƯU TIÊN: Nếu có đơn nghỉ phép hoặc công tác -> BỎ QUA dữ liệu chấm công ngày này
        if (isLeave || isTrip) {
          console.log(`ℹ️ [attendance] Ignoring attendance for ${dateKey} due to Approved Leave/Trip`);
          continue;
        }

        try {
          // Recalculate để có dữ liệu chính xác nhất
          // ✨ Cần lấy shift cho ngày này
          const shift = await import('./attendance/ShiftHelper').then(m => m.getShiftForUserAndDate(userId, dateKey));

          // ✨ Tìm đơn OT đã duyệt cho ngày này để lấy giờ bắt đầu/kết thúc
          const otApp = approvedApplications.find(app => {
            if (app.type !== 'overtime') return false;
            const d = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
            return d.date === dateKey || d.overtimeDate === dateKey;
          });

          let otStartTime = null;
          let otEndTime = null;
          if (otApp) {
            const d = typeof otApp.data === 'string' ? JSON.parse(otApp.data) : otApp.data;
            if (d.startTime) otStartTime = d.startTime;
            if (d.endTime) {
              otEndTime = d.endTime;
            } else if (d.startTime && d.totalHours) {
              // ✨ Calculate end time if missing but totalHours provided
              const duration = d.totalHours || d.hours || d.duration;
              if (duration) {
                otEndTime = dayjs(`${dateKey} ${d.startTime}`).add(parseFloat(duration), 'hour').format('HH:mm');
              }
            }
            console.log(`⏱️ [attendance] Found OT app for ${dateKey}: ${otStartTime} - ${otEndTime}`);
          }

          const calc = await AttendanceCalculationService.calculateAttendance(
            r.checkInTime || null,
            r.checkOutTime || null,
            dateKey,
            userId,
            undefined, // token
            otEndTime, // ✨ Pass OT End Time correctly
            isHoliday, // Truyền thông tin ngày lễ
            shift, // ✨ Truyền shift info
            otStartTime // ✨ Pass OT Start Time correctly
          );

          const workHours = parseFloat((calc.workHours || 0).toString());
          const lateMin = parseFloat((calc.lateMinutes || 0).toString());
          const earlyMin = parseFloat((calc.earlyDepartureMinutes || 0).toString());
          const latePenalty = parseFloat((calc.latePenaltyAmount || 0).toString());
          const earlyPenalty = parseFloat((calc.earlyLeavePenaltyAmount || 0).toString());
          // ✅ REMOVED: otMin (deprecated, use otWorkingUnit instead)

          // ✨ Lấy công từ calculation
          const dailyUnits = parseFloat((calc.totalWorkingUnit || 0).toString()); // Tổng công (bao gồm cả OT)
          const otUnits = parseFloat((calc.otWorkingUnit || 0).toString()); // Công OT RAW
          const baseUnits = parseFloat((calc.dailyWorkingUnit || 0).toString()); // ✨ Base Working Unit
          const otHours = parseFloat((calc.overtimeHours || 0).toString()); // ✨ Giờ OT thực tế

          totalWorkHours += workHours;
          totalLateMinutes += lateMin;
          totalEarlyLeaveMinutes += earlyMin;
          totalWorkingUnits += dailyUnits; // ✨ Cộng tổng công
          totalOtWorkingUnits += otUnits; // ✨ Cộng công OT (RAW)
          totalOvertimeHours += otHours; // ✨ Cộng giờ OT thực tế
          totalLatePenalty += latePenalty;
          totalEarlyLeavePenalty += earlyPenalty;

          // ✨ SYNCHRONIZE: Update TimeAttendance record if calculated values differ
          // This ensures that when we generate the snapshot later (via getUserMonthlyAttendance),
          // it picks up these fresh calculations (e.g. 9 mins early leave instead of 0).
          if (r.id) {
            const storedLate = parseFloat(String(r.lateMinutes || 0));
            const storedEarly = parseFloat(String(r.earlyDepartureMinutes || 0));
            const storedWork = parseFloat(String(r.dailyTotalWorkHours || 0));
            const storedUnits = parseFloat(String(r.totalWorkingUnit || 0));

            // ✨ Check differences including working units
            if (
              Math.abs(lateMin - storedLate) > 0.1 ||
              Math.abs(earlyMin - storedEarly) > 0.1 ||
              Math.abs(workHours - storedWork) > 0.1 ||
              Math.abs(dailyUnits - storedUnits) > 0.01
            ) {
              console.log(`🔄 [attendance] Syncing daily stats for ${dateKey} (ID: ${r.id}): Late ${storedLate}->${lateMin}, Unit ${storedUnits}->${dailyUnits}`);
              await TimeAttendanceModel.query().patch({
                lateMinutes: lateMin,
                earlyDepartureMinutes: earlyMin,
                dailyTotalWorkHours: workHours,
                lateArrivalPenalty: latePenalty,
                earlyLeavePenalty: earlyPenalty,
                totalWorkingUnit: dailyUnits,
                dailyWorkingUnit: baseUnits, // ✨ Patch base units
                otWorkingUnit: otUnits,
                overtimeHours: otHours
              }).where('id', r.id);
            }
          }

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
          totalWorkingUnits += parseFloat(r.totalWorkingUnit?.toString() || '0'); // ✨ Dùng totalWorkingUnit thay vì dailyWorkingUnit
          totalOtWorkingUnits += parseFloat(r.otWorkingUnit?.toString() || '0'); // ✨ Công OT (RAW)
          totalOvertimeHours += parseFloat(r.overtimeHours?.toString() || '0'); // ✨ Giờ OT thực tế
          totalLatePenalty += parseFloat(r.lateArrivalPenalty?.toString() || '0');
          totalEarlyLeavePenalty += parseFloat(r.earlyLeavePenalty?.toString() || '0');

          const hasAttendance = !!(r.checkInTime && r.checkOutTime);
          if (hasAttendance && rowIsScheduledWorkDay && !isFuture) presentDays++;
          if (parseFloat(r.lateMinutes?.toString() || '0') > 0 && rowIsScheduledWorkDay && !isFuture) lateDays++;
          if (parseFloat(r.earlyDepartureMinutes?.toString() || '0') > 0 && rowIsScheduledWorkDay && !isFuture) earlyLeaveDays++;
        }
      }

      // ✨ Bổ sung công cho các ngày nghỉ phép có lương và công tác (không có chấm công)
      // Build set of paid leave days from approved applications
      const paidLeaveDaysSet = new Set<string>();
      for (const app of approvedApplications) {
        if (app.type === 'leave') {
          try {
            const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
            // Chỉ tính nghỉ phép CÓ LƯƠNG (leaveType === 'paid' hoặc không có leaveType = mặc định có lương, TRỪ KHI isPaidLeave === false)
            const isPaidLeave = (data.isPaidLeave !== false) && (!data.leaveType || data.leaveType === 'paid' || data.leaveType === 'annual');

            if (isPaidLeave) {
              if (data.date) {
                paidLeaveDaysSet.add(dayjs(data.date).format('YYYY-MM-DD'));
              } else if (data.startDate && data.endDate) {
                let start = dayjs(data.startDate);
                let end = dayjs(data.endDate);
                if (start.isAfter(end)) { const tmp = start; start = end; end = tmp; }
                let cur = start;
                while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                  paidLeaveDaysSet.add(cur.format('YYYY-MM-DD'));
                  cur = cur.add(1, 'day');
                }
              }
            }
          } catch (e) {
            console.error(`⚠️ [attendance] Error parsing leave application:`, e);
          }
        }
      }

      for (const dateKey of allDaysInMonth) {
        // Bỏ qua những ngày trước startDate
        if (userStartDate && dayjs(dateKey).isBefore(userStartDate, 'day')) {
          continue;
        }

        const isHoliday = holidaySet.has(dateKey);
        const isPaidLeave = paidLeaveDaysSet.has(dateKey);
        const isBusinessTrip = businessTripDaysSet.has(dateKey);
        const isScheduledWork = isScheduledWorkingDay(dateKey);
        const isPast = dayjs(dateKey).isSameOrBefore(todayStr, 'day');

        // ✨ Ưu tiên tính ngày nghỉ phép / công tác (Bất kể có chấm công hay không, vì đã bỏ qua chấm công ở trên)
        if (isPast) {
          // 1. Nghỉ phép CÓ LƯƠNG vào ngày làm việc → +1 công
          // 1. Nghỉ phép CÓ LƯƠNG vào ngày làm việc → +1 công
          if (isPaidLeave && isScheduledWork) {
            totalWorkingUnits += 1;
            console.log(`✅ [attendance] ${dateKey}: Nghỉ phép có lương → +1 công`);
          }
          // 2. Công tác vào ngày làm việc thường → +1 công
          else if (isBusinessTrip && isScheduledWork && !isHoliday) {
            totalWorkingUnits += 1;
            console.log(`✅ [attendance] ${dateKey}: Công tác ngày thường → +1 công`);
          }
          // 3. Công tác vào ngày lễ → +1 công * tỉ lệ OT ngày lễ
          else if (isBusinessTrip && isHoliday) {
            const holidayRateSetting = await SettingsService.getSettingValue('HolidayOvertimeRateInUnits');
            const holidayRate = holidayRateSetting?.rate || 3.0;
            totalWorkingUnits += 1 * holidayRate;
            totalOtWorkingUnits += 1 * (holidayRate - 1); // Công vượt so với 1 công bình thường
            console.log(`✅ [attendance] ${dateKey}: Công tác ngày lễ → +${holidayRate.toFixed(2)} công (trong đó ${(holidayRate - 1).toFixed(2)} công OT)`);
          }
        }
      }


      // 7️⃣ Tính các số liệu tổng hợp
      // Count approved leave and business trip days only when they fall on scheduled working days
      // ✨ Lấy enriched attendance data để có đầy đủ thông tin nghỉ phép/công tác
      const enrichedData = await AttendanceCalculationService.getUserMonthlyAttendance(userId, m, undefined, false, approvedApplications);
      const enrichedRows = enrichedData?.attendanceData || [];

      // Kết hợp ngày nghỉ phép/công tác từ enriched data (đã có đầy đủ thông tin)
      // ✨ IMPORTANT: Do NOT filter out days with checkInTime. We want to COUNT them as leave/trip even if checkInTime exists (since we ignore it).
      const businessTripDaysSetCombined = new Set(
        enrichedRows
          .filter((r: any) => r.hasBusinessTrip && isScheduledWorkingDay(dayjs(r.date).format('YYYY-MM-DD')) && dayjs(r.date).isSameOrBefore(todayStr, 'day'))
          .map((r: any) => dayjs(r.date).format('YYYY-MM-DD'))
      );

      const approvedLeaveDaysSetCombined = new Set(
        enrichedRows
          .filter((r: any) => r.hasApprovedLeave && !r.hasBusinessTrip && isScheduledWorkingDay(dayjs(r.date).format('YYYY-MM-DD')) && dayjs(r.date).isSameOrBefore(todayStr, 'day'))
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

        // ✨ Bỏ qua ngày đã đăng ký ca "Nghỉ ngày" đã được duyệt
        if (dayOffDaysSet.has(dateKey)) {
          console.log(`⏭️ [attendance] Skipping unauthorized check for ${dateKey} (approved day-off)`);
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

      // ✨ FIX: Insert missing records for unauthorized absence so they show up in future reports
      if (unauthorizedAbsenceDates.length > 0) {
        for (const missingDate of unauthorizedAbsenceDates) {
          try {
            const exist = await TimeAttendanceModel.query().where({ userId, date: missingDate }).first();
            if (!exist) {
              console.log(`📝 [attendance] Creating missing record for unauthorized absence on ${missingDate}`);
              await TimeAttendanceModel.query().insert({
                userId,
                date: missingDate,
                checkInTime: null,
                checkOutTime: null,
                dailyTotalWorkHours: 0,
                dailyWorkingUnit: 0,
                totalWorkingUnit: 0,
                otWorkingUnit: 0,
                overtimeHours: 0
              });
            }
          } catch (e) {
            console.error(`⚠️ [attendance] Failed to insert missing record for ${missingDate}:`, e);
          }
        }
      }

      const averageWorkHours = presentDays > 0 ? Math.round((totalWorkHours / presentDays) * 100) / 100 : 0;

      /**
       * ✅ TÍNH TIỀN PHẠT NGHỈ KHÔNG PHÉP
       * Công thức: (Lương cơ bản / Số ngày làm việc trong tháng) * Số ngày nghỉ không phép
       */
      const salary = await SalaryService.fetchSalary(userId, undefined, userData);
      const baseSalary = salary?.baseSalary ? parseFloat(salary.baseSalary.toString()) : 0;
      const dailySalary = totalScheduledDays > 0 ? baseSalary / totalScheduledDays : 0;
      const totalUnauthorizedAbsencePenalty = Math.round(dailySalary * unauthorizedAbsenceDaysFinal);

      /**
       * ✅ LƯU Ý: totalOvertimeHours đã được tính trong vòng lặp (cộng dồn từ calc.overtimeHours)
       * KHÔNG cần tính lại từ totalOtWorkingUnits
       */

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
      console.log(`   - Total working units: ${totalWorkingUnits.toFixed(4)} công`);
      console.log(`   - Total OT working units: ${totalOtWorkingUnits.toFixed(4)} công`);
      console.log(`   - Total late penalty: ${totalLatePenalty} VND`);
      console.log(`   - Total early leave penalty: ${totalEarlyLeavePenalty} VND`);
      console.log(`   - Total unauthorized absence penalty: ${totalUnauthorizedAbsencePenalty} VND`);
      console.log(`   - Total penalty: ${totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty} VND`);

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
        totalWorkingUnits: Math.round(totalWorkingUnits * 10000) / 10000, // ✨ Tổng công (4 chữ số thập phân)
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalOtWorkingUnits: Math.round(totalOtWorkingUnits * 10000) / 10000, // ✨ Công OT (4 chữ số thập phân)
        totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
        totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty * 100) / 100,
        totalUnauthorizedAbsencePenalty: Math.round(totalUnauthorizedAbsencePenalty * 100) / 100,
        totalPenalty: Math.round((totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty) * 100) / 100,
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
        'isApproved', 'approvedBy', 'approvedAt', 'notes', 'dailyDetails'
      ];
      const filtered = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));

      // ✨ Lưu full daily details snapshot vào dailyDetails
      try {
        // Build the enriched daily data for storage by reusing the same enrichment
        // logic used by getUserMonthlyAttendance
        console.log(`🔄 [attendance] Building dailyDetails snapshot... Calling getUserMonthlyAttendance`);
        const full = await AttendanceCalculationService.getUserMonthlyAttendance(userId, m, undefined, false, approvedApplications);
        console.log(`🔄 [attendance] Finished getUserMonthlyAttendance for snapshot`);
        if (full && full.attendanceData) {
          filtered['dailyDetails'] = JSON.stringify(full.attendanceData);
          console.log(`✅ [attendance] dailyDetails snapshot saved (${full.attendanceData.length} days)`);

          const debugDay = full.attendanceData.find((d: any) => d.date.includes('2026-02-16'));
          if (debugDay) {
            console.log(`🔍 [Pre-Save Check] 2026-02-16: hasApprovedOT=${debugDay.hasApprovedOT}, shift=${JSON.stringify(debugDay.shift)}`);
          }
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

      // Enrich data với thông tin user và department
      if (result.results && result.results.length > 0) {
        // Lấy danh sách unique userIds
        const userIds = [...new Set(result.results.map((r: any) => r.userId))];

        // Gọi sang auth-service để lấy thông tin users
        try {
          const authUrl = process.env['AUTH_SERVICE_URL'] || 'http://auth-service:4101';
          const response = await axios.post(
            `${authUrl}/api/users/bulk`,
            { userIds },
            { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
          );

          if (response.data && response.data.success && response.data.data) {
            const users = response.data.data;

            // Lấy danh sách unique departmentIds từ users
            const departmentIds = [...new Set(users.map((u: any) => u.departmentId).filter(Boolean))];

            // Gọi sang employee-service để lấy thông tin departments
            let departmentsById = new Map();
            if (departmentIds.length > 0) {
              try {
                const employeeServiceUrl = process.env['EMPLOYEE_SERVICE_URL'] || 'http://employee-service:4102';
                const deptPromises = departmentIds.map((deptId: any) =>
                  axios.get(`${employeeServiceUrl}/api/departments/${deptId}`)
                    .then(r => r.data)
                    .catch(() => null)
                );
                const deptResults = await Promise.all(deptPromises);
                deptResults.forEach((dept: any) => {
                  if (dept && dept.data) {
                    departmentsById.set(dept.data.id, dept.data);
                  }
                });
              } catch (error: any) {
                console.error('⚠️ Could not fetch department details:', error.message);
              }
            }

            // Map users với department info
            const usersById = new Map(
              users.map((u: any) => [
                u.id,
                {
                  ...u,
                  department: departmentsById.get(u.departmentId) || null
                }
              ])
            );

            // Enrich mỗi record với thông tin user
            result.results = result.results.map((record: any) => {
              const user: any = usersById.get(record.userId);
              return {
                ...record,
                user: user || null,
                username: user?.username || null,
                fullName: user?.fullName || null,
                departmentId: user?.departmentId || null,
                chevronId: user?.chevronId || null
              };
            });
          }
        } catch (error: any) {
          console.error('⚠️ Could not fetch user details:', error.message);
          // Không throw error, chỉ log warning và trả về data không có user info
        }
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ [attendance] Error in getMonthlyAttendanceForAllUsers:', error);
      return { success: false, error: error.message };
    }
  }
}

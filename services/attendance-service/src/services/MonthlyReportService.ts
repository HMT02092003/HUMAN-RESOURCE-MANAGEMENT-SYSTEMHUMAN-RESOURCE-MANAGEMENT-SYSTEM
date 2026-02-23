import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ_VN = 'Asia/Ho_Chi_Minh';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import { EmployeeScheduleModel } from '@/Models/EmployeeScheduleModel';
import axios from 'axios';
import HolidayModel from '@/Models/HolidayModel';
import SettingsService from './SettingsService';
import SalaryService from './SalaryService';
import AttendanceCalculationService, { fetchApplicationsDirectly } from './attendance/AttendanceCalculationService';
import { parseDBDate } from './attendance/AttendanceHelpers';
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
        port: 5433,
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
    console.log("🚀 [MonthlyReportService] I AM THE LATEST VERSION (Read-only from DB)");
    // ✨ Trả về mode CHỈ ĐỌC dữ liệu từ DB, không fetch realtime/tính lại toàn bộ (theo ý USER: "chỉ khi chấm công mới tính thôi còn lấy dữ liệu thì lấy thuần 100%").

    // 1. DỮ LIỆU THÁNG: Lấy 100% từ bảng monthly_attendances (Theo đúng yêu cầu DB > UI)
    const monthlyRecord: any = await MonthlySummaryModel.query()
      .where('userId', userId)
      .where('month', month)
      .first();

    // 2. DỮ LIỆU NGÀY: Lấy từ time_attendances, đính kèm kết quả ghép Lễ/Phép (không cache/không tính lại DB)
    const dailyDataRecalc: any = await AttendanceCalculationService.getUserMonthlyAttendance(userId, month, token, false);

    if (!monthlyRecord) {
      console.log(`⚠️ [attendance] Không tìm thấy dữ liệu thống kê tháng cho userId ${userId} tháng ${month} trong bảng monthly_attendances.`);
      return null;
    }

    const [yearStr, monthStr] = (month || '').split('-');

    // 3. Map directly to response structure for MonthlyStats
    const monthlyStats = {
      totalDays: Number(monthlyRecord.totalScheduledDays || 0),
      presentDays: Number(monthlyRecord.presentDays || 0),
      absentDays: Number(monthlyRecord.absentDays || 0),
      lateDays: Number(monthlyRecord.lateDays || 0),
      earlyLeaveDays: Number(monthlyRecord.earlyLeaveDays || 0),
      totalHours: Number(monthlyRecord.totalWorkHours || 0),
      averageHours: Number(monthlyRecord.averageWorkHours || 0),
      overtimeHours: Number(monthlyRecord.totalOvertimeHours || 0),
      totalLatePenalty: Number(monthlyRecord.totalLatePenalty || 0),
      totalEarlyLeavePenalty: Number(monthlyRecord.totalEarlyLeavePenalty || 0),
      totalPenalty: Number(monthlyRecord.totalPenalty || 0),
      totalOvertimePay: Number(monthlyRecord.totalOvertimeSalary || 0),
      totalLateMinutes: Number(monthlyRecord.totalLateMinutes || 0),
      totalEarlyLeaveMinutes: Number(monthlyRecord.totalEarlyLeaveMinutes || 0),
      unauthorizedAbsenceDays: Number(monthlyRecord.unauthorizedAbsenceDays || 0),
      totalUnauthorizedAbsencePenalty: Number(monthlyRecord.totalUnauthorizedAbsencePenalty || 0),
      // Derived for display
      unauthorizedAbsencePenaltyPerDay: Number(monthlyRecord.unauthorizedAbsenceDays > 0 ? Math.round(Number(monthlyRecord.totalUnauthorizedAbsencePenalty || 0) / Number(monthlyRecord.unauthorizedAbsenceDays)) : 0),
      approvedLeaveDays: Number(monthlyRecord.approvedLeaveDays || 0),
      businessTripDays: Number(monthlyRecord.businessTripDays || 0),
      totalWorkingUnits: Number(monthlyRecord.totalWorkingUnits || 0),
      totalOtWorkingUnits: Number(monthlyRecord.totalOtWorkingUnits || 0),
      totalEffectiveOtWorkingUnits: Number(monthlyRecord.totalOtWorkingUnits || 0)
    };

    // 4. Lấy danh sách record hằng ngày đã format để gán cho Lịch
    let dailyDetails = dailyDataRecalc?.attendanceData || [];
    if (typeof dailyDetails === 'string') {
      try { dailyDetails = JSON.parse(dailyDetails); } catch (e) { dailyDetails = []; }
    }

    // 4. Lightweight formatting for UI (Status Text, Color)
    const mappedDetails = dailyDetails.map((d: any) => {
      let statusText = '';
      let color = '';
      const isFuture = dayjs.tz(d.date, TZ_VN).isAfter(dayjs.tz(undefined, TZ_VN), 'day');

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
          userId: monthlyRecord.userId,
          year: parseInt(yearStr || '0'),
          month: parseInt(monthStr || '0'),
          monthlySalary: monthlyRecord.baseSalary || 0,
          penaltyRate: 0,
          dailyDetails: mappedDetails,
          summary: {
            totalDays: mappedDetails.length,
            workingDays: mappedDetails.filter((d: any) => d.isWorkingDay !== false).length,
            attendedDays: monthlyRecord.presentDays || 0,
            presentDays: monthlyRecord.presentDays || 0,
            lateDays: monthlyRecord.lateDays || 0,
            earlyLeaveDays: monthlyRecord.earlyLeaveDays || 0,
            totalHours: monthlyRecord.totalWorkHours || 0,
            totalWorkingUnits: monthlyRecord.totalWorkingUnits || 0,
            totalOtWorkingUnits: monthlyRecord.totalOtWorkingUnits || 0,
            approvedLeaveDays: monthlyRecord.approvedLeaveDays,
            unauthorizedAbsenceDays: monthlyRecord.unauthorizedAbsenceDays,
            totalUnauthorizedAbsencePenalty: Math.round(monthlyRecord.totalUnauthorizedAbsencePenalty || 0),
            unauthorizedAbsencePenaltyPerDay: Math.round(monthlyRecord.unauthorizedAbsenceDays > 0 ? (monthlyRecord.totalUnauthorizedAbsencePenalty || 0) / monthlyRecord.unauthorizedAbsenceDays : 0),
            weekendDays: 0,
            totalLateMinutes: monthlyRecord.totalLateMinutes,
            totalEarlyLeaveMinutes: monthlyRecord.totalEarlyLeaveMinutes,
            onTimeDays: 0,
            totalOvertimeHours: monthlyRecord.totalOvertimeHours
          }
        }
      }
    };
  }

  /**
   * Calculate aggregates for a given user and date (any date inside month) and upsert into monthly_attendances
   * ✨ CẬP NHẬT: Tính toán theo công thức mới của user
   */
  static async calculateAndSaveMonthlyAttendance(userId: number, date: string, userData?: any, token?: string) {
    try {
      console.log(`\n📊 [MonthlyReportService] I AM THE LATEST VERSION - Recalculating User ${userId}, date ${date}`);
      console.log(`🎫 Token provided: ${token ? 'Yes' : 'No'}, userData: ${userData ? 'Yes' : 'No'}`);

      const m = dayjs.tz(date, TZ_VN).format('YYYY-MM');
      const startDate = dayjs.tz(`${m}-01`, TZ_VN).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs.tz(`${m}-01`, TZ_VN).endOf('month').format('YYYY-MM-DD');

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

      // Load holidays using Objection.js HolidayModel
      const holidayRows: any[] = await HolidayModel.query()
        .where(function () {
          this.whereBetween('start_date', [startDate, endDate])
            .orWhereBetween('start_date', [startDate, endDate])
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
          let cur = dayjs.tz(hr.start_date, TZ_VN);
          const end = dayjs.tz(hr.end_date, TZ_VN);
          while (cur.isBefore(end) || cur.isSame(end, 'day')) {
            holidaySet.add(cur.format('YYYY-MM-DD'));
            cur = cur.add(1, 'day');
          }
        }
      }
      console.log(`🎉 [attendance] Found ${holidaySet.size} holiday dates:`, Array.from(holidaySet));

      // 3️⃣ Fetch approved applications (leave/business trip)
      const approvedApplications = await fetchApplicationsDirectly(userId, m);
      console.log(`✅ [attendance] Found ${approvedApplications.length} approved applications`);


      // 4️⃣ Tính tổng số ngày làm việc trong tháng (loại trừ ngày nghỉ theo setting)
      const daysInMonth = dayjs(`${m}-01`).daysInMonth();
      let totalScheduledDays = 0;
      // We also compute scheduled working days up to today (for unauthorized absence calculation)
      const todayStr = dayjs.tz(undefined, TZ_VN).format('YYYY-MM-DD');
      const isCurrentMonth = dayjs.tz(undefined, TZ_VN).format('YYYY-MM') === m;
      let totalScheduledDaysUpToToday = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs.tz(`${m}-${String(d).padStart(2, '0')}`, TZ_VN).format('YYYY-MM-DD');

        // ✨ Chỉ tính những ngày từ startDate trở đi
        if (userStartDate && dayjs.tz(dateKey, TZ_VN).isBefore(dayjs.tz(userStartDate, TZ_VN), 'day')) {
          console.log(`⏭️ [attendance] Skipping ${dateKey} (before startDate ${userStartDate})`);
          continue; // Bỏ qua những ngày trước khi user bắt đầu làm việc
        }

        const dow = dayjs.tz(dateKey, TZ_VN).day(); // 0-6 Sun-Sat
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

          const isLeaveType = app.type === 'leave' || app.type === 'paid_leave' || app.type === 'unpaid_leave' || app.type === 'sick_leave' || app.type?.includes('leave');

          if (isLeaveType) {
            if (data.date) {
              leaveDaysSet.add(dayjs.tz(data.date, TZ_VN).format('YYYY-MM-DD'));
            } else if (data.startDate && data.endDate) {
              let start = dayjs.tz(data.startDate, TZ_VN).startOf('day');
              let end = dayjs.tz(data.endDate, TZ_VN).startOf('day');
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
              businessTripDaysSet.add(dayjs.tz(data.date, TZ_VN).format('YYYY-MM-DD'));
            } else if (data.startDate && data.endDate) {
              let start = dayjs.tz(data.startDate, TZ_VN).startOf('day');
              let end = dayjs.tz(data.endDate, TZ_VN).startOf('day');
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
        dayOffDaysSet.add(dayjs.tz(schedule.date, TZ_VN).format('YYYY-MM-DD'));
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

        // ✨ ƯU TIÊN: Nếu có đơn nghỉ phép hoặc công tác → BỎ QUA dữ liệu chấm công ngày này
        if (isLeave || isTrip) {
          console.log(`ℹ️ [attendance] Ignoring attendance for ${dateKey} due to Approved Leave/Trip`);
          continue;
        }

        // ✨ Cuối tuần / ngày lễ KHÔNG có đơn OT → Không tính công
        // Chỉ hiện giờ check-in/out trên lịch, nhưng không cộng vào tổng công
        if (!rowIsScheduledWorkDay) {
          const hasOtApp = approvedApplications.some(app => {
            if (app.type !== 'overtime') return false;
            const d = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
            const appDate = d.overtimeDate || d.date;
            const normalizedAppDate = appDate ? dayjs(appDate).tz(TZ_VN).format('YYYY-MM-DD') : null;
            return normalizedAppDate === dateKey;
          });
          if (!hasOtApp) {
            console.log(`📅 [attendance] Skipping weekend/holiday ${dateKey} for user ${userId} - no OT app`);
            continue;
          }
        }

        try {
          // Recalculate để có dữ liệu chính xác nhất
          // ✨ Cần lấy shift cho ngày này
          const shift = await import('./attendance/ShiftHelper').then(m => m.getShiftForUserAndDate(userId, dateKey));

          // ✨ Tìm đơn OT đã duyệt cho ngày này để lấy giờ bắt đầu/kết thúc
          const otApp = approvedApplications.find(app => {
            if (app.type !== 'overtime') return false;
            const d = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
            const appDate = d.overtimeDate || d.date;
            const normalizedAppDate = appDate ? parseDBDate(appDate).format('YYYY-MM-DD') : null;
            return normalizedAppDate === dateKey;
          });

          let otStartTime = null;
          let otEndTime = null;
          if (otApp) {
            const d = typeof otApp.data === 'string' ? JSON.parse(otApp.data) : otApp.data;
            if (d.startTime) otStartTime = d.startTime;
            if (d.endTime) {
              otEndTime = d.endTime;
            } else if (d.startTime && (d.overtimeHours || d.totalHours || d.hours || d.duration)) {
              // ✨ Calculate end time if missing but totalHours provided
              const duration = d.overtimeHours || d.totalHours || d.hours || d.duration;
              if (duration) {
                // ✨ Improved: Handle ISO strings vs HH:mm strings
                const startTimeDerive = d.startTime.includes('T')
                  ? parseDBDate(d.startTime)
                  : dayjs.tz(`${dateKey} ${d.startTime}`, TZ_VN);

                const lunchBreakDerive = await AttendanceCalculationService.getSettings().then(s => s.lunchBreak);
                const extendedEnd = AttendanceCalculationService.calculateExtendedEndTime(
                  startTimeDerive,
                  parseFloat(duration),
                  lunchBreakDerive,
                  dateKey
                );
                // Use the derived end time's HH:mm format if the input was HH:mm, or keep ISO?
                // Better to keep it consistent. If start was ISO, end should probably be ISO or we pass it correctly.
                // AttendanceCalculationService internally handles both.
                otEndTime = extendedEnd.format('HH:mm');
              }
            }
          }
          const calc = await AttendanceCalculationService.calculateAttendance(
            r.checkInTime || null,
            r.checkOutTime || null,
            dateKey,
            userId,
            token, // ✨ Pass token for salary/settings info
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
        const isLeaveType = app.type === 'leave' || app.type === 'paid_leave' || app.type === 'unpaid_leave' || app.type === 'sick_leave' || app.type?.includes('leave');
        if (isLeaveType) {
          try {
            const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
            // Chỉ tính nghỉ phép CÓ LƯƠNG
            // Tương tự logic trong AttendanceHelpers.ts
            let isPaid = true;
            if (app.type === 'unpaid_leave' || app.type?.includes('unpaid')) isPaid = false;
            if (data.leaveType === 'unpaid' || data.isPaid === false || data.isPaidLeave === false) isPaid = false;
            if (data.applicationCategory === 'regular') isPaid = false;

            if (isPaid) {
              if (data.date) {
                paidLeaveDaysSet.add(dayjs.tz(data.date, TZ_VN).format('YYYY-MM-DD'));
              } else if (data.startDate && data.endDate) {
                let start = dayjs.tz(data.startDate, TZ_VN).startOf('day');
                let end = dayjs.tz(data.endDate, TZ_VN).startOf('day');
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

      // Days processed with attendance records in the first loop
      const processedRowsSet = new Set(rows.map(r => dayjs.tz(r.date, TZ_VN).format('YYYY-MM-DD')));

      for (const dateKey of allDaysInMonth) {
        // Bỏ qua những ngày trước startDate
        if (userStartDate && dayjs.tz(dateKey, TZ_VN).isBefore(dayjs.tz(userStartDate, TZ_VN), 'day')) {
          continue;
        }

        const isHoliday = holidaySet.has(dateKey);
        const isPaidLeave = paidLeaveDaysSet.has(dateKey);
        const isBusinessTrip = businessTripDaysSet.has(dateKey);
        const isScheduledWork = isScheduledWorkingDay(dateKey);
        // Removed isPast check to allow counting planned công (consistent with real-time calc)

        // 4. Special catch for Holiday/Weekend OT when NO attendance record exists (e.g. today or future)
        if (isHoliday || !isScheduledWork) {
          const rowProcessed = processedRowsSet.has(dateKey);
          if (!rowProcessed) {
            const otApp = approvedApplications.find(app => {
              if (app.type !== 'overtime') return false;
              const d = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
              const appDate = d.overtimeDate || d.startDate || d.date;
              if (!appDate) return false;
              const normalizedOtDate = parseDBDate(appDate).format('YYYY-MM-DD');
              return normalizedOtDate === dateKey;
            });

            if (otApp) {
              console.log(`✨ [attendance] Catching Holiday/Weekend OT without record: ${dateKey}`);
              const d = typeof otApp.data === 'string' ? JSON.parse(otApp.data) : otApp.data;
              const otStart = d.startTime || d.start_time;
              let otEnd = d.endTime || d.end_time;

              if (!otEnd && (d.totalHours || d.overtimeHours || d.hours)) {
                const duration = d.totalHours || d.overtimeHours || d.hours;
                // ✨ Improved: Handle ISO strings vs HH:mm strings
                const startDerive = otStart.includes('T')
                  ? parseDBDate(otStart)
                  : dayjs.tz(`${dateKey} ${otStart}`, TZ_VN);

                const settings = await AttendanceCalculationService.getSettings();
                const extendedEnd = AttendanceCalculationService.calculateExtendedEndTime(startDerive, parseFloat(duration), settings.lunchBreak, dateKey);
                otEnd = extendedEnd.format('HH:mm');
              }

              const calc = await AttendanceCalculationService.calculateAttendance(
                null, null, dateKey, userId, token, otEnd, isHoliday, undefined, otStart
              );
              totalWorkingUnits += parseFloat((calc.totalWorkingUnit || 0).toString());
              totalOtWorkingUnits += parseFloat((calc.otWorkingUnit || 0).toString());
              totalOvertimeHours += parseFloat((calc.overtimeHours || 0).toString());
            }
          }
        }

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
          const settings = await AttendanceCalculationService.getSettings();
          const holidayRate = settings.holidayRate?.rate || 3.0;
          totalWorkingUnits += 1 * holidayRate;
          totalOtWorkingUnits += 1 * holidayRate;
          console.log(`✅ [attendance] ${dateKey}: Công tác ngày lễ → +${holidayRate.toFixed(2)} công (trên nền OT)`);
        }
      }

      // 7️⃣ Lấy kết quả tổng hợp đầy đủ từ AttendanceCalculationService (Nguồn sự thật duy nhất)
      const summary = await AttendanceCalculationService.getUserMonthlyAttendance(userId, m, token, false, approvedApplications);

      if (!summary) throw new Error('Failed to calculate full monthly attendance');

      // ✨ 8️⃣ Tính toán Nghỉ không phép (Unauthorized Absence)
      // Chúng ta cần lấy logic này từ summary.attendanceData
      const enrichedRows = summary.attendanceData || [];

      const presentDaysSet = new Set(rows.filter(r => {
        const dateKey = dayjs.tz(r.date, TZ_VN).format('YYYY-MM-DD');
        return isScheduledWorkingDay(dateKey) && !!(r.checkInTime || r.checkOutTime) && dayjs.tz(dateKey, TZ_VN).isSameOrBefore(todayStr, 'day');
      }).map(r => dayjs(r.date).format('YYYY-MM-DD')));

      const approvedLeaveDaysSetCombined = new Set(
        enrichedRows
          .filter((r: any) => r.hasApprovedLeave && dayjs.tz(r.date, TZ_VN).isSameOrBefore(todayStr, 'day'))
          .map((r: any) => dayjs.tz(r.date, TZ_VN).format('YYYY-MM-DD'))
      );

      const businessTripDaysSetCombined = new Set(
        enrichedRows
          .filter((r: any) => r.hasBusinessTrip && dayjs.tz(r.date, TZ_VN).isSameOrBefore(todayStr, 'day'))
          .map((r: any) => dayjs.tz(r.date, TZ_VN).format('YYYY-MM-DD'))
      );

      const unauthorizedAbsenceDates: string[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = dayjs(`${m}-${String(d).padStart(2, '0')}`).format('YYYY-MM-DD');
        if (userStartDate && dayjs(dateKey).isBefore(userStartDate, 'day')) continue;

        if (isScheduledWorkingDay(dateKey)
          && dayjs(dateKey).isBefore(todayStr, 'day') // Chỉ tính những ngày đã qua
          && !presentDaysSet.has(dateKey)
          && !approvedLeaveDaysSetCombined.has(dateKey)
          && !businessTripDaysSetCombined.has(dateKey)
        ) {
          unauthorizedAbsenceDates.push(dateKey);
        }
      }

      const unauthorizedAbsenceDays = unauthorizedAbsenceDates.length;

      // ✨ Fetch salary for unauthorized absence penalty calculation
      const salaryInfo = await SalaryService.fetchSalary(userId, token, userData);
      const fetchedBaseSalary = salaryInfo?.baseSalary ? parseFloat(salaryInfo.baseSalary.toString()) : 0;
      const dailySalary = totalScheduledDays > 0 ? fetchedBaseSalary / totalScheduledDays : 0;
      const totalUnauthorizedAbsencePenalty = Math.round(dailySalary * unauthorizedAbsenceDays);

      // ✨ 9️⃣ Calculate derived fields from enrichedRows (attendanceData)
      // These are NOT returned by getUserMonthlyAttendance, so we compute them here
      let calcTotalLateMinutes = 0;
      let calcTotalEarlyLeaveMinutes = 0;
      let calcTotalLatePenalty = 0;
      let calcTotalEarlyLeavePenalty = 0;
      let calcBusinessTripDays = 0;

      const dailyRows = summary.attendanceData || [];

      for (const row of dailyRows) {
        if (row.hasBusinessTrip) console.log(`  - Found Business Trip Day: ${row.date}`);

        // ✨ Only sum up PAST days for penalties/totals? 
        // User complained "Total Work" is too high. 
        // If row.date is after today, we should probably exclude it from TOTALS, but keep it in row data.
        // Wait, for Penalties/OT, future days shouldn't typically have values anyway unless pre-filled.
        // But TotalWorkingUnit might be 1.0 for future holidays.

        if (dayjs(row.date).isAfter(todayStr, 'day')) {
          continue;
        }

        calcTotalLateMinutes += parseFloat((row.lateMinutes || 0).toString()) || 0;
        calcTotalEarlyLeaveMinutes += parseFloat((row.earlyDepartureMinutes || 0).toString()) || 0;
        calcTotalLatePenalty += parseFloat((row.lateArrivalPenalty || 0).toString()) || 0;
        calcTotalEarlyLeavePenalty += parseFloat((row.earlyLeavePenalty || 0).toString()) || 0;
        if (row.hasBusinessTrip) calcBusinessTripDays++;
      }

      // ✨ Build Payload - only include columns that exist in monthly_attendances table
      const payload: any = {
        userId,
        month: m,
        totalScheduledDays,
        presentDays: summary.presentDays || 0,
        absentDays: (summary.approvedLeaveDays || 0) + calcBusinessTripDays + unauthorizedAbsenceDays,
        approvedLeaveDays: summary.approvedLeaveDays || 0,
        unauthorizedAbsenceDays: unauthorizedAbsenceDays,
        businessTripDays: calcBusinessTripDays,
        lateDays: summary.totalLateDays || 0,
        earlyLeaveDays: summary.totalEarlyLeaveDays || 0,
        totalLateMinutes: Math.round(calcTotalLateMinutes),
        totalEarlyLeaveMinutes: Math.round(calcTotalEarlyLeaveMinutes),
        totalWorkHours: summary.totalWorkHours || 0,
        averageWorkHours: (summary.presentDays || 0) > 0 ? (summary.totalWorkHours || 0) / summary.presentDays : 0,
        totalWorkingUnits: summary.totalWorkingUnits || 0,
        totalOvertimeHours: summary.totalOvertimeHours || 0,
        totalOtWorkingUnits: summary.totalOtWorkingUnits || 0,
        totalLatePenalty: Math.round(calcTotalLatePenalty),
        totalEarlyLeavePenalty: Math.round(calcTotalEarlyLeavePenalty),
        totalUnauthorizedAbsencePenalty: totalUnauthorizedAbsencePenalty,
        totalPenalty: Math.round(calcTotalLatePenalty + calcTotalEarlyLeavePenalty) + totalUnauthorizedAbsencePenalty,
        dailyDetails: JSON.stringify(summary.attendanceData),
        updated_at: new Date().toISOString()
      };

      const existing = await MonthlySummaryModel.query()
        .where('userId', userId)
        .where('month', m)
        .first();

      if (existing) {
        console.log(`🔍 [attendance] Patching monthly id=${existing.id} with updated_at=${payload.updated_at}, businessTripDays=${payload.businessTripDays}`);
        const patchResult = await MonthlySummaryModel.query().patch(payload).where({ id: existing.id });
        console.log(`✅ [attendance] Updated monthly summary for user ${userId} month ${m}, patchResult=${patchResult}`);
        return { success: true, action: 'updated', data: { ...payload, baseSalary: fetchedBaseSalary }, id: existing.id };
      } else {
        const inserted = await MonthlySummaryModel.query().insert({
          ...payload,
          created_at: new Date().toISOString()
        });
        console.log(`✅ [attendance] Created monthly summary for user ${userId} month ${m}`);
        return { success: true, action: 'inserted', data: { ...inserted, baseSalary: fetchedBaseSalary } };
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

/**
 * Attendance Controller - Clean & Simplified
 * Chỉ chứa API đang được frontend sử dụng: getUserMonthlyFull (lấy dữ liệu chấm công tháng).
 */

import { Request, Response } from 'express';
import { AttendanceService } from '@/services/AttendanceService';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import SalaryService from '@/services/SalaryService';
import { MonthlyReportService } from '@/services/MonthlyReportService';
import { getDecodedToken } from '@/utils/decode-token';
import { getUserData } from '@/utils/getUserData';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import AttendanceCalculationService from '@/services/attendance/AttendanceCalculationService';
import { getShiftForUserAndDate } from '@/services/attendance/ShiftHelper';
import dayjs from 'dayjs';

/**
 * API: Duyệt bảng công tháng
 * POST /api/attendance/approve -> /api/approve
 */
/**
 * Frontend -> Controller -> Service mapping (concise):
 * POST /api/attendance/approve (called by frontend via gateway)
 * -> controller: approveAttendance (this function)
 * -> service: AttendanceService.approveMonthlyAttendance(userId, month, approvedBy, token, extraData)
 *    -> AttendanceApprovalService.approveMonthlyAttendance(...) (handles DB updates, MonthlySummaryModel, TimeAttendanceModel)
 *    -> OvertimeProcessingService.processAllOvertimeForMonth(...) (called inside approval flow)
 *    -> SalaryService / axios calls to auth-service for salary when building payload
 */
// approveAttendance removed — approval flow is not exposed by this service anymore.

/**
 * API: Lấy bảng công chi tiết theo ngày cho xuất Excel (SỬ DỤNG SCOPE)
 * GET /api/attendance/daily-attendance-export
 * Query params: month (YYYY-MM)
 * 
 * LẤY TRỰC TIẾP TỪ BẢNG time_attendances (không dùng dailyDetails)
 * Tự động lấy dữ liệu theo scope của người dùng đăng nhập:
 * - Admin: Tất cả
 * - Manager: Phòng ban của họ
 * - User: Chỉ của họ
 */
export const getDailyAttendanceForExport = async (req: Request, res: Response) => {
  try {
    console.log('\n📊 === GET DAILY ATTENDANCE FOR EXPORT (WITH SCOPE) ===');

    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Tháng là bắt buộc (format: YYYY-MM)'
      });
    }

    // Lấy token để check scope
    let token = req.cookies?.['token'];
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // Check scope của người dùng để lấy danh sách user IDs có quyền xem
    const userData = getUserData(req);
    const CheckScopeService = (await import('../services/CheckScopeService')).default;
    const scopeResult = await CheckScopeService.checkUserScope('users', token, userData);

    if (!scopeResult.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    console.log('🔐 Scope check result:', {
      scope: scopeResult.scope,
      userCount: scopeResult.userIds.length
    });

    // Xác định userIds theo scope
    let userIds: number[] = [];
    if (scopeResult.scope === 'personal' || scopeResult.userIds.length === 0) {
      const decoded = getDecodedToken(token);
      userIds = [Number(decoded?.sub || 0)];
    } else {
      userIds = scopeResult.userIds;
    }

    if (userIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Không có user nào trong scope',
        daysInMonth: 0,
        month: month as string
      });
    }

    // Tính toán ngày đầu và cuối tháng
    const monthStr = month as string;
    const [year, monthNum] = monthStr.split('-');
    const startDate = dayjs(`${year}-${monthNum}-01`).startOf('month');
    const endDate = startDate.endOf('month');
    const daysInMonth = endDate.date();

    const startDateStr = startDate.format('YYYY-MM-DD');
    const endDateStr = endDate.format('YYYY-MM-DD');

    console.log('📅 Date range:', { startDateStr, endDateStr, daysInMonth });

    // Lấy tất cả time_attendances trong tháng cho các users trong scope
    const timeAttendances = await TimeAttendanceModel.query()
      .whereIn('userId', userIds)
      .whereBetween('date', [startDateStr, endDateStr])
      .orderBy('userId', 'asc')
      .orderBy('date', 'asc');

    console.log('⏰ Time attendances count:', timeAttendances.length);

    // Fetch user info đầy đủ (bao gồm department, position)
    const users = await CheckScopeService.getUsersByIds(userIds);
    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    console.log('👥 Users:', users.length, 'Sample:', users[0]);

    // Group attendance records by userId
    const attendancesByUser = new Map<number, any[]>();
    timeAttendances.forEach((att: any) => {
      if (!attendancesByUser.has(att.userId)) {
        attendancesByUser.set(att.userId, []);
      }
      attendancesByUser.get(att.userId)!.push(att);
    });

    // Build result với daily breakdown
    const result = userIds.map((userId, index) => {
      const user = usersMap.get(userId);
      const userAttendances = attendancesByUser.get(userId) || [];

      // Create a map: dayOfMonth -> attendance record
      const dailyMap = new Map<number, any>();
      userAttendances.forEach((att: any) => {
        const dayOfMonth = dayjs(att.date).date();
        dailyMap.set(dayOfMonth, att);
      });

      // Build result object with daily columns
      const row: any = {
        stt: index + 1,
        fullName: user?.fullName || user?.firstName || user?.lastName || `User ${userId}`,
        position: user?.position || user?.jobTitle || user?.chevron?.name || 'Chưa xác định',
        department: user?.department?.name || 'Chưa phân công',
      };

      let totalWorkingDays = 0;

      // Add columns for each day (1-31)
      for (let day = 1; day <= daysInMonth; day++) {
        const att = dailyMap.get(day);

        if (!att) {
          row[`day${day}`] = 0;
          continue;
        }

        // Tính giá trị công dựa trên dailyWorkingUnit (hoặc totalWorkingUnit)
        // dailyWorkingUnit là số công thực tế (0, 0.5, 1, 1.5, 2...)
        const workValue = Number(att.dailyWorkingUnit || att.totalWorkingUnit || 0);
        row[`day${day}`] = workValue;
        totalWorkingDays += workValue;
      }

      row.totalWorkingDays = Math.round(totalWorkingDays * 100) / 100; // Làm tròn 2 chữ số

      return row;
    });

    console.log(`✅ Exported ${result.length} records for month ${monthStr}`);
    console.log('📊 Sample result:', result[0]);

    return res.json({
      success: true,
      data: result,
      daysInMonth,
      month: monthStr
    });

  } catch (error: any) {
    console.error('❌ Error in getDailyAttendanceForExport:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi lấy dữ liệu'
    });
  }
};

// API 3: Lấy thông tin chấm công đầy đủ của 1 user
// ⭐ CẬP NHẬT: Tính toán chính xác theo yêu cầu mới
export const getUserMonthlyFull = async (req: Request, res: Response) => {
  try {
    console.log('\n📊 === GET USER MONTHLY FULL (Compatibility) ===');

    const { userId } = req.params;
    const { year, month } = req.query;

    if (!userId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'userId, year và month là bắt buộc'
      });
    }

    // Lấy token
    const token = req.cookies?.['token'] ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers.authorization?.split(' ')[1];

    // Format month
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // First try to read monthly summary row (monthly_attendances)
    const monthlyRecord = await MonthlySummaryModel.getByUserAndMonth(parseInt(userId), monthStr);

    if (monthlyRecord && (monthlyRecord as any).dailyDetails) {
      // If dailyDetails snapshot exists, return 100% from monthly_attendances per user request
      let dailyDetails: any[] = [];
      try { dailyDetails = JSON.parse((monthlyRecord as any).dailyDetails); } catch (e) { dailyDetails = []; }

      // Build monthlyStats from DB fields following requested formulas (cast to any for DB-only columns)
      const db: any = monthlyRecord as any;
      const totalScheduledDays = Number(db.totalScheduledDays || 0);
      const presentDays = Number(db.presentDays || 0);
      const approvedLeaveDays = Number(db.approvedLeaveDays || 0);
      const businessTripDays = Number(db.businessTripDays || 0);
      const unauthorizedAbsenceDays = Number(db.unauthorizedAbsenceDays ?? Math.max(0, totalScheduledDays - (presentDays + approvedLeaveDays + businessTripDays)));

      const userData = getUserData(req);
      const salary = await SalaryService.fetchSalary(parseInt(userId), token, userData);
      const baseSalary = salary?.baseSalary ? Number(salary.baseSalary) : 0;
      const workingDaysInMonth = Number(db.totalScheduledDays || totalScheduledDays || 0);
      // Calculate penalty per day as daily salary (rounded to integer, no decimals)
      const unauthorizedAbsencePenaltyPerDay = baseSalary && workingDaysInMonth ? Math.round(baseSalary / workingDaysInMonth) : 0;
      const totalUnauthorizedAbsencePenalty = unauthorizedAbsencePenaltyPerDay * unauthorizedAbsenceDays;

      const monthlyStats = {
        totalDays: totalScheduledDays,
        presentDays,
        absentDays: Number(db.absentDays || unauthorizedAbsenceDays),
        lateDays: Number(db.lateDays || 0),
        earlyLeaveDays: Number(db.earlyLeaveDays || 0),
        totalHours: Number(db.totalWorkHours || 0),
        averageHours: Number(db.averageWorkHours || 0),
        overtimeHours: Number(db.totalOvertimeHours || 0),
        totalOvertimeHours: Number(db.totalOvertimeHours || 0),
        totalLatePenalty: Number(db.totalLatePenalty || 0),
        totalEarlyLeavePenalty: Number(db.totalEarlyLeavePenalty || 0),
        totalPenalty: Number(db.totalPenalty || 0),
        totalOvertimePay: Number(db.totalOvertimeSalary || 0),
        totalLateMinutes: Number(db.totalLateMinutes || 0),
        totalEarlyLeaveMinutes: Number(db.totalEarlyLeaveMinutes || 0),
        unauthorizedAbsenceDays,
        totalUnauthorizedAbsencePenalty,
        approvedLeaveDays,
        businessTripDays,
        totalWorkingUnits: Number(db.totalWorkingUnits || 0),
        totalOtWorkingUnits: Number(db.totalOtWorkingUnits || 0)
      };

      return res.status(200).json({ success: true, data: { monthlyStats, dailyData: { userId: parseInt(userId), month: Number(monthStr.split('-')[1]), year: Number(monthStr.split('-')[0]), dailyDetails, monthlySalary: Number(db.baseSalary || 0), penaltyRate: 0, summary: {} } } });
    }

    // Fallback: delegate to existing service to compute on the fly
    const userData = getUserData(req);
    const payload = await AttendanceService.getUserMonthlyFull(parseInt(userId), monthStr, token, userData);

    if (!payload) return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu chấm công' });
    return res.status(200).json(payload);

  } catch (error: any) {
    console.error('❌ Error in getUserMonthlyFull:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chấm công',
      error: error.message
    });
  }
};

/**
 * API: Chấm công tự động
 * POST /api/attendance/record -> /api/record
 */
// recordAttendance removed — real-time recording endpoint is not part of this trimmed API.
export const recordAttendance = async (req: Request, res: Response) => {
  try {
    const { userId, time } = req.body;

    if (!userId || !time) {
      res.status(400).json({
        success: false,
        message: 'userId và time là bắt buộc'
      });
      return;
    }

    // ✨ Lấy token từ request để truyền xuống service (quan trọng để lấy salary info)
    const token = req.cookies?.['token'] ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers.authorization?.split(' ')[1];

    console.log('🎫 Token for attendance record:', token ? 'Found' : 'Not found');

    const userData = getUserData(req);
    const result = await AttendanceService.recordAttendance(userId, time, token, userData);

    res.json({
      success: true,
      message: result.type === 'check_in' ? 'Chấm công vào thành công' : 'Chấm công ra thành công',
      data: result
    });
  } catch (error: any) {
    console.error('Error in /attendance/record:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi chấm công'
    });
  }
};

export const getAllMonthlyAttendance = async (req: Request, res: Response) => {
  try {
    const { page = 0, pageSize = 10, sortField = 'id', sortOrder = 'desc' } = req.query;
    const result = await MonthlyReportService.getMonthlyAttendanceForAllUsers(
      Number(page),
      Number(pageSize),
      String(sortField),
      String(sortOrder) as 'asc' | 'desc'
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in /attendance/monthly-attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi lấy danh sách chấm công tháng'
    });
  }
};

/**
 * GET /api/attendance/monthly-attendance/by-month?month=YYYY-MM&isApproved=true&page=0&pageSize=100
 * Return monthly_attendances filtered by month and approval flag (fast direct DB query).
 */
export const getMonthlyAttendanceByMonth = async (req: Request, res: Response) => {
  try {
    const month = String((req.query as any)['month'] || req.body?.['month'] || '').trim();
    const isApprovedRaw = (req.query as any)['isApproved'] ?? req.body?.['isApproved'];
    const page = Number((req.query as any)['page'] ?? req.body?.['page'] ?? 0);
    const pageSize = Number((req.query as any)['pageSize'] ?? req.body?.['pageSize'] ?? 1000);

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month is required in YYYY-MM format' });
    }

    const q = MonthlySummaryModel.query().where('month', String(month));
    if (typeof isApprovedRaw !== 'undefined') {
      const approved = (String(isApprovedRaw) === 'true' || String(isApprovedRaw) === '1' || isApprovedRaw === true || isApprovedRaw === 1);
      q.andWhere('isApproved', approved);
    }

    // Use simple pagination
    const pageIndex = Math.max(0, page);
    const p = await q.orderBy('id', 'asc').page(pageIndex, pageSize);
    return res.status(200).json({ success: true, data: { results: p.results, total: p.total } });
  } catch (error: any) {
    console.error('❌ Error in getMonthlyAttendanceByMonth:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal error' });
  }
};

/**
 * API: Lấy TẤT CẢ dữ liệu bảng duyệt theo scope cho xuất Excel
 * GET /api/attendance/monthly-summaries-export
 * Query params: month (optional YYYY-MM), và các filters khác
 * 
 * Tự động lấy tất cả dữ liệu theo scope của người dùng (không có phân trang):
 * - Admin: Tất cả
 * - Manager: Phòng ban của họ  
 * - User: Chỉ của họ
 */
export const getMonthlySummariesForExport = async (req: Request, res: Response) => {
  try {
    console.log('\n📊 === GET MONTHLY SUMMARIES FOR EXPORT (WITH SCOPE) ===');

    // Lấy token để check scope
    let token = req.cookies?.['token'];
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // Check scope của người dùng
    const userData = getUserData(req);
    const CheckScopeService = (await import('../services/CheckScopeService')).default;
    const scopeResult = await CheckScopeService.checkUserScope('users', token, userData);

    if (!scopeResult.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    console.log('🔐 Scope check result:', {
      scope: scopeResult.scope,
      userCount: scopeResult.userIds.length
    });

    // Build query với filters từ params (nếu có)
    let query = MonthlySummaryModel.query();

    // Filter theo tháng nếu có
    const { month, ...otherFilters } = req.query;
    if (month) {
      query = query.where('month', month as string);
    }

    // Áp dụng scope filtering
    if (scopeResult.scope === 'personal' || scopeResult.userIds.length === 0) {
      const decoded = getDecodedToken(token);
      query = query.where('userId', Number(decoded?.sub || 0));
    } else if (scopeResult.userIds.length > 0) {
      query = query.whereIn('userId', scopeResult.userIds);
    }

    // Apply các filters khác nếu có
    const queryBuilder = await import('@/utils/query-builder');
    query = queryBuilder.applyFilters(query, otherFilters);

    // Lấy TẤT CẢ dữ liệu (không phân trang)
    const results = await query.orderBy('month', 'desc').orderBy('userId', 'asc');

    // Fetch user info
    const userIds = [...new Set(results.map((r: any) => r.userId))];
    const users = await CheckScopeService.getUsersByIds(userIds);
    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    // Format results với user data
    const formattedResults = results.map((record: any) => {
      const user = usersMap.get(record.userId);
      return {
        ...record,
        user: user ? {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department
        } : null
      };
    });

    console.log(`✅ Exported ${formattedResults.length} records`);

    return res.json({
      success: true,
      data: formattedResults,
      total: formattedResults.length
    });

  } catch (error: any) {
    console.error('❌ Error in getMonthlySummariesForExport:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi lấy dữ liệu'
    });
  }
};

/**
 * Get monthly summaries according to permission scope returned by auth-service
 * Supports server-side filtering, sorting, and searching
 * GET /api/attendance/monthly-summaries-by-scope?page=1&pageSize=20&sort=month&order=desc&fullName=John
 * 
 * Note: permissionKey is determined by the route/endpoint, not passed by frontend
 * This endpoint is for attendance approval management, so uses 'users' permission
 */
export const getMonthlySummariesByScopeController = async (req: Request, res: Response) => {
  try {
    // For attendance approval screen, we check 'timeAttendance' permission
    const permissionKey = 'timeAttendance';

    // Frontend sends 1-based page from ServerSideTable via 'page' param
    const pageFromFrontend = Number(req.query['page'] ?? req.body?.page ?? 1);
    const page = Math.max(0, pageFromFrontend - 1); // Convert to 0-based

    // Accept both 'pageSize' and 'limit'
    const pageSize = Number(req.query['pageSize'] ?? req.query['limit'] ?? req.body?.pageSize ?? req.body?.limit ?? 20);

    // Get all query params and pass to service
    const params: any = {
      page,
      pageSize
    };

    // Pass through all filter/sort params
    Object.keys(req.query).forEach(key => {
      if (key !== 'page' && key !== 'pageSize' && key !== 'limit') {
        params[key] = req.query[key];
      }
    });

    const result = await AttendanceService.getMonthlySummariesByScope(permissionKey, req, params);

    // Convert page back to 1-based for frontend
    return res.status(200).json({
      success: true,
      results: result.results || [],
      total: result.total || 0,
      page: result.page + 1,
      pageSize: result.pageSize
    });
  } catch (error: any) {
    console.error('Error in getMonthlySummariesByScopeController:', error);
    if (error?.status === 401) {
      return res.status(401).json({ success: false, message: error.message || 'Unauthorized' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const approveMonthlyAttendance = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    const token = req.cookies?.['token'] || req.headers.authorization?.replace('Bearer ', '') || req.headers.authorization?.split(' ')[1];
    let approverId: number | undefined;
    try {
      const decoded = getDecodedToken(token || '');
      approverId = decoded ? Number((decoded as any).sub) : undefined;
    } catch (e) {
      approverId = undefined;
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có ID nào được cung cấp' });
    }

    const result = await AttendanceService.bulkApproveByRecordIds(ids, approverId);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ Error in approveMonthlyAttendance:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi khi duyệt chấm công tháng' });
  }
};

/**
 * Approve all monthly attendances for a specific month (with scope check)
 * POST /api/attendance/approve-month
 * Body: { month: 'YYYY-MM' }
 */
export const approveAllByMonth = async (req: Request, res: Response) => {
  try {
    const { month } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Tháng không hợp lệ. Định dạng: YYYY-MM'
      });
    }

    const token = req.cookies?.['token'] || req.headers.authorization?.replace('Bearer ', '') || req.headers.authorization?.split(' ')[1];

    let approverId: number | undefined;
    try {
      const decoded = getDecodedToken(token || '');
      approverId = decoded ? Number((decoded as any).sub) : undefined;
    } catch (e) {
      approverId = undefined;
    }

    console.log('[AttendanceController] approveAllByMonth called for month:', month);

    const result = await AttendanceService.approveAllByMonth(month, token || '', approverId);

    return res.status(200).json({
      success: true,
      data: result,
      message: `Đã duyệt ${result.approved} bảng chấm công cho tháng ${month}`
    });
  } catch (error: any) {
    console.error('❌ Error in approveAllByMonth:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi duyệt tất cả bảng chấm công theo tháng'
    });
  }
};

// POST /api/admin/calculate-monthly/:userId?year=YYYY&month=MM
export const calculateAndSaveMonthly = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;
    if (!userId || !year || !month) return res.status(400).json({ success: false, message: 'userId, year and month are required' });
    const dateStr = `${String(year)}-${String(month).padStart(2, '0')}-01`;
    const userData = getUserData(req);
    await MonthlyReportService.calculateAndSaveMonthlyAttendance(Number(userId), dateStr, userData);
    return res.status(200).json({ success: true, message: 'Monthly attendance calculated and saved' });
  } catch (error: any) {
    console.error('Error in calculateAndSaveMonthly:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal error' });
  }
};

/**
 * Bulk calculate monthly attendance for multiple users
 * POST /api/admin/bulk-calculate-monthly
 * Body: { userIds: number[], year: number, month: number }
 */
export const bulkCalculateMonthly = async (req: Request, res: Response) => {
  try {
    const { userIds, year, month } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds (array) is required'
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year and month are required'
      });
    }

    const dateStr = `${String(year)}-${String(month).padStart(2, '0')}-01`;

    console.log(`\n📊 === BULK CALCULATE MONTHLY ATTENDANCE ===`);
    console.log(`   📅 Month: ${year}-${String(month).padStart(2, '0')}`);
    console.log(`   👥 Total users: ${userIds.length}`);
    console.log(`   🔢 User IDs: ${userIds.slice(0, 10).join(', ')}${userIds.length > 10 ? '...' : ''}`);

    const results = {
      total: userIds.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    const userData = getUserData(req);

    // Process each user sequentially to avoid overwhelming the database
    for (let i = 0; i < userIds.length; i++) {
      const userId = Number(userIds[i]);

      try {
        console.log(`\n   [${i + 1}/${userIds.length}] Processing user ${userId}...`);

        const result = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, dateStr, userData);

        if (result && result.success !== false) {
          results.success++;
          console.log(`   ✅ User ${userId} - Success`);
        } else {
          results.failed++;
          results.errors.push({ userId, error: result?.error || 'Unknown error' });
          console.log(`   ❌ User ${userId} - Failed: ${result?.error || 'Unknown'}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({ userId, error: error.message || 'Unknown error' });
        console.error(`   ❌ User ${userId} - Exception: ${error.message}`);
      }

      // Add small delay to avoid overwhelming the system
      if (i < userIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n📊 === BULK CALCULATE SUMMARY ===`);
    console.log(`   ✅ Success: ${results.success}/${results.total}`);
    console.log(`   ❌ Failed: ${results.failed}/${results.total}`);

    if (results.errors.length > 0) {
      console.log(`   ⚠️  Errors:`, results.errors.slice(0, 5));
    }

    return res.status(200).json({
      success: true,
      message: `Bulk calculate completed: ${results.success} success, ${results.failed} failed`,
      data: results
    });
  } catch (error: any) {
    console.error('❌ Error in bulkCalculateMonthly:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal error'
    });
  }
};

/**
 * API: Cập nhật chấm công từ đơn quên check in/out
 * POST /api/attendance/update-forgot-check
 * Body: { userId, forgotDate, forgotTime, forgotType }
 *
 * Flow:
 * 1. Cập nhật checkInTime hoặc checkOutTime trong time_attendances
 * 2. Tính toán lại các chỉ số công cho ngày đó (giống recordAttendance)
 * 3. Tính toán lại thông tin chấm công tháng (monthly_attendances)
 */
export const updateForgotCheck = async (req: Request, res: Response) => {
  try {
    const { userId, forgotDate, forgotTime, forgotType } = req.body;

    console.log('📝 [updateForgotCheck] Received request:', { userId, forgotDate, forgotTime, forgotType });

    if (!userId || !forgotDate || !forgotTime || !forgotType) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: userId, forgotDate, forgotTime, forgotType'
      });
    }

    // Validate forgotType
    if (!['check-in', 'check-out'].includes(forgotType)) {
      return res.status(400).json({
        success: false,
        message: 'forgotType phải là "check-in" hoặc "check-out"'
      });
    }

    // Lấy token từ request để tính toán
    const token = req.cookies?.['token'] ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers.authorization?.split(' ')[1];

    // Kết hợp forgotDate và forgotTime thành timestamp đầy đủ
    // forgotDate: "2025-11-29", forgotTime: "09:00" -> "2025-11-29T09:00:00"
    const fullTimestamp = `${forgotDate}T${forgotTime}:00`;
    console.log('📝 [updateForgotCheck] Full timestamp:', fullTimestamp);

    // Tìm bản ghi chấm công theo userId và date
    let attendanceRecord = await TimeAttendanceModel.query()
      .where('userId', userId)
      .where('date', forgotDate)
      .first();

    let record: any;

    if (attendanceRecord) {
      // Cập nhật bản ghi hiện có
      console.log(`📝 [updateForgotCheck] Updating existing record for user ${userId} on ${forgotDate}`);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (forgotType === 'check-in') {
        updateData.checkInTime = fullTimestamp;
      } else {
        updateData.checkOutTime = fullTimestamp;
      }

      record = await TimeAttendanceModel.query()
        .patchAndFetchById(attendanceRecord.id, updateData);
    } else {
      // Tạo bản ghi mới nếu chưa tồn tại
      console.log(`📝 [updateForgotCheck] Creating new record for user ${userId} on ${forgotDate}`);

      const newRecordData: any = {
        userId,
        date: forgotDate,
        checkInTime: forgotType === 'check-in' ? fullTimestamp : null,
        checkOutTime: forgotType === 'check-out' ? fullTimestamp : null,
        dailyTotalWorkHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        dailyWorkingUnit: 0,
        totalWorkingUnit: 0,
        otWorkingUnit: 0,
        earlyLeavePenalty: 0,
        lateArrivalPenalty: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      record = await TimeAttendanceModel.query().insertAndFetch(newRecordData);
    }

    // ============================================
    // ✨ TÍNH TOÁN LẠI CÔNG CHO NGÀY
    // ============================================
    console.log(`🔄 [updateForgotCheck] Recalculating attendance for user ${userId} on ${forgotDate}...`);

    // Lấy shift cho user vào ngày này
    const shift = await getShiftForUserAndDate(userId, forgotDate);
    console.log(`📋 [updateForgotCheck] Shift cho user ${userId} ngày ${forgotDate}:`, shift);

    // Lấy thông tin OT đã duyệt
    const overtimeApp = await AttendanceCalculationService.getApprovedOvertimeApplication(userId, forgotDate);
    let otEndTime: string | undefined;
    if (overtimeApp) {
      const appData = typeof overtimeApp.data === 'string' ? JSON.parse(overtimeApp.data) : overtimeApp.data;
      if (appData.endTime) {
        otEndTime = dayjs(`${forgotDate} ${appData.endTime}`).toISOString();
      }
    }

    // Tính toán lại công cho ngày
    const calculation = await AttendanceCalculationService.calculateAttendance(
      record.checkInTime,
      record.checkOutTime,
      forgotDate,
      userId,
      token,
      otEndTime,
      undefined, // isHoliday - sẽ được tính trong calculateAttendance
      shift // Truyền shift info
    );

    console.log(`📊 [updateForgotCheck] Calculation result:`, calculation);

    // Cập nhật record với thông tin công mới
    const updatedRecord = await TimeAttendanceModel.query().patchAndFetchById(record.id, {
      dailyTotalWorkHours: calculation.workHours || 0,
      dailyWorkingUnit: calculation.dailyWorkingUnit || 0,
      totalWorkingUnit: calculation.totalWorkingUnit || 0,
      otWorkingUnit: calculation.otWorkingUnit || 0,
      lateMinutes: calculation.lateMinutes || 0,
      earlyDepartureMinutes: calculation.earlyDepartureMinutes || 0,
      lateArrivalPenalty: calculation.latePenaltyAmount || 0,
      earlyLeavePenalty: calculation.earlyLeavePenaltyAmount || 0,
      updated_at: new Date().toISOString()
    });

    console.log(`✅ [updateForgotCheck] Updated daily attendance record:`, updatedRecord);

    // ============================================
    // ✨ TÍNH TOÁN LẠI CÔNG CHO THÁNG
    // ============================================
    const userData = getUserData(req);
    try {
      console.log(`🔄 [updateForgotCheck] Triggering monthly calculation...`);
      const monthlyResult = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, forgotDate, userData);
      console.log(`✅ [updateForgotCheck] Monthly calculation result:`, monthlyResult);
    } catch (monthlyErr: any) {
      console.error(`❌ [updateForgotCheck] Failed to update monthly summary:`, monthlyErr);
      // Không throw error, vì việc cập nhật ngày đã thành công
    }

    console.log(`✅ [updateForgotCheck] Successfully updated attendance for user ${userId} on ${forgotDate}`);

    return res.json({
      success: true,
      message: `Đã cập nhật ${forgotType === 'check-in' ? 'giờ check-in' : 'giờ check-out'} và tính toán lại công thành công`,
      data: {
        userId,
        date: forgotDate,
        [forgotType === 'check-in' ? 'checkInTime' : 'checkOutTime']: fullTimestamp,
        calculation: {
          workHours: calculation.workHours,
          dailyWorkingUnit: calculation.dailyWorkingUnit,
          totalWorkingUnit: calculation.totalWorkingUnit,
          otWorkingUnit: calculation.otWorkingUnit,
          lateMinutes: calculation.lateMinutes,
          earlyDepartureMinutes: calculation.earlyDepartureMinutes
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [updateForgotCheck] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chấm công',
      error: error.message
    });
  }
};

/**
 * API: Lấy danh sách time_attendances (bảng công chi tiết từng ngày)
 * GET /api/attendance/time-attendances
 * Supports filtering, sorting, pagination
 */
export const getTimeAttendancesController = async (req: Request, res: Response) => {
  try {
    // Frontend sends 1-based page
    const pageFromFrontend = Number(req.query['page'] ?? req.body?.page ?? 1);
    const page = Math.max(1, pageFromFrontend);

    // Accept both 'pageSize' and 'limit'
    const pageSize = Number(req.query['pageSize'] ?? req.query['limit'] ?? req.body?.pageSize ?? req.body?.limit ?? 20);

    // Build query - không dùng eager loading để tránh lỗi relation
    // Sẽ fetch user data từ auth-service nếu cần
    let query = TimeAttendanceModel.query()
      .orderBy('time_attendances.date', 'DESC');

    // Apply filters
    // Date filter
    if (req.query['date']) {
      query = query.where('date', String(req.query['date']));
    }
    if (req.query['month']) {
      const monthStr = String(req.query['month']);
      query = query.whereRaw(`DATE_FORMAT(time_attendances.date, '%Y-%m') = ?`, [monthStr]);
    }

    // Status filter
    if (req.query['status']) {
      query = query.where('status', String(req.query['status']));
    }

    // UserId filter (for specific user)
    if (req.query['userId']) {
      query = query.where('time_attendances.userId', Number(req.query['userId']));
    }

    // Sorting
    const sortField = req.query['sortField'] as string || 'date';
    const sortOrder = (req.query['sortOrder'] as string || 'desc').toLowerCase();

    if (sortField && ['date', 'userId', 'status'].includes(sortField)) {
      query = query.clearOrder().orderBy(`time_attendances.${sortField}`, sortOrder as 'asc' | 'desc');
    }

    // Count total
    const countQuery = query.clone().clearOrder();
    const totalResult = await countQuery.count('time_attendances.id as count').first();
    const total = Number((totalResult as any)?.count || 0);

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.limit(pageSize).offset(offset);

    // Execute query
    const results = await query;

    // Format response với các field cần thiết
    const formattedResults = results.map((record: any) => ({
      id: record.id,
      userId: record.userId,
      date: record.date,
      check_in_time: record.checkInTime,
      check_out_time: record.checkOutTime,
      work_hours: record.dailyTotalWorkHours || 0,
      working_units: record.dailyWorkingUnit || 0,
      overtime_hours: record.otWorkingUnit || 0,
      overtime_salary: 0, // TODO: Calculate if needed
      late_minutes: record.lateMinutes || 0,
      early_leave_minutes: record.earlyDepartureMinutes || 0,
      late_penalty: record.lateArrivalPenalty || 0,
      early_penalty: record.earlyLeavePenalty || 0,
      status: 'present', // Default status
      notes: '',
      // Placeholder for user data - frontend sẽ cần fetch riêng hoặc cache
      user: {
        id: record.userId,
        username: `user_${record.userId}`,
        fullName: `User ${record.userId}`,
      },
      shift: null,
    }));

    return res.status(200).json({
      success: true,
      results: formattedResults,
      data: formattedResults, // Alias for compatibility
      total,
      page,
      pageSize
    });
  } catch (error: any) {
    console.error('Error in getTimeAttendancesController:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
};

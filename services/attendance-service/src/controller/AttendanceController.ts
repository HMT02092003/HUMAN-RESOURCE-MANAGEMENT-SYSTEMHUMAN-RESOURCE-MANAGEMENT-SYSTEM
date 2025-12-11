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
      const unauthorizedAbsenceDays = Number(db.unauthorizedAbsenceDays ?? Math.max(0, totalScheduledDays - (presentDays + approvedLeaveDays + businessTripDays)) );

      const salary = await SalaryService.fetchSalary(parseInt(userId), token);
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
    const payload = await AttendanceService.getUserMonthlyFull(parseInt(userId), monthStr, token);

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

    const result = await AttendanceService.recordAttendance(userId, time, token);

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
 * Get monthly summaries according to permission scope returned by auth-service
 * Supports server-side filtering, sorting, and searching
 * GET /api/attendance/monthly-summaries-by-scope?page=1&pageSize=20&sort=month&order=desc&fullName=John
 * 
 * Note: permissionKey is determined by the route/endpoint, not passed by frontend
 * This endpoint is for attendance approval management, so uses 'users' permission
 */
export const getMonthlySummariesByScopeController = async (req: Request, res: Response) => {
  try {
    // Permission key is determined by the route context, not from frontend
    // For attendance approval screen, we check 'users' permission
    const permissionKey = 'users';
    
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

    const token = req.cookies?.['token'] || req.headers.authorization?.replace('Bearer ', '') ||  req.headers.authorization?.split(' ')[1];
    let approverId: number | undefined;
    try {
      const decoded = getDecodedToken(token || '');
      approverId = decoded ? Number((decoded as any).sub) : undefined;
    } catch (e) {
      approverId = undefined;
    }

    if(!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có ID nào được cung cấp' });
    }

    const result = await AttendanceService.bulkApproveByRecordIds(ids, approverId);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ Error in approveMonthlyAttendance:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi khi duyệt chấm công tháng' });
  }
};

// POST /api/admin/calculate-monthly/:userId?year=YYYY&month=MM
export const calculateAndSaveMonthly = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;
    if (!userId || !year || !month) return res.status(400).json({ success: false, message: 'userId, year and month are required' });
    const dateStr = `${String(year)}-${String(month).padStart(2,'0')}-01`;
    await MonthlyReportService.calculateAndSaveMonthlyAttendance(Number(userId), dateStr);
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

    // Process each user sequentially to avoid overwhelming the database
    for (let i = 0; i < userIds.length; i++) {
      const userId = Number(userIds[i]);
      
      try {
        console.log(`\n   [${i + 1}/${userIds.length}] Processing user ${userId}...`);
        
        const result = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, dateStr);
        
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
    try {
      console.log(`🔄 [updateForgotCheck] Triggering monthly calculation...`);
      const monthlyResult = await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, forgotDate);
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

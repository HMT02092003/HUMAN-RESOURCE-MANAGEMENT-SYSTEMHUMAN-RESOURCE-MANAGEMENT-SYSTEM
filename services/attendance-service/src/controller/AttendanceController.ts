/**
 * Attendance Controller - Clean & Simplified
 * Chỉ chứa API đang được frontend sử dụng: getUserMonthlyFull (lấy dữ liệu chấm công tháng).
 */

import { Request, Response } from 'express';
import { AttendanceService } from '@/services/AttendanceService';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import SalaryService from '@/services/SalaryService';
import { MonthlyReportService } from '@/services/MonthlyReportService';

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

    const result = await AttendanceService.recordAttendance(userId, time);

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

export const approveMonthlyAttendance = async (req: Request, res: Response) => {
  // try {
  //   const { userId, month, approvedBy, extraData } = req.body;
  //   if (!userId || !month || !approvedBy) {
  //     return res.status(400).json({
  //       success: false,
  //       message: 'userId, month và approvedBy là bắt buộc'
  //     });
  //   }
  //   const token = req.cookies?.['token'] ||
  //     req.headers.authorization?.replace('Bearer ', '') ||
  //     req.headers.authorization?.split(' ')[1];
  //   const result = await AttendanceService.approveMonthlyAttendance(userId, month, approvedBy, token, extraData);
  //   return res.status(200).json({
  //     success: true,
  //     message: 'Duyệt chấm công tháng thành công',
  //     data: result
  //   });
  // } catch (error: any) {
  //   console.error('❌ Error in approveMonthlyAttendance:', error);
  //   return res.status(500).json({
  //     success: false,
  //     message: error.message || 'Lỗi khi duyệt chấm công tháng'
  //   });
  // } 
};

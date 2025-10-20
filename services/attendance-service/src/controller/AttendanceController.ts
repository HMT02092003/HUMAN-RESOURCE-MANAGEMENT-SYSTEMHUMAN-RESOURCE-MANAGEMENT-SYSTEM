/**
 * Attendance Controller - Clean & Simplified
 * Chỉ chứa API đang được frontend sử dụng: getUserMonthlyFull (lấy dữ liệu chấm công tháng).
 */

import { Request, Response } from 'express';
import { AttendanceService } from '@/services/AttendanceService';

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

    // Delegate to service which returns the ready-to-send monthly-full payload
  // Frontend -> Controller -> Service mapping (concise):
  // GET /api/attendance/user/:userId/monthly-full?year=YYYY&month=MM
  // -> controller: getUserMonthlyFull (this function)
  // -> service: AttendanceService.getUserMonthlyFull(userId, monthStr, token)
  //    -> MonthlyReportService.buildMonthlyFull(...) (builds monthlyStats + dailyData)
  //       -> AttendanceQueryService.getUserMonthlyAttendance(...) (reads TimeAttendanceModel, MonthlySummaryModel)
  //       -> SettingsService, SalaryService, OvertimeProcessingService used inside building
    const payload = await AttendanceService.getUserMonthlyFull(parseInt(userId), monthStr, token);

    if (!payload) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu chấm công' });
    }

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

/**
 * Attendance Controller - Simplified Version
 * Chỉ chứa 2 API endpoints chính:
 * 1. getAllAttendance - Lấy toàn bộ thông tin chấm công theo tháng
 * 2. approveAttendance - Duyệt bảng công tháng
 * 
 * + Thêm các compatibility routes cho frontend cũ
 * 
 * Tất cả business logic được xử lý trong AttendanceService
 */

import { Request, Response } from 'express';
import { validate } from '@/utils/validation-utility';
import { getDecodedToken } from '@/utils/decode-token';
import { AttendanceService } from '@/services/AttendanceService';

/**
 * API 1: Lấy toàn bộ thông tin chấm công theo tháng
 * GET /api/attendance?month=YYYY-MM&departmentId=1
 * 
 * Query params:
 * - month: YYYY-MM (required)
 * - departmentId: number (required)
 * 
 * Response: Danh sách attendance summary của tất cả users trong phòng ban
 */
export const getAllAttendance = async (req: Request, res: Response) => {
  try {
    console.log('\n📊 === GET ALL ATTENDANCE API ===');
    console.log('Query params:', req.query);

    // Lấy token từ request
    const token = req.cookies?.['token'] || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không được cung cấp'
      });
    }

    // Validate token
    const decodedToken = getDecodedToken(token);
    if (!decodedToken || !decodedToken.sub) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // Validate input
    const { month, departmentId } = req.query;

    if (!month || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Tháng và phòng ban là bắt buộc (month, departmentId)'
      });
    }

    // Validate format
    const inputs = {
      month: month as string,
      departmentId: parseInt(departmentId as string)
    };

    const allowFields = {
      month: 'string!',
      departmentId: 'number!'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log('✅ Validated params:', params);

    // Gọi service để lấy dữ liệu
    const attendanceSummaries = await AttendanceService.getAttendanceForApproval(
      params['departmentId'],
      params['month'],
      token
    );

    console.log(`✅ Retrieved ${attendanceSummaries.length} attendance records`);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách chấm công thành công',
      data: attendanceSummaries,
      meta: {
        month: params['month'],
        departmentId: params['departmentId'],
        totalRecords: attendanceSummaries.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error in getAllAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách chấm công',
      error: error.message
    });
  }
};

/**
 * API 2: Duyệt bảng công tháng
 * POST /api/attendance/approve
 * 
 * Body:
 * {
 *   "userId": number,
 *   "month": "YYYY-MM"
 * }
 * 
 * - Xử lý overtime applications nếu có
 * - Tạo bản ghi approved_attendances
 * - Cập nhật các thông tin tăng ca vào time_attendances
 * 
 * Response: Thông tin duyệt và summary
 */
export const approveAttendance = async (req: Request, res: Response) => {
  try {
    console.log('\n🔥 === APPROVE ATTENDANCE API ===');
    console.log('Request body:', req.body);

    // Lấy token
    const token = req.cookies?.['token'] || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không được cung cấp'
      });
    }

    // Validate token và lấy approver info
    const decodedToken = getDecodedToken(token);
    if (!decodedToken || !decodedToken.sub) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    const approvedBy = parseInt(decodedToken.sub);

    // Validate input
    const inputs = req.body;
    const allowFields = {
      userId: 'number!',
      month: 'string!'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log('✅ Validated params:', params);
    console.log('👤 Approved by:', approvedBy);

    // Gọi service để duyệt
    const result = await AttendanceService.approveMonthlyAttendance(
      params['userId'],
      params['month'],
      approvedBy,
      token
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    console.log('✅ Attendance approved successfully');

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('❌ Error in approveAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi duyệt bảng công',
      error: error.message
    });
  }
};

/**
 * ========================================
 * BACKWARD COMPATIBILITY ROUTES
 * ========================================
 * Các routes này để tương thích với frontend cũ
 * Redirect hoặc wrap sang API mới
 */

/**
 * GET /api/user/:userId/monthly-full
 * Compatibility route - Lấy thông tin chấm công đầy đủ của 1 user
 */
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

    // Gọi service
    const summary = await AttendanceService.getUserMonthlyAttendance(
      parseInt(userId),
      monthStr,
      token
    );

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dữ liệu chấm công'
      });
    }

    // ⭐ Format response theo format mà frontend mong đợi
    const response = {
      success: true,
      data: {
        monthlyStats: {
          totalDays: summary.totalWorkDays,
          presentDays: summary.totalWorkDays,
          absentDays: 0, // TODO: Tính từ attendanceData
          lateDays: summary.totalLateDays,  // ⭐ Đã có
          earlyLeaveDays: summary.totalEarlyLeaveDays,  // ⭐ Đã có
          totalHours: summary.totalWorkHours,
          averageHours: summary.totalWorkDays > 0 ? summary.totalWorkHours / summary.totalWorkDays : 0,
          overtimeHours: summary.totalOvertimeHours,
          totalLatePenalty: summary.totalPenalty,
          totalEarlyLeavePenalty: 0, // Có thể tính riêng nếu cần
          totalPenalty: summary.totalPenalty,
          totalOvertimePay: summary.totalOvertimeSalary
        },
        dailyData: {
          userId: summary.userId,
          year: parseInt(year as string),
          month: parseInt(month as string),
          monthlySalary: 0, // TODO: Lấy từ user service nếu cần
          penaltyRate: 0,
          dailyDetails: summary.attendanceData.map((record: any) => {
            // ⭐ Format theo DailyAttendanceDetail
            const checkInTime = record.checkInTime ? new Date(record.checkInTime) : null;
            const isLate = record.lateMinutes > 0;
            const isEarlyLeave = record.earlyDepartureMinutes > 0;
            
            // ⭐ Xác định status - CHECK LEAVE/BUSINESS TRIP TRƯỚC
            let status: string = 'working';
            let statusText = 'Đã chấm công';
            let isOnTime = false;
            
            // Priority 1: Check business trip (có thể không có checkIn)
            if (record.hasBusinessTrip || record.type === 'business_trip') {
              status = 'business_trip';
              statusText = 'Công tác';
            }
            // Priority 2: Check approved leave (có thể không có checkIn)
            else if (record.hasApprovedLeave || record.type === 'leave' || record.type === 'sick-leave') {
              status = 'approved_leave';
              statusText = record.leaveInfo || record.leaveTypeName || 'Nghỉ phép';
            }
            // Priority 3: Check attendance status
            else if (!record.checkInTime) {
              status = 'absent';
              statusText = 'Vắng mặt';
            } else if (!isLate && !isEarlyLeave) {
              isOnTime = true;
              statusText = 'Đúng giờ';
            } else if (isLate && isEarlyLeave) {
              statusText = 'Đi muộn & về sớm';
            } else if (isLate) {
              statusText = 'Đi muộn';
            } else if (isEarlyLeave) {
              statusText = 'Về sớm';
            }

            return {
              date: record.date,
              dayOfWeek: checkInTime ? checkInTime.getDay() : 0,
              dayName: checkInTime ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][checkInTime.getDay()] : '',
              isWorkingDay: true, // TODO: Check với working days config
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
                totalHours: parseFloat(record.workHours || record.dailyTotalWorkHours || '0'),
                workHours: parseFloat(record.workHours || record.dailyTotalWorkHours || '0'),
                lateMinutes: parseFloat(record.lateMinutes || '0'),
                earlyDepartureMinutes: parseFloat(record.earlyDepartureMinutes || '0'),
                lateArrivalPenalty: parseFloat(record.lateArrivalPenalty || '0'),
                earlyLeavePenalty: parseFloat(record.earlyLeavePenalty || '0'),
                overtime: parseFloat(record.overtime || record.otWorkingUnit || '0'),
                dailyTotalWorkHours: parseFloat(record.dailyTotalWorkHours || '0'),
                otWorkingUnit: parseFloat(record.otWorkingUnit || '0')
              } : undefined,
              hasApprovedLeave: status === 'approved_leave',
              leaveType: record.leaveType || record.type,
              leaveInfo: record.leaveInfo || record.reason,
              status: status as any,
              statusText,
              unauthorizedAbsencePenalty: 0,
              isOnTime,
              lateMinutes: parseFloat(record.lateMinutes || '0'),
              earlyLeaveMinutes: parseFloat(record.earlyDepartureMinutes || '0'),
              businessTripInfo: record.tripInfo || record.businessTripInfo,
              businessTripDestination: record.destination || record.businessTripDestination
            };
          }),
          summary: {
            totalDays: summary.totalWorkDays,
            workingDays: summary.totalWorkDays,
            attendedDays: summary.totalWorkDays,
            approvedLeaveDays: 0,
            unauthorizedAbsenceDays: 0,
            totalUnauthorizedAbsencePenalty: 0,
            weekendDays: 0,
            totalLateMinutes: 0, // TODO: Tính tổng
            totalEarlyLeaveMinutes: 0,
            onTimeDays: 0
          }
        }
      }
    };

    return res.status(200).json(response);

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
 * GET /api/user/:userId/monthly-detail
 * Compatibility route - Tương tự monthly-full
 */
export const getUserMonthlyDetail = async (req: Request, res: Response) => {
  // Dùng chung logic với monthly-full
  return getUserMonthlyFull(req, res);
};

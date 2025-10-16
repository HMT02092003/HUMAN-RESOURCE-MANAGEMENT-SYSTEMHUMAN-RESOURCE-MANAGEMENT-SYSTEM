/**
 * Attendance Controller - Clean & Simplified
 * Chỉ chứa các API đang được frontend sử dụng:
 * 1. getUserMonthlyFull - Lấy thông tin chấm công tháng đầy đủ
 * 2. approveAttendance - Duyệt bảng công tháng
 * 3. recordAttendance - Chấm công tự động
 */

import { Request, Response } from 'express';
import { getDecodedToken } from '@/utils/decode-token';
import { AttendanceService } from '@/services/AttendanceService';
import SettingModel from '@/Models/SettingsModel';
import axios from 'axios';

/**
 * API: Duyệt bảng công tháng
 * POST /api/attendance/approve -> /api/approve
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
    const { userId, month } = req.body;

    if (!userId || !month) {
      return res.status(400).json({
        success: false,
        message: 'userId và month là bắt buộc'
      });
    }

    console.log(`🔍 Approving attendance for user ${userId} in month ${month} by ${approvedBy}`);

    // Gọi service để duyệt - forward toàn bộ body (có thể chứa monthlyStats/dailyData)
    const result = await AttendanceService.approveMonthlyAttendance(
      userId,
      month,
      approvedBy,
      token,
      req.body // extra data from FE (monthlyStats, dailyData, departmentId...)
    );

    if (!result.success) {
      // Special handling: attendance already approved
      if ((result as any).code === 'ALREADY_APPROVED') {
        return res.status(409).json(result);
      }

      return res.status(400).json(result);
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('❌ Error in approveAttendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi duyệt chấm công',
      error: error.message
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

    // ⭐ Tính toán lại các thống kê theo yêu cầu mới
    let presentDays = 0;           // Số ngày có mặt (có check-in)
    let lateDays = 0;              // Đếm số record có lateArrivalPenalty > 0
    let earlyLeaveDays = 0;        // Đếm số record có earlyLeavePenalty > 0
    let approvedLeaveDays = 0;     // Đếm số ngày nghỉ phép đã duyệt
    let businessTripDays = 0;      // Đếm số ngày công tác
    let unauthorizedAbsenceDays = 0; // Ngày nghỉ không phép
    let totalLateMinutes = 0;
    let totalEarlyLeaveMinutes = 0;
    let totalLatePenalty = 0;
    let totalEarlyLeavePenalty = 0;
    let onTimeDays = 0;
    let weekendDays = 0;

    // Lấy cấu hình UnauthorizedAbsencePenaltyRate (bắt buộc)
    const uaSetting = await SettingModel.query().findOne('key', 'UnauthorizedAbsencePenaltyRate');
    if (!uaSetting) {
      throw new Error('UnauthorizedAbsencePenaltyRate setting not found');
    }

    // Parse setting value: accept { rate: number } or a plain number
    let uaRate: number;
    try {
      const parsed = typeof uaSetting.value === 'string' ? JSON.parse(uaSetting.value) : uaSetting.value;
      uaRate = parsed && parsed.rate !== undefined ? parseFloat(parsed.rate) : parseFloat(parsed);
    } catch (e) {
      uaRate = parseFloat(uaSetting.value as any);
    }

    if (isNaN(uaRate)) {
      throw new Error('UnauthorizedAbsencePenaltyRate setting invalid');
    }

    // Lấy lương của user từ Auth Service (qua API Gateway)
    const apiGatewayUrl = `http://localhost:${process.env['API_GATEWAY_PORT'] || 4000}`;
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Strategy to retrieve salary:
    // 1) try auth internal endpoint (no token): /api/internal/users/:id/salary on auth-service
    // 2) try employee endpoint via gateway: /api/employee/users/:id/salary
    // 3) fallback to gateway auth detail which requires token

    let baseSalary: number | null = null;
    // 1) internal auth internal salary endpoint
    try {
      const internalResp = await axios.get(`http://localhost:${process.env['AUTH_SERVICE_PORT'] || 4001}/api/internal/users/${userId}/salary`, { timeout: 4000 });
      if (internalResp.data && internalResp.data.success && internalResp.data.data) {
        baseSalary = internalResp.data.data.baseSalary || internalResp.data.data.salary;
        console.log('✅ Retrieved salary from auth internal endpoint:', baseSalary);
      }
    } catch (internalErr: any) {
      console.log('⚠️ Auth internal salary endpoint not available or failed:', internalErr.message || internalErr.response?.status);
    }

    // 2) try employee endpoint via gateway
    if (!baseSalary) {
      try {
        const employeeSalaryResp = await axios.get(`${apiGatewayUrl}/api/employee/users/${userId}/salary`, { timeout: 4000 });
        if (employeeSalaryResp.data && employeeSalaryResp.data.success && employeeSalaryResp.data.data) {
          baseSalary = employeeSalaryResp.data.data.baseSalary || employeeSalaryResp.data.data.salary;
          console.log('✅ Retrieved salary via employee endpoint:', baseSalary);
        }
      } catch (empErr: any) {
        console.log('⚠️ Employee salary endpoint via gateway failed:', empErr.message || empErr.response?.status);
      }
    }

    // 3) fallback: gateway auth detail (requires token)
    if (!baseSalary) {
      try {
        const userResp = await axios.get(`${apiGatewayUrl}/api/auth/users/detail/${userId}`, { headers, timeout: 5000 });
        if (userResp.status === 401) {
          throw new Error('Auth token invalid/expired when fetching user details');
        }
        const userData = userResp.data && (userResp.data.data ? userResp.data.data : userResp.data);
        baseSalary = userData?.salary ?? userData?.baseSalary;
        console.log('✅ Retrieved salary via auth detail:', baseSalary);
      } catch (authErr: any) {
        console.error('❌ Failed to retrieve salary via auth gateway:', authErr.response?.data || authErr.message);
        throw new Error('Unable to retrieve user salary: ' + (authErr.response?.data?.message || authErr.message));
      }
    }

    if (!baseSalary) throw new Error('Salary info for user not found');
    baseSalary = parseFloat(baseSalary.toString());
    if (isNaN(baseSalary) || baseSalary <= 0) throw new Error('Invalid base salary for user');

    const unauthorizedAbsencePenaltyPerDay = Math.round((baseSalary / 100) * uaRate);

    console.log(`💰 Unauthorized absence per day: ${unauthorizedAbsencePenaltyPerDay}`);

    // Lọc và đếm từ dailyData - SIMPLIFIED: Sử dụng trực tiếp fields từ database
    const processedDailyDetails = summary.attendanceData.map((record: any) => {
      const checkInTime = record.checkInTime ? new Date(record.checkInTime) : null;
      
      // ⭐ Parse numeric fields - database trả về string hoặc number
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
      
      // ⭐ Đếm theo yêu cầu
      if (hasLatePenalty) lateDays++;
      if (hasEarlyLeavePenalty) earlyLeaveDays++;
      
      totalLateMinutes += lateMinutes;
      totalEarlyLeaveMinutes += earlyDepartureMinutes;
      totalLatePenalty += lateArrivalPenalty;
      totalEarlyLeavePenalty += earlyLeavePenalty;
      
      // ⭐ Xác định status theo priority
      let status: string = 'working';
      let statusText = 'Đã chấm công';
      let isOnTime = false;
      let isWorkingDay = record.isWorkingDay !== false;
      const isFuture = record.isFuture === true;
      
      // Priority 1: Weekend
      if (!isWorkingDay && !record.hasApprovedOT) {
        status = 'weekend';
        statusText = 'Cuối tuần';
        weekendDays++;
      }
      // Priority 2: Business trip
      else if (record.hasBusinessTrip || record.type === 'business_trip') {
        status = 'business_trip';
        statusText = 'Công tác';
        businessTripDays++;
      }
      // Priority 3: Approved leave
      else if (record.hasApprovedLeave || record.type === 'leave' || record.type === 'sick-leave') {
        status = 'approved_leave';
        statusText = record.leaveInfo || record.leaveTypeName || 'Nghỉ phép';
        approvedLeaveDays++;
      }
      // Priority 4: Unauthorized absence
      else if (isWorkingDay && !record.checkInTime && !isFuture) {
        status = 'absent';
        statusText = 'Nghỉ không phép';
        unauthorizedAbsenceDays++;
      }
      // Priority 5: Has attendance
      else if (record.checkInTime) {
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
        isWorkingDay,
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

    // ⭐ Tính tổng tiền phạt nghỉ không phép
    const totalUnauthorizedAbsencePenalty = unauthorizedAbsenceDays * unauthorizedAbsencePenaltyPerDay;
    
    // ⭐ Tổng tiền phạt = phạt đi muộn + phạt về sớm + phạt nghỉ không phép
    const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;

    // ⭐ Vắng mặt = nghỉ phép + công tác (theo yêu cầu)
    const absentDays = approvedLeaveDays + businessTripDays;

    // ⭐ Format response theo format mà frontend mong đợi
    const response = {
      success: true,
      data: {
        monthlyStats: {
          totalDays: summary.totalWorkDays,
          presentDays,                    // ⭐ Có mặt - đã tính
          absentDays,                     // ⭐ Vắng mặt = nghỉ phép + công tác
          lateDays,                       // ⭐ Đếm theo lateArrivalPenalty > 0
          earlyLeaveDays,                 // ⭐ Đếm theo earlyLeavePenalty > 0
          totalHours: summary.totalWorkHours,
          averageHours: presentDays > 0 ? summary.totalWorkHours / presentDays : 0,
          overtimeHours: summary.totalOvertimeHours, // ⭐ Đổi từ overtimeMinutes sang overtimeHours
          totalLatePenalty,               // ⭐ Tổng tiền phạt đi muộn
          totalEarlyLeavePenalty,         // ⭐ Tổng tiền phạt về sớm
          totalPenalty,                   // ⭐ Tổng tiền phạt (bao gồm nghỉ không phép)
          totalOvertimePay: summary.totalOvertimeSalary,
          totalLateMinutes,               // ⭐ Tổng phút đi muộn
          totalEarlyLeaveMinutes,         // ⭐ Tổng phút về sớm
          unauthorizedAbsenceDays,        // ⭐ Số ngày nghỉ không phép
          totalUnauthorizedAbsencePenalty, // ⭐ Tiền phạt nghỉ không phép
          approvedLeaveDays,              // ⭐ Số ngày nghỉ phép
          businessTripDays                // ⭐ Số ngày công tác
        },
        dailyData: {
          userId: summary.userId,
          year: parseInt(year as string),
          month: parseInt(month as string),
          monthlySalary: 0,
          penaltyRate: 0,
          dailyDetails: processedDailyDetails,
          summary: {
            totalDays: summary.attendanceData.length,
            workingDays: summary.attendanceData.filter((r: any) => r.isWorkingDay !== false).length,
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

    console.log('📊 Monthly stats summary:', {
      presentDays,
      lateDays,
      earlyLeaveDays,
      approvedLeaveDays,
      businessTripDays,
      unauthorizedAbsenceDays,
      totalPenalty,
      totalUnauthorizedAbsencePenalty
    });

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
 * API: Chấm công tự động
 * POST /api/attendance/record -> /api/record
 */
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
    
    // Gọi service để xử lý attendance tự động
    const result = await AttendanceService.recordAttendance(userId, time);
    
    res.json({
      success: true,
      message: result.type === 'check_in' 
        ? 'Chấm công vào thành công' 
        : 'Chấm công ra thành công',
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

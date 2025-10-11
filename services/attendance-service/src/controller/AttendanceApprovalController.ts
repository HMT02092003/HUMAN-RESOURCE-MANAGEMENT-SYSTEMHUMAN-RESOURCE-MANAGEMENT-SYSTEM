import { Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { validate } from '@/utils/validation-utility';
import { getDecodedToken } from '@/utils/decode-token';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import ApprovedAttendanceModel from '@/Models/ApprovedAttendanceModel';
import { OvertimeProcessingService } from '@/services/OvertimeProcessingService';
import axios from 'axios';
import os from 'os';

dayjs.extend(utc);
dayjs.extend(timezone);

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const API_GATEWAY_URL = `http://${getLocalIpAddress()}:${process.env['API_GATEWAY_PORT'] || 4000}`;

interface UserInfo {
  id: number;
  name: string;
  email: string;
  departmentId: number;
  department: {
    id: number;
    name: string;
  };
}

interface AttendanceSummary {
  userId: number;
  user: UserInfo;
  month: string;
  totalWorkDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalLateDays: number;
  totalEarlyLeaveDays: number;
  totalPenalty: number;
  totalOvertimeSalary: number;
  isApproved: boolean;
  attendanceData: any[];
}

export const getAttendanceForApproval = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.['token'] || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không được cung cấp'
      }); 
    }

    const decodedToken = getDecodedToken(token);
    if (!decodedToken || !decodedToken.sub) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    const { month, departmentId } = req.query;

    // Validate input
    if (!month || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Tháng và phòng ban là bắt buộc'
      });
    }

    // Lấy danh sách users trong phòng ban
    const usersResponse = await axios.get(`${API_GATEWAY_URL}/api/auth/users/department/${departmentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!usersResponse.data || !usersResponse.data.data) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên trong phòng ban'
      });
    }

    const users = usersResponse.data.data;
    const attendanceSummaries: AttendanceSummary[] = [];

    // Lấy thông tin chấm công cho từng user
    for (const user of users) {
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      // Lấy dữ liệu chấm công trong tháng
      const attendanceData = await TimeAttendanceModel.query()
        .where('userId', user.id)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      // Kiểm tra xem đã duyệt chưa
      const isApproved = await ApprovedAttendanceModel.isApproved(user.id, month as string);

      // Tính toán thống kê
      let totalWorkDays = 0;
      let totalWorkHours = 0;
      let totalOvertimeHours = 0;
      let totalLateDays = 0;
      let totalEarlyLeaveDays = 0;
      let totalPenalty = 0;
      let totalOvertimeSalary = 0;

      attendanceData.forEach(record => {
        if (record.checkInTime && record.checkOutTime) {
          totalWorkDays++;
          totalWorkHours += parseFloat(record.dailyTotalWorkHours.toString());
          totalOvertimeHours += parseFloat(record.otWorkingUnit.toString());
          
          if (record.lateMinutes > 0) {
            totalLateDays++;
          }
          if (record.earlyDepartureMinutes > 0) {
            totalEarlyLeaveDays++;
          }
          
          totalPenalty += parseFloat(record.lateArrivalPenalty.toString()) + parseFloat(record.earlyLeavePenalty.toString());
          totalOvertimeSalary += parseFloat(record.otSalary.toString());
        }
      });

      attendanceSummaries.push({
        userId: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          departmentId: user.departmentId,
          department: user.department || { id: parseInt(departmentId as string), name: 'N/A' }
        },
        month: month as string,
        totalWorkDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalLateDays,
        totalEarlyLeaveDays,
        totalPenalty: Math.round(totalPenalty * 100) / 100,
        totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
        isApproved,
        attendanceData
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách chấm công thành công',
      data: attendanceSummaries
    });

  } catch (error: any) {
    console.error('Error getting attendance for approval:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách chấm công',
      error: error.message
    });
  }
};

export const approveAttendance = async (req: Request, res: Response) => {
  try {
    console.log('\n🔥🔥🔥 ===== APPROVE ATTENDANCE API CALLED ===== 🔥🔥🔥');
    console.log('📍 URL:', req.url);
    console.log('📍 Method:', req.method);
    console.log('📍 Path:', req.path);
    console.log('📍 Body:', JSON.stringify(req.body, null, 2));
    console.log('📍 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔥🔥🔥 ========================================== 🔥🔥🔥\n');

    const token = req.cookies?.['token'] || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Token không được cung cấp'
      });
    }

    const decodedToken = getDecodedToken(token);
    if (!decodedToken || !decodedToken.sub) {
      console.log('❌ Invalid token');
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    const approverId = parseInt(decodedToken.sub);
    console.log('✅ Approver ID:', approverId);
    
    // Validate input
    const inputs = req.body;
    const allowFields = {
      userId: 'number!',
      month: 'string!',
      departmentId: 'number!',
      notes: 'string'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });
    const { userId, month, departmentId, notes } = params;
    
    console.log('📊 Approval params:', { userId, month, departmentId, approverId });

    // Kiểm tra xem đã duyệt chưa
    const isAlreadyApproved = await ApprovedAttendanceModel.isApproved(userId, month);
    if (isAlreadyApproved) {
      console.log('⚠️ Already approved');
      return res.status(400).json({
        success: false,
        message: 'Chấm công của nhân viên này đã được duyệt'
      });
    }

    console.log(`\n🚀 ===== STARTING ATTENDANCE APPROVAL PROCESS =====`);
    console.log(`📊 User: ${userId}, Month: ${month}, Department: ${departmentId}`);

    // ==========================================
    // BƯỚC 1: XỬ LÝ ĐƠN TĂNG CA TRƯỚC KHI DUYỆT
    // ==========================================
    try {
      console.log(`\n📋 Step 1: Processing overtime applications...`);
      
      const overtimeResult = await OvertimeProcessingService.processAllOvertimeForMonth(
        userId,
        month,
        token
      );

      console.log(`✅ Overtime processing completed:`);
      console.log(`   - Total processed: ${overtimeResult.totalProcessed}`);
      console.log(`   - Valid: ${overtimeResult.totalValid}`);
      console.log(`   - Invalid: ${overtimeResult.totalInvalid}`);
      console.log(`   - Total OT hours: ${overtimeResult.totalOvertimeHours.toFixed(2)}`);
      console.log(`   - Total OT salary: ${overtimeResult.totalOvertimeSalary.toLocaleString()} VND`);

      // Log chi tiết các đơn invalid (nếu có)
      if (overtimeResult.totalInvalid > 0) {
        console.log(`\n⚠️ Invalid overtime applications:`);
        overtimeResult.details
          .filter(d => !d.isValid)
          .forEach(d => {
            console.log(`   - ${d.date}: ${d.reason}`);
          });
      }

    } catch (overtimeError: any) {
      console.error(`❌ Error processing overtime:`, overtimeError.message);
      // Không throw error, tiếp tục duyệt chấm công nhưng log warning
      console.warn(`⚠️ Continuing approval process without overtime calculation`);
    }

    // ==========================================
    // BƯỚC 2: LẤY DỮ LIỆU CHẤM CÔNG (ĐÃ CÓ OT)
    // ==========================================
    console.log(`\n📊 Step 2: Fetching updated attendance data...`);

    // Lấy dữ liệu chấm công trong tháng (BÂY GIỜ ĐÃ CÓ OT DATA)
    const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

    const attendanceData = await TimeAttendanceModel.query()
      .where('userId', userId)
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    if (attendanceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dữ liệu chấm công trong tháng này'
      });
    }

    console.log(`✅ Found ${attendanceData.length} attendance records`);

    // ==========================================
    // BƯỚC 3: TÍNH TOÁN THỐNG KÊ THÁNG
    // ==========================================
    console.log(`\n💰 Step 3: Calculating monthly statistics...`);

    // Khởi tạo các biến thống kê
    let totalWorkDays = 0;
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    let totalOvertimeDays = 0;
    let totalLateDays = 0;
    let totalEarlyLeaveDays = 0;
    let totalLateMinutes = 0;
    let totalEarlyLeaveMinutes = 0;
    let totalPaidLeaveDays = 0;
    let totalUnpaidLeaveDays = 0;
    let totalLatePenalty = 0;
    let totalEarlyLeavePenalty = 0;
    let totalOvertimeSalary = 0;

    // Duyệt qua từng record để tính tổng
    for (const record of attendanceData) {
      // Đếm ngày làm việc (có check-in và check-out)
      if (record.checkInTime && record.checkOutTime) {
        totalWorkDays++;
        totalWorkHours += parseFloat(record.dailyTotalWorkHours?.toString() || '0');
      }
      
      // Tính OT
      const otMinutes = parseFloat(record.otMinutes?.toString() || '0');
      if (otMinutes > 0) {
        totalOvertimeDays++;
        totalOvertimeHours += otMinutes / 60; // Convert minutes to hours
        totalOvertimeSalary += parseFloat(record.otSalary?.toString() || '0');
      }
      
      // Đếm đi muộn
      const lateMinutes = parseFloat(record.lateMinutes?.toString() || '0');
      if (lateMinutes > 0) {
        totalLateDays++;
        totalLateMinutes += lateMinutes;
        totalLatePenalty += parseFloat(record.lateArrivalPenalty?.toString() || '0');
      }
      
      // Đếm về sớm
      const earlyMinutes = parseFloat(record.earlyDepartureMinutes?.toString() || '0');
      if (earlyMinutes > 0) {
        totalEarlyLeaveDays++;
        totalEarlyLeaveMinutes += earlyMinutes;
        totalEarlyLeavePenalty += parseFloat(record.earlyLeavePenalty?.toString() || '0');
      }
      
      // TODO: Tính nghỉ phép (cần lấy từ bảng applications)
      // Hiện tại để mặc định = 0, có thể bổ sung sau
    }

    const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty;

    console.log(`✅ Statistics calculated:`);
    console.log(`   - Total work days: ${totalWorkDays}`);
    console.log(`   - Total work hours: ${totalWorkHours.toFixed(2)}`);
    console.log(`   - Total overtime hours: ${totalOvertimeHours.toFixed(2)}`);
    console.log(`   - Total overtime days: ${totalOvertimeDays}`);
    console.log(`   - Total late days: ${totalLateDays} (${totalLateMinutes} mins)`);
    console.log(`   - Total early leave days: ${totalEarlyLeaveDays} (${totalEarlyLeaveMinutes} mins)`);
    console.log(`   - Total penalty: ${totalPenalty.toLocaleString()} VND`);
    console.log(`   - Total overtime salary: ${totalOvertimeSalary.toLocaleString()} VND`);

    // ==========================================
    // BƯỚC 4: LƯU VÀO BẢNG APPROVED_ATTENDANCES
    // ==========================================
    console.log(`\n💾 Step 4: Saving to approved_attendances table...`);

    // Tạo 1 RECORD DUY NHẤT cho tháng này
    const approvedRecord = {
      userId: userId,
      departmentId: departmentId,
      month: month,
      
      // Tổng hợp công
      totalWorkDays: Math.round(totalWorkDays),
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      
      // Tổng hợp đi muộn/về sớm
      totalLateDays: Math.round(totalLateDays),
      totalEarlyLeaveDays: Math.round(totalEarlyLeaveDays),
      totalLateMinutes: Math.round(totalLateMinutes),
      totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
      
      // Tổng hợp OT
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalOvertimeDays: Math.round(totalOvertimeDays),
      totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
      
      // Tổng hợp nghỉ phép (TODO: cần tính từ applications)
      totalPaidLeaveDays: 0,
      totalUnpaidLeaveDays: 0,
      
      // Tổng hợp phạt
      totalLatePenalty: Math.round(totalLatePenalty * 100) / 100,
      totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty * 100) / 100,
      totalPenalty: Math.round(totalPenalty * 100) / 100,
      
      // Thông tin lương (optional - có thể thêm sau)
      baseSalary: null,
      totalAllowance: 0,
      finalSalary: null,
      
      // Thông tin duyệt
      approvedBy: approverId,
      approvedAt: dayjs().tz('Asia/Ho_Chi_Minh').toISOString(),
      notes: notes || null
    };

    // Lưu vào DB (chỉ 1 record)
    await ApprovedAttendanceModel.query().insert(approvedRecord);

    console.log(`✅ Approved attendance saved successfully!`);

    res.status(200).json({
      success: true,
      message: 'Duyệt chấm công thành công',
      data: {
        userId,
        month,
        totalAttendanceRecords: attendanceData.length,
        summary: {
          totalWorkDays,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
          totalLateDays,
          totalEarlyLeaveDays,
          totalPenalty: Math.round(totalPenalty * 100) / 100,
          totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100
        }
      }
    });

  } catch (error: any) {
    console.error('Error approving attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi duyệt chấm công',
      error: error.message
    });
  }
};

/**
 * Lấy thông tin chấm công đã được duyệt
 * @returns 1 record tổng hợp tháng
 */
export const getApprovedAttendance = async (req: Request, res: Response) => {
  try {
    const { userId, month } = req.query;

    if (!userId || !month) {
      return res.status(400).json({
        success: false,
        message: 'UserId và tháng là bắt buộc'
      });
    }

    // Lấy thông tin tổng hợp đã duyệt (1 record duy nhất)
    const approvedData = await ApprovedAttendanceModel.getByUserAndMonth(
      parseInt(userId as string),
      month as string
    );

    if (!approvedData) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có dữ liệu chấm công được duyệt cho tháng này'
      });
    }

    // Lấy chi tiết từng ngày từ time_attendances (nếu cần)
    const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
    
    const dailyAttendance = await TimeAttendanceModel.query()
      .where('userId', parseInt(userId as string))
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu chấm công đã duyệt thành công',
      data: {
        monthlySummary: approvedData,  // Tổng hợp tháng
        dailyDetails: dailyAttendance  // Chi tiết từng ngày
      }
    });

  } catch (error: any) {
    console.error('Error getting approved attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu chấm công đã duyệt',
      error: error.message
    });
  }
};

/**
 * Kiểm tra trạng thái duyệt chấm công
 */
export const getApprovalStatus = async (req: Request, res: Response) => {
  try {
    const { userId, month } = req.query;

    if (!userId || !month) {
      return res.status(400).json({
        success: false,
        message: 'UserId và tháng là bắt buộc'
      });
    }

    const isApproved = await ApprovedAttendanceModel.isApproved(
      parseInt(userId as string),
      month as string
    );

    return res.status(200).json({
      success: true,
      message: 'Kiểm tra trạng thái duyệt thành công',
      data: {
        userId: parseInt(userId as string),
        month: month as string,
        isApproved
      }
    });

  } catch (error: any) {
    console.error('Error checking approval status:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra trạng thái duyệt',
      error: error.message
    });
  }
};

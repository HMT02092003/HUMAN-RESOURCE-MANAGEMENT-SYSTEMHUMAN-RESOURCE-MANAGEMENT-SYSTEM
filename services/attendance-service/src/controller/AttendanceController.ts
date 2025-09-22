import { Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { validate } from '@/utils/validation-utility';

dayjs.extend(utc);
dayjs.extend(timezone);
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import { AttendanceCalculationService } from '@/services/AttendanceCalculationService';
import { getDecodedToken } from '@/utils/decode-token';

// API xác nhận chấm công với logic check-in/check-out tự động
export const confirmAttendance = async (req: Request, res: Response) => {
  try {
    console.log('=== ATTENDANCE DATA RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate input data
    const inputs = req.body;
    const allowFields = {
      userId: 'number!',
      location: 'string',
      device: 'string',
      confidence: 'number',
      method: 'string'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });
    
    const { userId, location, device, confidence, method } = params;

    const currentDate = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const currentTime = dayjs().tz('Asia/Ho_Chi_Minh').toISOString();
    
    // Lấy token từ cookie hoặc header để truyền cho salary calculation
    const token = req.cookies?.['token'] || 
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.authorization?.split(' ')[1];
    
    // Cần có token để tính lương chính xác
    let tokenUserId: number | null = null;
    if (token) {
      const decodedToken = getDecodedToken(token);
      if (decodedToken && decodedToken.sub) {
        tokenUserId = parseInt(decodedToken.sub);
      }
    }

    console.log('✅ Processing attendance for:');
    console.log('- User ID from request:', userId);
    console.log('- User ID from token:', tokenUserId);
    console.log('- Date:', currentDate);
    console.log('- Current Time:', currentTime);
    console.log('- Token available:', !!token);
    
    // Sử dụng userId từ token để tính lương nếu có, fallback về userId từ request
    const finalUserId = tokenUserId || userId;

    // Kiểm tra xem đã có bản ghi chấm công ngày hôm nay chưa
    const existingAttendance = await TimeAttendanceModel.query()
      .where('userId', userId)
      .where('date', currentDate)
      .first();

    let attendanceType: string;
    let updateData: any = {};
    let result: any;

    if (!existingAttendance) {
      // Lần đầu tiên trong ngày - CHECK-IN
      attendanceType = 'check_in';
      
      // Tính toán dựa vào settings cho check-in
      const calculation = await AttendanceCalculationService.calculateAttendance(
        currentTime,
        null,
        currentDate,
        finalUserId,
        token
      );
      
      console.log('📊 Check-in calculation:', calculation);

      updateData = {
        userId: parseInt(userId.toString()),
        date: currentDate,
        checkInTime: currentTime,
        checkOutTime: null,
        dailyTotalWorkHours: 0.0,
        lateMinutes: calculation.lateMinutes,
        earlyDepartureMinutes: 0.0,
        dailyWorkingUnit: 0.0,
        earlyLeavePenalty: 0.0,
        lateArrivalPenalty: 0.0,
        otWorkingUnit: 0.0,
        otMinutes: 0.0, // Không tính OT ở đây
        otSalary: 0.0,   // Không tính lương OT ở đây
        created_at: currentTime,
        updated_at: currentTime
      };

      result = await TimeAttendanceModel.query().insert(updateData);
      console.log('📝 CHECK-IN: Creating new attendance record');
      
    } else {
      if (!existingAttendance.checkOutTime) {
        // Lần 2: CHECK-OUT đầu tiên
        attendanceType = 'check_out';
        
        // Tính toán đầy đủ dựa vào settings
        const calculation = await AttendanceCalculationService.calculateAttendance(
          existingAttendance.checkInTime,
          currentTime,
          currentDate,
          finalUserId,
          token
        );
        
        console.log('📊 Check-out calculation:', calculation);
        
        updateData = {
          checkOutTime: currentTime,
          dailyTotalWorkHours: parseFloat((Math.round(calculation.workHours * 100) / 100).toString()),
          lateMinutes: calculation.lateMinutes,
          earlyDepartureMinutes: calculation.earlyDepartureMinutes,
          dailyWorkingUnit: parseFloat((Math.round(calculation.workHours * 100) / 100).toString()),
          earlyLeavePenalty: calculation.earlyLeavePenaltyAmount,
          lateArrivalPenalty: calculation.latePenaltyAmount,
          otWorkingUnit: 0.0, // Không tính OT unit
          otMinutes: 0.0,     // Không tính OT minutes
          otSalary: 0.0,      // Không tính lương OT
          updated_at: currentTime
        };

        await TimeAttendanceModel.query()
          .where('userId', userId)
          .where('date', currentDate)
          .patch(updateData);

        result = await TimeAttendanceModel.query()
          .where('userId', userId)
          .where('date', currentDate)
          .first();

        console.log('📝 CHECK-OUT: First check-out of the day');
        console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
        console.log('- Late minutes:', updateData.lateMinutes);
        console.log('- Early departure minutes:', updateData.earlyDepartureMinutes);
        console.log('- Late penalty amount (VND):', updateData.lateArrivalPenalty);
        console.log('- Early leave penalty amount (VND):', updateData.earlyLeavePenalty);
        console.log('- Penalty rate used:', calculation.penaltyRate);
        
      } else {
        // Lần 3+: Cập nhật CHECK-OUT
        attendanceType = 'check_out_update';
        
        // Tính toán lại đầy đủ dựa vào settings
        const calculation = await AttendanceCalculationService.calculateAttendance(
          existingAttendance.checkInTime,
          currentTime,
          currentDate,
          finalUserId,
          token
        );
        
        console.log('📊 Check-out update calculation:', calculation);

        updateData = {
          checkOutTime: currentTime,
          dailyTotalWorkHours: parseFloat((Math.round(calculation.workHours * 100) / 100).toString()),
          lateMinutes: calculation.lateMinutes,
          earlyDepartureMinutes: calculation.earlyDepartureMinutes,
          dailyWorkingUnit: parseFloat((Math.round(calculation.workHours * 100) / 100).toString()),
          earlyLeavePenalty: calculation.earlyLeavePenaltyAmount,
          lateArrivalPenalty: calculation.latePenaltyAmount,
          otWorkingUnit: 0.0, // Không tính OT unit
          otMinutes: 0.0,     // Không tính OT minutes
          otSalary: 0.0,      // Không tính lương OT
          updated_at: currentTime
        };

        await TimeAttendanceModel.query()
          .where('userId', userId)
          .where('date', currentDate)
          .patch(updateData);

        result = await TimeAttendanceModel.query()
          .where('userId', userId)
          .where('date', currentDate)
          .first();

        console.log('📝 CHECK-OUT UPDATE: Updating check-out time');
        console.log('- Previous check-out:', existingAttendance.checkOutTime);
        console.log('- New check-out:', currentTime);
        console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
        console.log('- Late minutes:', updateData.lateMinutes);
        console.log('- Early departure minutes:', updateData.earlyDepartureMinutes);
        console.log('- Late penalty amount (VND):', updateData.lateArrivalPenalty);
        console.log('- Early leave penalty amount (VND):', updateData.earlyLeavePenalty);
        console.log('- Penalty rate used:', calculation.penaltyRate);
      }
    }

    console.log('✅ Database operation completed');
    console.log('- Attendance Type:', attendanceType);

    // Tạo response message
    let message = '';
    switch (attendanceType) {
      case 'check_in':
        message = 'Check-in thành công';
        break;
      case 'check_out':
        message = `Check-out thành công (Làm việc ${result?.dailyTotalWorkHours || 0} giờ)`;
        break;
      case 'check_out_update':
        message = `Cập nhật check-out thành công (Tổng ${result?.dailyTotalWorkHours || 0} giờ)`;
        break;
      default:
        message = 'Chấm công thành công';
    }

    const responseData = {
      success: true,
      message: message,
      data: {
        userId: parseInt(userId),
        attendanceType,
        date: currentDate,
        checkInTime: result?.checkInTime,
        checkOutTime: result?.checkOutTime,
        workHours: result?.dailyTotalWorkHours || 0,
        lateMinutes: result?.lateMinutes || 0,
        earlyDepartureMinutes: result?.earlyDepartureMinutes || 0,
        otMinutes: result?.otMinutes || 0,
        lateArrivalPenalty: result?.lateArrivalPenalty || 0,
        earlyLeavePenalty: result?.earlyLeavePenalty || 0,
        timestamp: currentTime,
        confidence,
        method,
        device,
        location,
        status: result?.checkOutTime ? 'completed' : 'partial',
        processedAt: dayjs().toISOString()
      }
    };

    console.log('✅ Attendance processed successfully:', JSON.stringify(responseData, null, 2));
    
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error confirming attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận chấm công',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// API lấy dữ liệu chấm công theo tháng
export const getUserAttendanceByMonth = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    // Validate input với proper type checking
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year and month are required'
      });
    }

    const inputs = { 
      userId: parseInt(userId), 
      year: parseInt(year as string), 
      month: parseInt(month as string) 
    };
    
    const allowFields = {
      userId: 'number!',
      year: 'number!',
      month: 'number!'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });

    // Tạo startDate và endDate cho tháng
    const startDate = dayjs(`${params['year']}-${String(params['month']).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const endDate = dayjs(`${params['year']}-${String(params['month']).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    console.log('📅 Fetching attendance data:', { 
      userId: params['userId'], 
      year: params['year'], 
      month: params['month'], 
      startDate, 
      endDate 
    });

    const attendanceRecords = await TimeAttendanceModel.query()
      .where('userId', params['userId'])
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    // Format dữ liệu cho frontend
    const formattedData = attendanceRecords.map(record => {
      const checkInTime = record.checkInTime ? dayjs(record.checkInTime) : null;
      const checkOutTime = record.checkOutTime ? dayjs(record.checkOutTime) : null;
      
      return {
        id: record.id,
        userId: record.userId,
        date: dayjs(record.date).format('YYYY-MM-DD'),
        checkIn: checkInTime ? checkInTime.format('HH:mm') : null,
        checkOut: checkOutTime ? checkOutTime.format('HH:mm') : null,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        totalHours: parseFloat(record.dailyTotalWorkHours?.toString() || '0'),
        workHours: parseFloat(record.dailyTotalWorkHours?.toString() || '0'),
        lateMinutes: parseFloat(record.lateMinutes?.toString() || '0'),
        earlyDepartureMinutes: parseFloat(record.earlyDepartureMinutes?.toString() || '0'),
        lateArrivalPenalty: parseFloat(record.lateArrivalPenalty?.toString() || '0'),
        earlyLeavePenalty: parseFloat(record.earlyLeavePenalty?.toString() || '0'),
        status: determineAttendanceStatus(record),
        overtime: parseFloat(record.otMinutes?.toString() || '0') / 60
      };
    });

    console.log(`✅ Found ${formattedData.length} attendance records for user ${params['userId']}`);

    return res.status(200).json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      period: { year: params['year'], month: params['month'] }
    });

  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu chấm công tháng',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// API lấy thống kê tháng
export const getMonthlyStats = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      userId: 'number!',
      year: 'number!',
      month: 'number!'
    };

    const params = validate({
      ...req.params,
      ...req.query
    }, allowFields, { removeNotAllow: true });

    // Tạo startDate và endDate cho tháng
    const startDate = dayjs(`${params['year']}-${String(params['month']).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const endDate = dayjs(`${params['year']}-${String(params['month']).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    console.log('📊 Fetching monthly stats:', { 
      userId: params['userId'], 
      year: params['year'], 
      month: params['month'], 
      startDate, 
      endDate 
    });

    // Lấy tất cả bản ghi chấm công trong tháng
    const attendanceRecords = await TimeAttendanceModel.query()
      .where('userId', params['userId'])
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    // Tính toán thống kê
    const stats = {
      totalDays: attendanceRecords.length,
      presentDays: attendanceRecords.filter(record => record.checkInTime).length,
      absentDays: attendanceRecords.filter(record => !record.checkInTime).length,
      lateDays: attendanceRecords.filter(record => parseFloat(record.lateMinutes?.toString() || '0') > 0).length,
      earlyLeaveDays: attendanceRecords.filter(record => parseFloat(record.earlyDepartureMinutes?.toString() || '0') > 0).length,
      totalHours: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.dailyTotalWorkHours?.toString() || '0'), 0),
      averageHours: 0,
      overtimeHours: attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.otMinutes?.toString() || '0') / 60), 0),
      totalLatePenalty: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.lateArrivalPenalty?.toString() || '0'), 0),
      totalEarlyLeavePenalty: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.earlyLeavePenalty?.toString() || '0'), 0),
      totalPenalty: 0,
      totalOvertimePay: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.otSalary?.toString() || '0'), 0)
    };

    // Tính average hours
    stats.averageHours = stats.presentDays > 0 ? stats.totalHours / stats.presentDays : 0;
    
    // Tính total penalty
    stats.totalPenalty = stats.totalLatePenalty + stats.totalEarlyLeavePenalty;

    console.log(`✅ Monthly stats calculated for user ${params['userId']}:`, stats);

    return res.status(200).json({
      success: true,
      data: stats,
      period: { year: params['year'], month: params['month'] }
    });

  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tháng',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function để xác định trạng thái chấm công
function determineAttendanceStatus(record: any): 'on_time' | 'late' | 'early_leave' | 'absent' {
  if (!record.checkInTime) {
    return 'absent';
  }
  
  const lateMinutes = parseFloat(record.lateMinutes?.toString() || '0');
  const earlyDepartureMinutes = parseFloat(record.earlyDepartureMinutes?.toString() || '0');
  
  if (lateMinutes > 0 && earlyDepartureMinutes > 0) {
    return 'late'; // Ưu tiên late nếu cả 2
  } else if (lateMinutes > 0) {
    return 'late';
  } else if (earlyDepartureMinutes > 0) {
    return 'early_leave';
  } else {
    return 'on_time';
  }
}

import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { validate } from '@/utils/validation-utility';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import { AttendanceCalculationService } from '@/services/AttendanceCalculationService';

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

    const currentDate = dayjs().format('YYYY-MM-DD'); // YYYY-MM-DD
    const currentTime = dayjs().toISOString(); // ISO timestamp

    console.log('✅ Processing attendance for:');
    console.log('- User ID:', userId);
    console.log('- Date:', currentDate);
    console.log('- Current Time:', currentTime);

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
      
      // Tính toán attendance data dựa trên settings
      const calculation = await AttendanceCalculationService.calculateAttendance(
        currentTime,
        null,
        currentDate
      );

      updateData = {
        userId: parseInt(userId.toString()),
        date: currentDate,
        checkInTime: currentTime,
        checkOutTime: null,
        dailyTotalWorkHours: 0.0,
        lateMinutes: parseFloat(calculation.lateMinutes.toString()) || 0.0,
        earlyDepartureMinutes: 0.0,
        dailyWorkingUnit: 0.0,
        earlyLeavePenalty: 0.0,
        lateArrivalPenalty: 0.0,
        otWorkingUnit: 0.0,
        otMinutes: 0.0,
        otSalary: 0.0,
        created_at: currentTime,
        updated_at: currentTime
      };

      result = await TimeAttendanceModel.query().insert(updateData);
      console.log('📝 LẦN 1: Creating new attendance record (CHECK-IN ONLY)');
      
    } else {
      if (!existingAttendance.checkOutTime) {
        // Lần 2: CHECK-OUT đầu tiên
        attendanceType = 'check_out';
        
        // Tính toán lại toàn bộ dữ liệu với check-out
        const calculation = await AttendanceCalculationService.calculateAttendance(
          existingAttendance.checkInTime,
          currentTime,
          currentDate
        );

        updateData = {
          checkOutTime: currentTime,
          dailyTotalWorkHours: parseFloat((Math.round(calculation.workHours * 100) / 100).toString()),
          earlyDepartureMinutes: parseFloat(calculation.earlyDepartureMinutes.toString()) || 0.0,
          otMinutes: parseFloat(calculation.otMinutes.toString()) || 0.0,
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

        console.log('📝 LẦN 2: First CHECK-OUT of the day');
        console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
        console.log('- Late minutes:', result?.lateMinutes);
        console.log('- Early departure minutes:', updateData.earlyDepartureMinutes);
        console.log('- OT minutes:', updateData.otMinutes);
        
      } else {
        // Lần 3+: Cập nhật CHECK-OUT
        attendanceType = 'check_out_update';
        
        // Tính toán lại với check-out mới
        const calculation = await AttendanceCalculationService.calculateAttendance(
          existingAttendance.checkInTime,
          currentTime,
          currentDate
        );

        updateData = {
          checkOutTime: currentTime,
          dailyTotalWorkHours: parseFloat((Math.round(calculation.workHours * 100) / 100).toString()),
          earlyDepartureMinutes: parseFloat(calculation.earlyDepartureMinutes.toString()) || 0.0,
          otMinutes: parseFloat(calculation.otMinutes.toString()) || 0.0,
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

        console.log('📝 LẦN 3+: Updating CHECK-OUT time');
        console.log('- Previous check-out:', existingAttendance.checkOutTime);
        console.log('- New check-out:', currentTime);
        console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
      }
    }

    console.log('✅ Database operation completed');
    console.log('- Attendance Type:', attendanceType);

    // Tạo response message
    let message = '';
    switch (attendanceType) {
      case 'check_in':
        message = `Check-in thành công${result?.lateMinutes > 0 ? ` (Đi muộn ${result.lateMinutes} phút)` : ''}`;
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

// API kiểm tra trạng thái chấm công
export const getAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const inputs = { userId: parseInt(userId) };
    const allowFields = { userId: 'number!' };
    const params = validate(inputs, allowFields, { removeNotAllow: true });

    const targetDate = date || dayjs().format('YYYY-MM-DD');

    const attendance = await TimeAttendanceModel.query()
      .where('userId', params.userId)
      .where('date', targetDate)
      .first();

    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: {
          userId: params.userId,
          date: targetDate,
          hasCheckedIn: false,
          hasCheckedOut: false,
          status: 'not_attended'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: params.userId,
        date: targetDate,
        hasCheckedIn: !!attendance.checkInTime,
        hasCheckedOut: !!attendance.checkOutTime,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        workHours: attendance.dailyTotalWorkHours,
        lateMinutes: attendance.lateMinutes,
        earlyDepartureMinutes: attendance.earlyDepartureMinutes,
        status: attendance.checkInTime && attendance.checkOutTime ? 'completed' : 'partial'
      }
    });

  } catch (error) {
    console.error('Error checking attendance status:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trạng thái chấm công',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// API lấy lịch sử chấm công
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    const inputs = { userId: parseInt(userId) };
    const allowFields = { userId: 'number!' };
    const params = validate(inputs, allowFields, { removeNotAllow: true });

    let query = TimeAttendanceModel.query()
      .where('userId', params.userId)
      .orderBy('date', 'desc')
      .limit(parseInt(limit as string));

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const history = await query;

    return res.status(200).json({
      success: true,
      data: history,
      total: history.length
    });

  } catch (error) {
    console.error('Error getting attendance history:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử chấm công',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// API lấy dữ liệu chấm công theo tháng
export const getUserAttendanceByMonth = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    // Validate input
    const inputs = { userId: parseInt(userId), year: parseInt(year as string), month: parseInt(month as string) };
    const allowFields = {
      userId: 'number!',
      year: 'number!',
      month: 'number!'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });

    // Tạo startDate và endDate cho tháng
    const startDate = dayjs(`${params.year}-${String(params.month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const endDate = dayjs(`${params.year}-${String(params.month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    console.log('📅 Fetching attendance data:', { userId: params.userId, year: params.year, month: params.month, startDate, endDate });

    const attendanceRecords = await TimeAttendanceModel.query()
      .where('userId', params.userId)
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    // Format dữ liệu cho frontend
    const formattedData = attendanceRecords.map(record => {
      const checkInTime = record.checkInTime ? dayjs(record.checkInTime) : null;
      const checkOutTime = record.checkOutTime ? dayjs(record.checkOutTime) : null;
      
      return {
        id: record.id,
        userId: record.userId,
        date: dayjs(record.date).format('YYYY-MM-DD'), // YYYY-MM-DD
        checkIn: checkInTime ? checkInTime.format('HH:mm') : null, // HH:MM
        checkOut: checkOutTime ? checkOutTime.format('HH:mm') : null, // HH:MM
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        totalHours: parseFloat(record.dailyTotalWorkHours?.toString() || '0'),
        workHours: parseFloat(record.dailyTotalWorkHours?.toString() || '0'),
        lateMinutes: parseFloat(record.lateMinutes?.toString() || '0'),
        earlyDepartureMinutes: parseFloat(record.earlyDepartureMinutes?.toString() || '0'),
        status: determineAttendanceStatus(record),
        overtime: parseFloat(record.otMinutes?.toString() || '0') / 60
      };
    });

    console.log(`✅ Found ${formattedData.length} attendance records for user ${params.userId}`);

    return res.status(200).json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      period: { year: params.year, month: params.month }
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

// API lấy thống kê chấm công theo tháng
export const getUserMonthlyStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    // Validate input
    const inputs = { userId: parseInt(userId), year: parseInt(year as string), month: parseInt(month as string) };
    const allowFields = {
      userId: 'number!',
      year: 'number!',
      month: 'number!'
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });

    // Tạo startDate và endDate cho tháng
    const startDate = dayjs(`${params.year}-${String(params.month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const lastDay = dayjs(`${params.year}-${String(params.month).padStart(2, '0')}-01`).daysInMonth();
    const endDate = dayjs(`${params.year}-${String(params.month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    console.log('📊 Calculating monthly stats:', { userId: params.userId, year: params.year, month: params.month, startDate, endDate });

    const attendanceRecords = await TimeAttendanceModel.query()
      .where('userId', params.userId)
      .whereBetween('date', [startDate, endDate]);

    // Tính toán thống kê
    const totalDays = lastDay;
    const presentDays = attendanceRecords.filter(record => record.checkInTime).length;
    const absentDays = totalDays - presentDays;
    
    const lateDays = attendanceRecords.filter(record => 
      parseFloat(record.lateMinutes?.toString() || '0') > 0
    ).length;
    
    const earlyLeaveDays = attendanceRecords.filter(record => 
      parseFloat(record.earlyDepartureMinutes?.toString() || '0') > 0
    ).length;

    const totalHours = attendanceRecords.reduce((sum, record) => 
      sum + parseFloat(record.dailyTotalWorkHours?.toString() || '0'), 0
    );

    const overtimeHours = attendanceRecords.reduce((sum, record) => 
      sum + (parseFloat(record.otMinutes?.toString() || '0') / 60), 0
    );

    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;

    const stats = {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      earlyLeaveDays,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100
    };

    console.log('✅ Monthly stats calculated:', stats);

    return res.status(200).json({
      success: true,
      data: stats,
      period: { year: params.year, month: params.month }
    });

  } catch (error) {
    console.error('Error calculating monthly stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tính toán thống kê tháng',
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

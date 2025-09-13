import { Request, Response } from 'express';
import connection from '@/lib/Databases/Connection';
import dayjs from 'dayjs';

// API xác nhận chấm công với logic check-in/check-out tự động
export const confirmAttendance = async (req: Request, res: Response) => {
  try {
    console.log('=== ATTENDANCE DATA RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { userId, location, device, confidence, method } = req.body;

    // Validate required fields
    if (!userId) {
      console.log('❌ Missing required fields:', { userId });
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin userId'
      });
    }

    const currentDate = dayjs().format('YYYY-MM-DD'); // YYYY-MM-DD
    const currentTime = dayjs().toISOString(); // ISO timestamp

    console.log('✅ Processing attendance for:');
    console.log('- User ID:', userId);
    console.log('- Date:', currentDate);
    console.log('- Current Time:', currentTime);

    // Kiểm tra xem đã có bản ghi chấm công ngày hôm nay chưa
    const existingAttendance = await connection('time_attendances')
      .where('userId', userId)
      .where('date', currentDate)
      .first();

    let attendanceType: string;
    let updateData: any = {};
    let isNewRecord = false;

    if (!existingAttendance) {
      // Chưa có bản ghi -> Tạo mới với CHECK-IN (Lần chấm công đầu tiên)
      attendanceType = 'check_in';
      updateData = {
        userId: parseInt(userId),
        date: currentDate,
        checkInTime: currentTime,
        checkOutTime: null,
        dailyTotalWorkHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        dailyWorkingUnit: 0,
        earlyLeavePenalty: 0,
        lateArrivalPenalty: 0,
        otWorkingUnit: 0,
        otMinutes: 0,
        otSalary: 0,
        created_at: currentTime,
        updated_at: currentTime
      };
      isNewRecord = true;
      console.log('📝 LẦN 1: Creating new attendance record (CHECK-IN ONLY)');
    } else {
      // Đã có record -> Kiểm tra xem đã có check-out chưa
      if (!existingAttendance.checkOutTime) {
        // Lần 2: Chưa có check-out -> CẬP NHẬT CHECK-OUT
        attendanceType = 'check_out';
        
        // Tính toán giờ làm việc từ checkIn đến checkOut
        const checkInTime = dayjs(existingAttendance.checkInTime);
        const checkOutTime = dayjs(currentTime);
        const workHours = checkOutTime.diff(checkInTime, 'hour', true); // hours with decimal
        
        updateData = {
          checkOutTime: currentTime,
          dailyTotalWorkHours: Math.round(workHours * 100) / 100, // Round to 2 decimal places
          updated_at: currentTime
        };
        
        console.log('📝 LẦN 2: First CHECK-OUT of the day');
        console.log('- Check-in time:', existingAttendance.checkInTime);
        console.log('- Check-out time:', currentTime);
        console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
      } else {
        // Lần 3 trở đi: Đã có check-out -> CẬP NHẬT LẠI CHECK-OUT (thời gian mới nhất)
        attendanceType = 'check_out_update';
        
        // Tính toán lại giờ làm việc từ checkIn đầu tiên đến checkOut mới nhất
        const checkInTime = dayjs(existingAttendance.checkInTime);
        const checkOutTime = dayjs(currentTime);
        const workHours = checkOutTime.diff(checkInTime, 'hour', true); // hours with decimal
        
        updateData = {
          checkOutTime: currentTime, // Cập nhật thời gian check-out mới nhất
          dailyTotalWorkHours: Math.round(workHours * 100) / 100, // Round to 2 decimal places
          updated_at: currentTime
        };
        
        console.log('📝 LẦN 3+: Updating CHECK-OUT time (multiple check-outs allowed)');
        console.log('- Previous check-out:', existingAttendance.checkOutTime);
        console.log('- New check-out:', currentTime);
        console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
      }
    }

    // Thực hiện lưu databasea
    let result;
    if (isNewRecord) {
      [result] = await connection('time_attendances').insert(updateData).returning('*');
    } else {
      await connection('time_attendances')
        .where('userId', userId)
        .where('date', currentDate)
        .update(updateData);
      
      // Lấy bản ghi đã update
      result = await connection('time_attendances')
        .where('userId', userId)
        .where('date', currentDate)
        .first();
    }

    console.log('✅ Database operation completed');
    console.log('- Attendance Type:', attendanceType);
    console.log('- Record:', result);

    // Tạo response với message phù hợp
    let message = '';
    switch (attendanceType) {
      case 'check_in':
        message = 'Check-in thành công (Lần đầu trong ngày)';
        break;
      case 'check_out':
        message = 'Check-out thành công (Lần đầu check-out)';
        break;
      case 'check_out_update':
        message = 'Cập nhật check-out thành công (Check-out lần tiếp theo)';
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
        checkInTime: result.checkInTime,
        checkOutTime: result.checkOutTime,
        workHours: result.dailyTotalWorkHours,
        timestamp: currentTime,
        confidence,
        method,
        device,
        location,
        status: result.checkOutTime ? 'completed' : 'partial',
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu userId'
      });
    }

    const targetDate = date || dayjs().format('YYYY-MM-DD');

    const attendance = await connection('time_attendances')
      .where('userId', userId)
      .where('date', targetDate)
      .first();

    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
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
        userId,
        date: targetDate,
        hasCheckedIn: !!attendance.checkInTime,
        hasCheckedOut: !!attendance.checkOutTime,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        workHours: attendance.dailyTotalWorkHours,
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu userId'
      });
    }

    let query = connection('time_attendances')
      .where('userId', userId)
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

    if (!userId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin userId, year hoặc month'
      });
    }

    // Tạo startDate và endDate cho tháng
    const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    console.log('📅 Fetching attendance data:', { userId, year, month, startDate, endDate });

    const attendanceRecords = await connection('time_attendances')
      .where('userId', userId)
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
        totalHours: parseFloat(record.dailyTotalWorkHours || 0),
        workHours: parseFloat(record.dailyTotalWorkHours || 0),
        lateMinutes: parseFloat(record.lateMinutes || 0),
        earlyDepartureMinutes: parseFloat(record.earlyDepartureMinutes || 0),
        status: determineAttendanceStatus(record),
        overtime: parseFloat(record.otMinutes || 0) / 60 // Convert minutes to hours
      };
    });

    console.log(`✅ Found ${formattedData.length} attendance records for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      period: { year: parseInt(year as string), month: parseInt(month as string) }
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

    if (!userId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin userId, year hoặc month'
      });
    }

    // Tạo startDate và endDate cho tháng
    const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const lastDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
    const endDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

    console.log('📊 Calculating monthly stats:', { userId, year, month, startDate, endDate });

    const attendanceRecords = await connection('time_attendances')
      .where('userId', userId)
      .whereBetween('date', [startDate, endDate]);

    // Tính toán thống kê
    const totalDays = lastDay;
    const presentDays = attendanceRecords.filter(record => record.checkInTime).length;
    const absentDays = totalDays - presentDays;
    
    // Tính các loại chấm công
    const lateDays = attendanceRecords.filter(record => 
      parseFloat(record.lateMinutes || 0) > 0
    ).length;
    
    const earlyLeaveDays = attendanceRecords.filter(record => 
      parseFloat(record.earlyDepartureMinutes || 0) > 0
    ).length;

    // Tính tổng giờ làm việc
    const totalHours = attendanceRecords.reduce((sum, record) => 
      sum + parseFloat(record.dailyTotalWorkHours || 0), 0
    );

    // Tính giờ overtime
    const overtimeHours = attendanceRecords.reduce((sum, record) => 
      sum + (parseFloat(record.otMinutes || 0) / 60), 0
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
      period: { year: parseInt(year as string), month: parseInt(month as string) }
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
  
  const lateMinutes = parseFloat(record.lateMinutes || 0);
  const earlyDepartureMinutes = parseFloat(record.earlyDepartureMinutes || 0);
  
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

import { Request, Response } from 'express';
import connection from '@/lib/Databases/Connection';

// API xác nhận chấm công
export const confirmAttendance = async (req: Request, res: Response) => {
  try {
    console.log('=== ATTENDANCE DATA RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('=================================');

    const { userId, attendanceType, location, device, confidence, method, timestamp } = req.body;

    // Validate required fields
    if (!userId || !attendanceType) {
      console.log('❌ Missing required fields:', { userId, attendanceType });
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin userId hoặc attendanceType'
      });
    }

    // Log all received data
    console.log('✅ Received attendance data:');
    console.log('- User ID:', userId);
    console.log('- Attendance Type:', attendanceType);
    console.log('- Location:', location);
    console.log('- Device:', device);
    console.log('- Confidence:', confidence);
    console.log('- Method:', method);
    console.log('- Timestamp:', timestamp);
    console.log('- Current Time:', new Date().toISOString());

    // Tạm thời trả về success không lưu database
    const responseData = {
      success: true,
      message: `Chấm công ${attendanceType} thành công cho user ${userId}`,
      data: {
        userId,
        attendanceType,
        timestamp: timestamp || new Date().toISOString(),
        confidence,
        method,
        device,
        location,
        processedAt: new Date().toISOString()
      }
    };

    console.log('✅ Response data:', JSON.stringify(responseData, null, 2));
    
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

    const targetDate = date || new Date().toISOString().split('T')[0];

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

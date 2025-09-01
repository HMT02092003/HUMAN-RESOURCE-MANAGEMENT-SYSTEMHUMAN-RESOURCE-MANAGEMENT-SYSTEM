import { Request, Response } from 'express';
import connection from '@/lib/Databases/Connection';

// API xác nhận chấm công
export const confirmAttendance = async (req: Request, res: Response) => {
  try {
    const { userId, attendanceType, location, device } = req.body;

    if (!userId || !attendanceType) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin userId hoặc attendanceType'
      });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Kiểm tra xem đã chấm công chưa
    const existingAttendance = await connection('time_attendances')
      .where('userId', userId)
      .where('date', today)
      .first();

    if (existingAttendance) {
      if (attendanceType === 'checkin' && existingAttendance.checkInTime) {
        return res.status(409).json({
          success: false,
          message: 'Đã chấm công vào ngày hôm nay'
        });
      }
      
      if (attendanceType === 'checkout' && existingAttendance.checkOutTime) {
        return res.status(409).json({
          success: false,
          message: 'Đã chấm công ra ngày hôm nay'
        });
      }
    }

    // Tạo hoặc cập nhật bản ghi chấm công
    let attendanceRecord;
    
    if (existingAttendance) {
      // Cập nhật bản ghi hiện có
      const updateData: any = {};
      if (attendanceType === 'checkin') {
        updateData.checkInTime = now;
      } else if (attendanceType === 'checkout') {
        updateData.checkOutTime = now;
      }
      updateData.updated_at = now;

      await connection('time_attendances')
        .where('id', existingAttendance.id)
        .update(updateData);

      attendanceRecord = await connection('time_attendances')
        .where('id', existingAttendance.id)
        .first();
    } else {
      // Tạo bản ghi mới
      const newAttendance = {
        userId,
        date: today,
        checkInTime: attendanceType === 'checkin' ? now : null,
        checkOutTime: attendanceType === 'checkout' ? now : null,
        created_at: now,
        updated_at: now,
        location: location || 'Văn phòng chính',
        device: device || 'Mobile App'
      };

      const [newId] = await connection('time_attendances').insert(newAttendance);
      attendanceRecord = await connection('time_attendances').where('id', newId).first();
    }

    // Tính toán thời gian làm việc nếu có cả check-in và check-out
    if (attendanceRecord.checkInTime && attendanceRecord.checkOutTime) {
      const checkInTime = new Date(attendanceRecord.checkInTime);
      const checkOutTime = new Date(attendanceRecord.checkOutTime);
      const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      await connection('time_attendances')
        .where('id', attendanceRecord.id)
        .update({
          dailyTotalWorkHours: workHours,
          updated_at: now
        });
    }

    return res.status(200).json({
      success: true,
      message: `Chấm công ${attendanceType === 'checkin' ? 'vào' : 'ra'} thành công`,
      data: {
        id: attendanceRecord.id,
        userId: attendanceRecord.userId,
        date: attendanceRecord.date,
        checkInTime: attendanceRecord.checkInTime,
        checkOutTime: attendanceRecord.checkOutTime,
        location: attendanceRecord.location,
        device: attendanceRecord.device
      }
    });

  } catch (error) {
    console.error('Error confirming attendance:', error);
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

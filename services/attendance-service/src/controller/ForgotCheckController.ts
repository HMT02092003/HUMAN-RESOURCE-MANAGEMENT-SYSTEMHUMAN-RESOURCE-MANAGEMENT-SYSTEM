/**
 * Forgot Check Controller
 * Xử lý cập nhật chấm công khi đơn quên check được duyệt
 */

import { Request, Response } from 'express';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import { AttendanceCalculationService } from '@/services/AttendanceCalculationService';
import dayjs from 'dayjs';

/**
 * Cập nhật bản ghi chấm công khi đơn quên check được duyệt
 * POST /api/attendance/update-forgot-check
 * Body: {
 *   userId: number,
 *   forgotDate: string (YYYY-MM-DD),
 *   forgotTime: string (HH:mm),
 *   forgotType: 'check-in' | 'check-out'
 * }
 */
export const updateForgotCheck = async (req: Request, res: Response) => {
  try {
    const { userId, forgotDate, forgotTime, forgotType } = req.body;

    // Validation
    if (!userId || !forgotDate || !forgotTime || !forgotType) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: userId, forgotDate, forgotTime, forgotType'
      });
    }

    if (!['check-in', 'check-out'].includes(forgotType)) {
      return res.status(400).json({
        success: false,
        message: 'forgotType phải là check-in hoặc check-out'
      });
    }

    console.log(`📝 Processing forgot check update:`, {
      userId,
      forgotDate,
      forgotTime,
      forgotType
    });

    // Kết hợp ngày và giờ
    const forgotDateTime = dayjs(`${forgotDate} ${forgotTime}`, 'YYYY-MM-DD HH:mm');
    
    // Validate datetime
    if (!forgotDateTime.isValid()) {
      console.error(`❌ Invalid datetime: ${forgotDate} ${forgotTime}`);
      return res.status(400).json({
        success: false,
        message: `Ngày giờ không hợp lệ: ${forgotDate} ${forgotTime}`
      });
    }
    
    console.log(`✅ Valid datetime: ${forgotDateTime.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Tìm bản ghi chấm công trong ngày
    const existingRecord = await TimeAttendanceModel.query()
      .where('userId', userId)
      .whereRaw('DATE(date) = ?', [forgotDate])
      .first();

    let attendanceRecord;

    if (existingRecord) {
      // ========== XỬ LÝ LOGIC PHỨC TẠP ==========
      console.log(`📝 Found existing attendance record #${existingRecord.id}`);
      console.log(`   Current checkInTime: ${existingRecord.checkInTime}`);
      console.log(`   Current checkOutTime: ${existingRecord.checkOutTime}`);
      
      const updateData: any = {};
      
      if (forgotType === 'check-in') {
        if (existingRecord.checkInTime) {
          // Đã có check-in -> Giờ đơn thành check-in mới, giờ cũ thành check-out
          console.log(`⚠️ Already has check-in time. Converting old check-in to check-out`);
          updateData.checkInTime = forgotDateTime.format('YYYY-MM-DD HH:mm:ss');
          // Convert old check-in time to string format
          updateData.checkOutTime = dayjs(existingRecord.checkInTime).format('YYYY-MM-DD HH:mm:ss');
        } else {
          // Chưa có check-in -> Cập nhật bình thường
          console.log(`✅ Setting new check-in time`);
          updateData.checkInTime = forgotDateTime.format('YYYY-MM-DD HH:mm:ss');
        }
      } else {
        // forgotType === 'check-out'
        if (existingRecord.checkOutTime) {
          // Đã có check-out -> Giờ đơn thành check-out mới, giờ cũ thành check-in
          console.log(`⚠️ Already has check-out time. Converting old check-out to check-in`);
          updateData.checkOutTime = forgotDateTime.format('YYYY-MM-DD HH:mm:ss');
          // Convert old check-out time to string format
          updateData.checkInTime = dayjs(existingRecord.checkOutTime).format('YYYY-MM-DD HH:mm:ss');
        } else {
          // Chưa có check-out -> Cập nhật bình thường
          console.log(`✅ Setting new check-out time`);
          updateData.checkOutTime = forgotDateTime.format('YYYY-MM-DD HH:mm:ss');
        }
      }

      console.log(`📝 Update data:`, updateData);

      attendanceRecord = await TimeAttendanceModel.query()
        .patchAndFetchById(existingRecord.id, updateData);
        
    } else {
      // Tạo bản ghi mới
      console.log(`📝 No existing record found, creating new attendance record...`);
      
      const createData: any = {
        userId,
        date: forgotDateTime.format('YYYY-MM-DD HH:mm:ss'),
      };
      
      if (forgotType === 'check-in') {
        createData.checkInTime = forgotDateTime.format('YYYY-MM-DD HH:mm:ss');
        console.log(`✅ Setting check-in time: ${createData.checkInTime}`);
      } else {
        createData.checkOutTime = forgotDateTime.format('YYYY-MM-DD HH:mm:ss');
        console.log(`✅ Setting check-out time: ${createData.checkOutTime}`);
      }

      attendanceRecord = await TimeAttendanceModel.query().insert(createData);
    }

    // Tính toán lại các thông số chấm công
    console.log(`🔄 Recalculating attendance metrics...`);
    console.log(`📊 Input for calculation:`, {
      checkInTime: attendanceRecord.checkInTime,
      checkOutTime: attendanceRecord.checkOutTime,
      date: forgotDate,
      userId: userId
    });
    
    const calculatedData = await AttendanceCalculationService.calculateAttendance(
      attendanceRecord.checkInTime,
      attendanceRecord.checkOutTime,
      forgotDate,  // date parameter
      userId       // userId parameter
    );

    console.log(`📊 Calculated data:`, calculatedData);

    // Cập nhật lại với dữ liệu đã tính toán
    const finalRecord = await TimeAttendanceModel.query()
      .patchAndFetchById(attendanceRecord.id, {
        dailyTotalWorkHours: calculatedData.workHours,
        lateMinutes: calculatedData.lateMinutes,
        earlyDepartureMinutes: calculatedData.earlyDepartureMinutes,
        otMinutes: calculatedData.otMinutes,
        lateArrivalPenalty: calculatedData.latePenaltyAmount,
        earlyLeavePenalty: calculatedData.earlyLeavePenaltyAmount,
        dailyWorkingUnit: calculatedData.workHours / 8, // Assuming 8 hours = 1 unit
      });

    console.log(`✅ Attendance record updated successfully!`);
    console.log(`📊 Final record:`, finalRecord);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật chấm công thành công',
      data: finalRecord
    });

  } catch (error: any) {
    console.error('❌ Error updating forgot check:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chấm công',
      error: error.message
    });
  }
};

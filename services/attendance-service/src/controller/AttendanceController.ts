import { Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { validate } from '@/utils/validation-utility';
import axios from 'axios';

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
      
      // Tính toán dựa vào settings cho check-in (bao gồm cả penalty nếu đi muộn)
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
        lateArrivalPenalty: calculation.latePenaltyAmount, // Lưu penalty đi muộn ngay khi check-in
        otWorkingUnit: 0.0,
        otMinutes: 0.0, // Không tính OT ở đây
        otSalary: 0.0,   // Không tính lương OT ở đây
        created_at: currentTime,
        updated_at: currentTime
      };

      result = await TimeAttendanceModel.query().insert(updateData);
      console.log('📝 CHECK-IN: Creating new attendance record');
      console.log('- Late minutes:', calculation.lateMinutes);
      console.log('- Late penalty amount (VND):', calculation.latePenaltyAmount);
      
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

// Helper: Lấy danh sách đơn đã được duyệt
async function getApprovedApplications(
  userId: number,
  year: number,
  month: number
): Promise<any[]> {
  try {
    const APPLICATION_SERVICE_URL = process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004';
    
    const response = await axios.get(
      `${APPLICATION_SERVICE_URL}/api/applications/user/${userId}/approved`,
      { params: { year, month } }
    );
    
    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching approved applications:', error.message);
    return [];
  }
}

// Helper: Check xem ngày có đơn nghỉ/công tác không
function checkDateHasApplication(
  date: string,
  applications: any[]
): { type: string | null; info: any } {
  for (const app of applications) {
    const appData = app.data;
    
    // Check đơn nghỉ phép (leave)
    if (app.type === 'leave') {
      if (isDateInRange(date, appData)) {
        return {
          type: 'leave',
          info: {
            leaveType: appData.applicationCategory || 'leave',
            leaveTypeName: appData.applicationCategory === 'leave' ? 'Nghỉ phép (có lương)' : 'Nghỉ không phép (không lương)',
            hasSalary: appData.applicationCategory === 'leave',
            reason: appData.reason || appData.description || 'Nghỉ phép',
            applicationId: app.id
          }
        };
      }
    }
    
    // Check đơn công tác (business-trip)
    if (app.type === 'business-trip') {
      if (isDateInRange(date, appData)) {
        return {
          type: 'business_trip',
          info: {
            destination: appData.destination || appData.location || 'Chưa rõ địa điểm',
            reason: appData.reason || 'Công tác',
            hasSalary: true, // Công tác luôn có lương
            applicationId: app.id
          }
        };
      }
    }
    
    // Check đơn quên check-in/out (forgot-check)
    if (app.type === 'forgot-check') {
      if (isDateInRange(date, appData)) {
        return {
          type: 'forgot_check',
          info: {
            reason: appData.reason || 'Quên chấm công',
            applicationId: app.id
          }
        };
      }
    }
  }
  
  return { type: null, info: null };
}

// Helper: Check xem ngày có nằm trong range của đơn không
function isDateInRange(date: string, appData: any): boolean {
  const checkDate = dayjs(date);
  
  // Trường hợp nhiều ngày
  if (appData.startDate && appData.endDate) {
    const startDate = dayjs(appData.startDate);
    const endDate = dayjs(appData.endDate);
    return (checkDate.isSame(startDate, 'day') || checkDate.isAfter(startDate, 'day')) &&
           (checkDate.isSame(endDate, 'day') || checkDate.isBefore(endDate, 'day'));
  }
  
  // Trường hợp 1 ngày
  if (appData.date && dayjs(appData.date).isSame(checkDate, 'day')) {
    return true;
  }
  
  // Trường hợp có requestedDates array
  if (appData.requestedDates && Array.isArray(appData.requestedDates)) {
    return appData.requestedDates.some((reqDate: any) => 
      dayjs(reqDate.date || reqDate).isSame(checkDate, 'day')
    );
  }
  
  return false;
}

// API lấy dữ liệu chấm công theo tháng (tích hợp đơn xin nghỉ/công tác)
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

    // Lấy dữ liệu chấm công
    const attendanceRecords = await TimeAttendanceModel.query()
      .where('userId', params['userId'])
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    // Lấy danh sách đơn đã được duyệt
    const approvedApplications = await getApprovedApplications(
      params['userId'],
      params['year'],
      params['month']
    );

    console.log(`📋 Found ${approvedApplications.length} approved applications`);

    // Format dữ liệu cho frontend
    const formattedData = attendanceRecords.map(record => {
      const recordDate = dayjs(record.date).format('YYYY-MM-DD');
      
      // Check xem ngày này có đơn được duyệt không
      const appCheck = checkDateHasApplication(recordDate, approvedApplications);
      
      const checkInTime = record.checkInTime ? dayjs(record.checkInTime) : null;
      const checkOutTime = record.checkOutTime ? dayjs(record.checkOutTime) : null;
      
      // Nếu có đơn nghỉ phép hoặc công tác -> trả về thông tin đơn thay vì chấm công
      if (appCheck.type === 'leave') {
        return {
          id: record.id,
          userId: record.userId,
          date: recordDate,
          type: 'leave',
          status: 'approved_leave',
          ...appCheck.info,
          // Vẫn giữ thông tin chấm công nếu có (để hiển thị chi tiết)
          hasAttendance: !!record.checkInTime,
          attendanceData: record.checkInTime ? {
            checkIn: checkInTime ? checkInTime.format('HH:mm') : null,
            checkOut: checkOutTime ? checkOutTime.format('HH:mm') : null,
            workHours: parseFloat(record.dailyTotalWorkHours?.toString() || '0')
          } : null
        };
      }
      
      if (appCheck.type === 'business_trip') {
        return {
          id: record.id,
          userId: record.userId,
          date: recordDate,
          type: 'business_trip',
          status: 'business_trip',
          ...appCheck.info,
          // Vẫn giữ thông tin chấm công nếu có
          hasAttendance: !!record.checkInTime,
          attendanceData: record.checkInTime ? {
            checkIn: checkInTime ? checkInTime.format('HH:mm') : null,
            checkOut: checkOutTime ? checkOutTime.format('HH:mm') : null,
            workHours: parseFloat(record.dailyTotalWorkHours?.toString() || '0')
          } : null
        };
      }
      
      // Không có đơn -> trả về dữ liệu chấm công bình thường
      return {
        id: record.id,
        userId: record.userId,
        date: recordDate,
        type: 'attendance',
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

/**
 * Xử lý đơn tăng ca đã được duyệt
 * POST /api/attendance/process-overtime
 * Body: { userId, overtimeDate, startTime, overtimeHours }
 */
export const processOvertimeApplication = async (req: Request, res: Response) => {
  try {
    console.log('📝 Processing overtime application approval...');
    console.log('Request body:', req.body);

    const { userId, overtimeDate, startTime, overtimeHours } = req.body;

    if (!userId || !overtimeDate || !startTime || !overtimeHours) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (userId, overtimeDate, startTime, overtimeHours)'
      });
    }

    // Parse ngày và thời gian
    const formattedDate = dayjs(overtimeDate).format('YYYY-MM-DD');
    console.log(`🔍 Checking attendance record for user ${userId} on date ${formattedDate}`);

    // Tìm bản ghi chấm công của ngày đó
    const attendanceRecord = await TimeAttendanceModel.query()
      .where('userId', userId)
      .where('date', formattedDate)
      .first();

    if (!attendanceRecord) {
      console.log('❌ No attendance record found for this date');
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy bản ghi chấm công cho ngày này. Nhân viên phải chấm công trước khi được duyệt tăng ca.'
      });
    }

    if (!attendanceRecord.checkOutTime) {
      console.log('❌ Employee has not checked out yet');
      return res.status(400).json({
        success: false,
        message: 'Nhân viên chưa checkout. Không thể tính tăng ca.'
      });
    }

    console.log('✅ Found attendance record:', {
      checkInTime: attendanceRecord.checkInTime,
      checkOutTime: attendanceRecord.checkOutTime
    });

    // Tính toán thời gian tăng ca thực tế
    const checkOutTime = dayjs(attendanceRecord.checkOutTime);
    const requestedStartTime = dayjs(`${formattedDate} ${startTime}`);
    const requestedEndTime = requestedStartTime.add(overtimeHours, 'hour');

    console.log('⏰ Time calculations:', {
      checkOutTime: checkOutTime.format('YYYY-MM-DD HH:mm:ss'),
      requestedStartTime: requestedStartTime.format('YYYY-MM-DD HH:mm:ss'),
      requestedEndTime: requestedEndTime.format('YYYY-MM-DD HH:mm:ss')
    });

    // Kiểm tra xem thời gian checkout có đủ thời gian tăng ca không
    // Logic: checkOutTime phải >= requestedEndTime hoặc ít nhất >= requestedStartTime + 80% thời gian đăng ký
    const minRequiredTime = requestedStartTime.add(overtimeHours * 0.8, 'hour'); // 80% thời gian tăng ca
    let actualOvertimeHours = 0;

    if (checkOutTime.isBefore(requestedStartTime)) {
      console.log('❌ Check out time is before overtime start time');
      return res.status(400).json({
        success: false,
        message: 'Thời gian checkout không đủ để được tính tăng ca. Nhân viên checkout trước giờ bắt đầu tăng ca.'
      });
    }

    if (checkOutTime.isBefore(minRequiredTime)) {
      console.log('⚠️ Check out time is less than minimum required time');
      return res.status(400).json({
        success: false,
        message: `Thời gian checkout không đủ để được tính tăng ca. Cần ít nhất ${overtimeHours * 0.8} giờ tăng ca.`
      });
    }

    // Tính số giờ tăng ca thực tế
    if (checkOutTime.isAfter(requestedEndTime) || checkOutTime.isSame(requestedEndTime)) {
      // Đủ thời gian -> tính full
      actualOvertimeHours = overtimeHours;
    } else {
      // Tính theo thời gian thực tế
      actualOvertimeHours = checkOutTime.diff(requestedStartTime, 'minute') / 60;
      actualOvertimeHours = Math.max(0, actualOvertimeHours); // Không âm
    }

    console.log(`💰 Calculated actual overtime hours: ${actualOvertimeHours}`);

    // Tính lương tăng ca (lấy từ AttendanceCalculationService)
    const overtimeSalary = await AttendanceCalculationService.calculateOvertimeSalary(
      userId,
      actualOvertimeHours
    );

    console.log(`💰 Calculated overtime salary: ${overtimeSalary}`);

    // Cập nhật bản ghi chấm công
    await TimeAttendanceModel.query()
      .where('userId', userId)
      .where('date', formattedDate)
      .patch({
        otWorkingUnit: 1, // Đánh dấu có 1 lần tăng ca
        otMinutes: actualOvertimeHours * 60, // Convert to minutes
        otSalary: overtimeSalary,
        updated_at: dayjs().toISOString()
      });

    console.log('✅ Updated attendance record with overtime data');

    return res.json({
      success: true,
      message: 'Xử lý đơn tăng ca thành công',
      data: {
        userId,
        date: formattedDate,
        requestedOvertimeHours: overtimeHours,
        actualOvertimeHours,
        overtimeSalary,
        checkOutTime: checkOutTime.format('YYYY-MM-DD HH:mm:ss'),
        requestedStartTime: requestedStartTime.format('YYYY-MM-DD HH:mm:ss'),
        requestedEndTime: requestedEndTime.format('YYYY-MM-DD HH:mm:ss')
      },
      timestamp: dayjs().format()
    });

  } catch (error) {
    console.error('❌ Error processing overtime application:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý đơn tăng ca: ' + (error as Error).message,
      timestamp: dayjs().format()
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

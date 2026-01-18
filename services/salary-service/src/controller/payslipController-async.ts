/**
 * Payslip Controller - Async Processing với RabbitMQ
 * 
 * Flow:
 * 1. Client gửi request tính lương (bulk hoặc single)
 * 2. Server tạo payslip record với status = PENDING
 * 3. Server đẩy message vào RabbitMQ queue
 * 4. Server trả về ngay response "Processing started"
 * 5. Worker xử lý tính lương ở background
 * 6. Worker gửi notification qua Socket.IO khi xong
 */

import { Request, Response, NextFunction } from 'express';
import MonthlyPayslip from '../Model/MonthlyPayslip';
import rabbitmqManager from '../utils/rabbitmq.js';
import { getUserData, getUserId } from '../utils/getUserData';
import AttendanceService from '../integrations/AttendanceService';

/**
 * Tính lương ASYNC cho 1 user
 * POST /api/payslips/calculate-async/:userId?year=YYYY&month=M
 */
export const calculatePayslipAsync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    
    const authUserId = getUserId(req);
    const userData = getUserData(req);
    
    // Check existing payslip
    const existing = await MonthlyPayslip.query().findOne({ user_id: userId, year, month });
    if (existing) {
      return res.status(400).json({ 
        success: false,
        message: 'Payslip already exists for this user/month' 
      });
    }

    // Send message to queue; do NOT create DB record here.
    // Worker will create/update payslip after calculation completes.
    const queueResult = await rabbitmqManager.sendToQueue('salary_calculation_queue', {
      employeeId: Number(userId),
      requestedBy: authUserId, // Người request để gửi notification
      month,
      year,
      forceRecalculate: false
    });

    console.log(`✅ [calculatePayslipAsync] Queued salary calculation for user ${userId}`);

    // Return queued response
    return res.status(202).json({
      success: true,
      message: 'Payslip calculation queued. Worker will create payslip after processing.',
      data: {
        payslipId: null,
        userId,
        year,
        month,
        status: 'QUEUED',
        queueMode: queueResult.mode // 'cloud', 'local', 'database_fallback', or 'sync-fallback'
      }
    });

  } catch (err: any) {
    console.error('❌ [calculatePayslipAsync] Error:', err);
    next(err);
  }
};

/**
 * Tính lương ASYNC BULK cho nhiều user trong 1 tháng
 * POST /api/payslips/calculate-bulk-async
 * Body: { year: 2026, month: 1, userIds: [1, 2, 3], forceRecalculate: false }
 * userIds: [] (empty) = tính cho tất cả users có attendance approved
 * forceRecalculate: true = Xóa payslip cũ và tính lại
 */
export const calculateBulkAsync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month, userIds, forceRecalculate = false } = req.body;
    
    // Validation - userIds có thể là empty array
    if (!year || !month || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: year, month, userIds (array)'
      });
    }

    const authUserId = getUserId(req);
    const userData = getUserData(req);
    const authToken = req.headers.authorization;
    
    const results = [];
    const errors = [];

    // Nếu userIds empty, lấy tất cả users có attendance approved cho tháng này
    let targetUserIds = userIds;
    if (userIds.length === 0) {
      try {
        console.log(`📊 Fetching users with approved attendance for ${month}/${year}...`);
        
        // Gọi Attendance Service để lấy monthly attendance
        const attendanceData = await AttendanceService.getMonthlyAttendanceByMonth(
          Number(year), 
          Number(month),
          authToken,
          userData
        );
        
        // Lọc users có isApproved = true từ monthly_attendances
        // Response structure: { success: true, data: { results: [...], total: x } }
        if (attendanceData?.data?.results && Array.isArray(attendanceData.data.results)) {
          // Debug log để xem dữ liệu trả về
          console.log('📝 Sample attendance record:', JSON.stringify(attendanceData.data.results[0], null, 2));
          
          targetUserIds = attendanceData.data.results
            .filter((att: any) => att.isApproved === true)
            .map((att: any) => {
              // Thử nhiều field name có thể có
              return att.user_id || att.userId || att.employee_id || att.employeeId;
            })
            .filter((id: any) => id != null); // Loại bỏ null/undefined
          
          console.log(`✅ Found ${targetUserIds.length} users with approved attendance`);
          console.log(`📋 User IDs:`, targetUserIds.slice(0, 5), '...'); // In 5 IDs đầu
        } else {
          console.warn('⚠️  No attendance data found or invalid format');
          targetUserIds = [];
        }
        
      } catch (err: any) {
        console.error('❌ Error fetching attendance:', err.message);
        return res.status(500).json({
          success: false,
          message: `Cannot fetch attendance data: ${err.message}`
        });
      }
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found to calculate salary. Please ensure attendance is approved.'
      });
    }

    // Support queue modes:
    // - 'bulk' (default): controller resolves userIds and sends them in one message
    // - 'individual': controller sends one message per user
    // - 'server': controller sends a single job (year/month) and worker will query attendance to decide which users to process
    const queueMode = process.env.SALARY_QUEUE_MODE || 'bulk';

    if (queueMode === 'individual') {
      console.log(`📤 Queue mode=individual — sending ${targetUserIds.length} messages`);
      let queued = 0;
      for (const uid of targetUserIds) {
        await rabbitmqManager.sendToQueue('salary_calculation_queue', {
          year: Number(year),
          month: Number(month),
          userIds: [uid],
          requestedBy: authUserId,
          forceRecalculate: !!forceRecalculate,
          authToken: authToken
        });
        queued++;
      }

      console.log(`✅ [calculateBulkAsync] Queued ${queued} individual messages for ${month}/${year}`);
      return res.status(202).json({
        success: true,
        message: `Queued ${queued} individual salary calculation messages for ${month}/${year}`,
        data: { queued, year, month, queueMode }
      });
    }

    if (queueMode === 'server') {
      // Send a single job; worker will query AttendanceService to get target users
      const queueResult = await rabbitmqManager.sendToQueue('salary_calculation_queue', {
        year: Number(year),
        month: Number(month),
        // no userIds
        requestedBy: authUserId,
        forceRecalculate: !!forceRecalculate,
        authToken: authToken
      });

      console.log(`✅ [calculateBulkAsync] Queued server-driven salary job for ${month}/${year}`);
      return res.status(202).json({
        success: true,
        message: `Server-driven salary job queued for ${month}/${year}`,
        data: { year, month, queueMode: 'server' }
      });
    }

    // Default: bulk mode — single message containing all userIds
    const queueResult = await rabbitmqManager.sendToQueue('salary_calculation_queue', {
      year: Number(year),
      month: Number(month),
      userIds: targetUserIds,
      requestedBy: authUserId,
      forceRecalculate: !!forceRecalculate,
      authToken: authToken
    });

    console.log(`✅ [calculateBulkAsync] Queued salary calculation for ${targetUserIds.length} users in ${month}/${year}`);

    return res.status(202).json({
      success: true,
      message: `Bulk calculation queued for ${targetUserIds.length} employees in ${month}/${year}`,
      data: {
        queued: targetUserIds.length,
        failed: 0,
        year,
        month,
        totalUsers: targetUserIds.length,
        queueMode: queueResult.mode
      }
    });

  } catch (err: any) {
    console.error('❌ [calculateBulkAsync] Error:', err);
    next(err);
  }
};

/**
 * Lấy trạng thái tính lương
 * GET /api/payslips/status/:payslipId
 */
export const getPayslipStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payslipId = req.params.payslipId;
    
    const payslip = await MonthlyPayslip.query().findById(payslipId);
    
    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: payslip.id,
        userId: payslip.user_id,
        year: payslip.year,
        month: payslip.month,
        status: payslip.status, // PENDING, PROCESSING, WAITING_APPROVAL, APPROVED, FAILED
        grossSalary: payslip.gross_salary,
        netSalary: payslip.net_salary,
        createdAt: payslip.created_at,
        updatedAt: payslip.updated_at
      }
    });

  } catch (err: any) {
    console.error('❌ [getPayslipStatus] Error:', err);
    next(err);
  }
};

/**
 * Attendance Service API Routes - Gateway Authenticated
 * All routes go through API Gateway which validates JWT and injects x-user-data header
 * No authentication middleware needed at service level
 */
import { Router, Request, Response } from 'express';
import {
  getAllMonthlyAttendance,
  getUserMonthlyFull,
  recordAttendance,
  approveMonthlyAttendance,
  approveAllByMonth,
  calculateAndSaveMonthly,
  bulkCalculateMonthly,
  updateForgotCheck,
  getTimeAttendancesController,
  getDailyAttendanceForExport,
  getMonthlySummariesForExport,
  getDailyAttendanceByScope
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings,
  updateSettingByKey,
  getSettingByKey,
} from '../src/controller/SettingsController.js';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../src/controller/HolidayController';
import { ShiftController } from '../src/controller/ShiftController.js';
import { getDashboardStats } from '../src/controller/DashboardController';

const router = Router();

// small helper: wrap async controller methods so their Promise<Response> doesn't confuse Express typings
const wrap = (fn: any) => {
  return (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).then(() => { }).catch(next);
  };
};

// Middleware to disable cache for shift/schedule endpoints (prevent 304 Not Modified)
const noCache = (_req: Request, res: Response, next: any) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
};

// ===================================
// ATTENDANCE ROUTES - USED BY FRONTEND
// ===================================

// API: Lấy thống kê dashboard chấm công
// GET /api/dashboard/stats?year=2025&month=10
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  await getDashboardStats(req, res);
});

// API: Lấy toàn bộ thông tin chấm công tháng (monthly-full)
// GET /api/user/:userId/monthly-full?year=2025&month=10
router.get('/user/:userId/monthly-full', noCache, async (req: Request, res: Response) => {
  await getUserMonthlyFull(req, res);
});

// API: Lấy bảng công chi tiết theo ngày (cho xuất Excel) - SỬ DỤNG SCOPE
// GET /api/attendance/daily-attendance-export?month=2025-12
router.get('/daily-attendance-export', async (req: Request, res: Response) => {
  await getDailyAttendanceForExport(req, res);
});

// API: Lấy bảng chấm công hàng ngày theo scope (cho Monitors)
// GET /api/attendance/daily-attendance-by-scope
router.get('/daily-attendance-by-scope', async (req: Request, res: Response) => {
  await getDailyAttendanceByScope(req, res);
});

// API: Lấy TẤT CẢ bảng duyệt theo scope (cho xuất Excel) - KHÔNG PHÂN TRANG
// GET /api/attendance/monthly-summaries-export?month=2025-12
router.get('/monthly-summaries-export', async (req: Request, res: Response) => {
  await getMonthlySummariesForExport(req, res);
});

// API: Chấm công tự động (check-in/check-out)
// POST /api/attendance/record (from gateway) -> /api/record (in service)
router.post('/record', async (req: Request, res: Response) => {
  await recordAttendance(req, res);
});

// API: Cập nhật chấm công từ đơn quên check in/out
// POST /api/attendance/update-forgot-check (from gateway) -> /api/update-forgot-check (in service)
router.post('/update-forgot-check', async (req: Request, res: Response) => {
  await updateForgotCheck(req, res);
});

// Admin helper: calculate and upsert monthly_attendances for a user/month
router.post('/admin/calculate-monthly/:userId', async (req: Request, res: Response) => {
  await calculateAndSaveMonthly(req, res as any);
});

// Admin helper: bulk calculate monthly attendance for multiple users
router.post('/admin/bulk-calculate-monthly', async (req: Request, res: Response) => {
  await bulkCalculateMonthly(req, res as any);
});


router.get('/attendance/monthly-attendance', async (req: Request, res: Response) => {
  await getAllMonthlyAttendance(req, res);
});

// Fast endpoint: get monthly attendance rows filtered by month and approval flag
router.get('/attendance/monthly-attendance/by-month', (req: Request, res: Response, next) => {
  (async () => {
    const controller = await import('@/controller/AttendanceController');
    return controller.getMonthlyAttendanceByMonth(req, res);
  })().catch(next);
});

router.post('/approve-monthly', async (req: Request, res: Response) => {
  await approveMonthlyAttendance(req, res);
});

// POST /api/attendance/approve-month - approve all attendances for a specific month (with scope)
router.post('/approve-month', async (req: Request, res: Response) => {
  await approveAllByMonth(req, res);
});

// ===================================
// WORKING DAYS CALCULATION (for salary-service)
// ===================================

// POST /api/attendance/calculate-standard-working-days
// Body: { month: "2025-01" }
// Response: { standardWorkingDays: 22 }
// Note: No auth required - called by salary-service
router.post('/calculate-standard-working-days', (req: Request, res: Response, next) => {
  (async () => {
    try {
      const { month } = req.body;
      if (!month) {
        res.status(400).json({ error: 'Missing month parameter (format: YYYY-MM)' });
        return;
      }

      const [year, monthNum] = month.split('-').map(Number);
      if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
        res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
        return;
      }

      // Import helper
      const { calculateStandardWorkingDaysInMonth } = await import('../src/services/attendance/WorkingDaysHelper');
      const standardWorkingDays = await calculateStandardWorkingDaysInMonth(month);

      // minimal log for operations invoked by other services
      console.log('Calculated standard working days', { month, standardWorkingDays });

      res.json({ standardWorkingDays });
    } catch (error: any) {
      console.error('❌ [attendance-service] Error calculating standard working days:', error);
      res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  })().catch(next);
});

// GET/POST /api/attendance/monthly-summaries-by-scope - return monthly_attendances for users in scope
const handleMonthlySummariesByScope = async (req: any, res: any) => {
  // Keep a concise trace of route usage without dumping request body
  console.log('Route: /monthly-summaries-by-scope', { method: req.method, query: req.query });
  const controller = await import('@/controller/AttendanceController');
  return controller.getMonthlySummariesByScopeController(req, res as any);
};

router.route('/monthly-summaries-by-scope')
  .get((req: any, res: any, next: any) => { handleMonthlySummariesByScope(req, res).catch(next); })
  .post((req: any, res: any, next: any) => { handleMonthlySummariesByScope(req, res).catch(next); });

// GET /api/attendance/time-attendances - Lấy danh sách chấm công chi tiết từng ngày
router.get('/time-attendances', async (req: Request, res: Response) => {
  await getTimeAttendancesController(req, res);
});

// ===================================
// SETTINGS ROUTES
// ===================================

// GET /api/settings - Lấy tất cả settings
router.get('/settings', async (req: Request, res: Response) => {
  await getSettings(req, res);
});

// POST /api/settings - Cập nhật settings
router.post('/settings', async (req: Request, res: Response) => {
  await updateSettings(req, res);
});

// POST /api/settings/key - Cập nhật single setting
router.post('/settings/key', async (req: Request, res: Response) => {
  await updateSettingByKey(req, res as any);
});

// GET /api/settings/:key - Lấy setting theo key
router.get('/settings/:key', async (req: Request, res: Response) => {
  await getSettingByKey(req, res);
});

// ===================================
// CONVENIENCE ROUTES - Setting shortcuts
// ===================================

router.post('/settings/working-hours', async (req: Request, res: Response) => {
  req.body = { key: 'WorkingHours', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/lunch-break', async (req: Request, res: Response) => {
  req.body = { key: 'LunchBreak', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/overtime-rate', async (req: Request, res: Response) => {
  req.body = { key: 'OvertimeRate', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/holiday-rate', async (req: Request, res: Response) => {
  req.body = { key: 'HolidayRate', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/penalty-rate', async (req: Request, res: Response) => {
  req.body = { key: 'PenaltyRate', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/unauthorized-absence-penalty-rate', async (req: Request, res: Response) => {
  req.body = { key: 'UnauthorizedAbsencePenaltyRate', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/working-days', async (req: Request, res: Response) => {
  req.body = { key: 'WorkingDays', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

// ===================================
// SHIFT MANAGEMENT ROUTES
// ===================================

// Shift Templates (Mẫu ca)
router.get('/shifts/paginated', wrap(ShiftController.getAllShiftsPaginated)); // Must be before /shifts/:id
router.get('/shifts', wrap(ShiftController.getAllShifts));
router.get('/shifts/:id', wrap(ShiftController.getShiftById));
router.post('/shifts', wrap(ShiftController.createShift));
router.put('/shifts/:id', wrap(ShiftController.updateShift));
router.delete('/shifts/:id', wrap(ShiftController.deleteShift));
router.post('/shifts/bulk-delete', wrap(ShiftController.bulkDeleteShifts));

// Employee Schedules (Lịch đăng ký ca) - Apply noCache middleware to prevent 304 responses
router.get('/schedules/my', noCache, wrap(ShiftController.getMySchedules));
router.get('/schedules/my/paginated', noCache, wrap(ShiftController.getMySchedulesPaginated));
router.get('/schedules/pending', noCache, wrap(ShiftController.getPendingSchedules));
router.get('/schedules/stats/:year/:month', noCache, wrap(ShiftController.getMonthlyStats));
// Schedule Approval Management (static routes) should be defined before '/schedules/:id' to avoid
// Express treating 'approval' as a dynamic :id parameter.
router.get('/schedules/approval', noCache, wrap(ShiftController.getSchedulesForApproval));
router.post('/schedules/approve', noCache, wrap(ShiftController.bulkApproveSchedules));
router.post('/schedules/approve-month', noCache, wrap(ShiftController.approveMonthSchedules));
router.post('/schedules/delete', noCache, wrap(ShiftController.bulkDeleteSchedules));

// Dynamic schedule route (by id)
router.get('/schedules/:id', noCache, wrap(ShiftController.getScheduleById));
router.post('/schedules', noCache, wrap(ShiftController.createSchedule));
router.post('/schedules/bulk', noCache, wrap(ShiftController.bulkCreateSchedules));
router.put('/schedules/:id', noCache, wrap(ShiftController.updateSchedule));
router.delete('/schedules/:id', noCache, wrap(ShiftController.cancelSchedule));
router.post('/schedules/:id/approve', noCache, wrap(ShiftController.approveSchedule));
router.post('/schedules/:id/reject', noCache, wrap(ShiftController.rejectSchedule));

// ===================================
// HOLIDAYS ROUTES
// ===================================
router.get('/holidays', async (req: Request, res: Response) => {
  await getHolidays(req, res);
});

router.post('/holidays', async (req: Request, res: Response) => {
  await createHoliday(req, res);
});

router.put('/holidays/:id', async (req: Request, res: Response) => {
  await updateHoliday(req, res);
});

router.delete('/holidays/:id', async (req: Request, res: Response) => {
  await deleteHoliday(req, res);
});

export default router;

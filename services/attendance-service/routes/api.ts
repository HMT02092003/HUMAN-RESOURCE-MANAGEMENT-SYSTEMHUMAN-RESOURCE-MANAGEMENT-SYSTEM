/**
 * Attendance Service API Routes - Simplified & Clean
 * Chỉ giữ các API đang được sử dụng bởi frontend
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../src/middleware/authenticateToken';
import AttendanceCalculationService from '../src/services/attendance/AttendanceCalculationService';
import { 
  getAllMonthlyAttendance, 
  getUserMonthlyFull, 
  recordAttendance, 
  approveMonthlyAttendance,
  approveAllByMonth, 
  calculateAndSaveMonthly,
  bulkCalculateMonthly,
  updateForgotCheck
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings,
  updateSettingByKey,
  getSettingByKey,
}  from '../src/controller/SettingsController.js';
import { getHolidays } from '../src/controller/HolidayController';
import { ShiftController } from '../src/controller/ShiftController.js';

const router = Router();

// small helper: wrap async controller methods so their Promise<Response> doesn't confuse Express typings
const wrap = (fn: any) => {
  return (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).then(() => {}).catch(next);
  };
};

// Middleware to disable cache for shift/schedule endpoints (prevent 304 Not Modified)
const noCache = (req: Request, res: Response, next: any) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
};

// ===================================
// ATTENDANCE ROUTES - USED BY FRONTEND
// ===================================

// API: Lấy toàn bộ thông tin chấm công tháng (monthly-full)
// GET /api/user/:userId/monthly-full?year=2025&month=10
router.get('/user/:userId/monthly-full', authenticateToken, async (req: Request, res: Response) => {
  await getUserMonthlyFull(req, res);
});

// API: Chấm công tự động (check-in/check-out)
// POST /api/attendance/record (from gateway) -> /api/record (in service)
router.post('/record', authenticateToken, async (req: Request, res: Response) => {
  await recordAttendance(req, res);
});

// API: Cập nhật chấm công từ đơn quên check in/out
// POST /api/attendance/update-forgot-check (from gateway) -> /api/update-forgot-check (in service)
router.post('/update-forgot-check', authenticateToken, async (req: Request, res: Response) => {
  await updateForgotCheck(req, res);
});

// Admin helper: calculate and upsert monthly_attendances for a user/month
router.post('/admin/calculate-monthly/:userId', authenticateToken, async (req: Request, res: Response) => {
  await calculateAndSaveMonthly(req, res as any);
});

// Admin helper: bulk calculate monthly attendance for multiple users
router.post('/admin/bulk-calculate-monthly', authenticateToken, async (req: Request, res: Response) => {
  await bulkCalculateMonthly(req, res as any);
});


router.get('/monthly-attendance', authenticateToken, async (req: Request, res: Response) => {
  await getAllMonthlyAttendance(req, res);
});

// Fast endpoint: get monthly attendance rows filtered by month and approval flag
router.get('/monthly-attendance/by-month', authenticateToken, (req: Request, res: Response, next) => {
  (async () => {
    const controller = await import('@/controller/AttendanceController');
    return controller.getMonthlyAttendanceByMonth(req, res);
  })().catch(next);
});

router.post('/approve-monthly', authenticateToken, async (req: Request, res: Response) => {
  await approveMonthlyAttendance(req, res);
});

// POST /api/attendance/approve-month - approve all attendances for a specific month (with scope)
router.post('/approve-month', authenticateToken, async (req: Request, res: Response) => {
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
  .get(authenticateToken, (req: any, res: any, next: any) => { handleMonthlySummariesByScope(req, res).catch(next); })
  .post(authenticateToken, (req: any, res: any, next: any) => { handleMonthlySummariesByScope(req, res).catch(next); });

// ===================================
// SETTINGS ROUTES
// ===================================

// GET /api/settings - Lấy tất cả settings
router.get('/settings', authenticateToken, async (req: Request, res: Response) => {
  await getSettings(req, res);
});

// POST /api/settings - Cập nhật settings
router.post('/settings', authenticateToken, async (req: Request, res: Response) => {
  await updateSettings(req, res);
});

// POST /api/settings/key - Cập nhật single setting
router.post('/settings/key', authenticateToken, async (req: Request, res: Response) => {
  await updateSettingByKey(req, res as any);
});

// GET /api/settings/:key - Lấy setting theo key
router.get('/settings/:key', authenticateToken, async (req: Request, res: Response) => {
  await getSettingByKey(req, res);
});

// ===================================
// CONVENIENCE ROUTES - Setting shortcuts
// ===================================

router.post('/settings/working-hours', authenticateToken, async (req: Request, res: Response) => {
  req.body = { key: 'WorkingHours', value: req.body.value };
  await updateSettingByKey(req, res as any);
});

router.post('/settings/lunch-break', authenticateToken, async (req: Request, res: Response) => {
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
router.get('/shifts/paginated', authenticateToken, wrap(ShiftController.getAllShiftsPaginated)); // Must be before /shifts/:id
router.get('/shifts', authenticateToken, wrap(ShiftController.getAllShifts));
router.get('/shifts/:id', authenticateToken, wrap(ShiftController.getShiftById));
router.post('/shifts', authenticateToken, wrap(ShiftController.createShift));
router.put('/shifts/:id', authenticateToken, wrap(ShiftController.updateShift));
router.delete('/shifts/:id', authenticateToken, wrap(ShiftController.deleteShift));
router.post('/shifts/bulk-delete', authenticateToken, wrap(ShiftController.bulkDeleteShifts));

// Employee Schedules (Lịch đăng ký ca) - Apply noCache middleware to prevent 304 responses
router.get('/schedules/my', noCache, authenticateToken, wrap(ShiftController.getMySchedules));
router.get('/schedules/my/paginated', noCache, authenticateToken, wrap(ShiftController.getMySchedulesPaginated));
router.get('/schedules/pending', noCache, authenticateToken, wrap(ShiftController.getPendingSchedules));
router.get('/schedules/stats/:year/:month', noCache, authenticateToken, wrap(ShiftController.getMonthlyStats));
// Schedule Approval Management (static routes) should be defined before '/schedules/:id' to avoid
// Express treating 'approval' as a dynamic :id parameter.
router.get('/schedules/approval', noCache, authenticateToken, wrap(ShiftController.getSchedulesForApproval));
router.post('/schedules/approve', noCache, authenticateToken, wrap(ShiftController.bulkApproveSchedules));
router.post('/schedules/approve-month', noCache, authenticateToken, wrap(ShiftController.approveMonthSchedules));
router.post('/schedules/delete', noCache, authenticateToken, wrap(ShiftController.bulkDeleteSchedules));

// Dynamic schedule route (by id)
router.get('/schedules/:id', noCache, authenticateToken, wrap(ShiftController.getScheduleById));
router.post('/schedules', noCache, authenticateToken, wrap(ShiftController.createSchedule));
router.post('/schedules/bulk', noCache, authenticateToken, wrap(ShiftController.bulkCreateSchedules));
router.put('/schedules/:id', noCache, authenticateToken, wrap(ShiftController.updateSchedule));
router.delete('/schedules/:id', noCache, authenticateToken, wrap(ShiftController.cancelSchedule));
router.post('/schedules/:id/approve', noCache, authenticateToken, wrap(ShiftController.approveSchedule));
router.post('/schedules/:id/reject', noCache, authenticateToken, wrap(ShiftController.rejectSchedule));

// ===================================
// HOLIDAYS ROUTES
// ===================================
router.get('/holidays', authenticateToken, async (req: Request, res: Response) => {
  await getHolidays(req, res);
});

export default router;

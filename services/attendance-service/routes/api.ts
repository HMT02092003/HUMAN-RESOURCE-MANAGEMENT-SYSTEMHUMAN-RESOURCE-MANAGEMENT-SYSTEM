/**
 * Attendance Service API Routes - Simplified & Clean
 * Chỉ giữ các API đang được sử dụng bởi frontend
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../src/middleware/authenticateToken';
import { 
  getAllMonthlyAttendance, 
  getUserMonthlyFull, 
  recordAttendance, 
  approveMonthlyAttendance, 
  calculateAndSaveMonthly,
  bulkCalculateMonthly
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings,
  updateSettingByKey,
  getSettingByKey,
}  from '../src/controller/SettingsController.js';
import { ShiftController } from '../src/controller/ShiftController.js';

const router = Router();

// small helper: wrap async controller methods so their Promise<Response> doesn't confuse Express typings
const wrap = (fn: any) => {
  return (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).then(() => {}).catch(next);
  };
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

// GET/POST /api/attendance/monthly-summaries-by-scope - return monthly_attendances for users in scope
const handleMonthlySummariesByScope = async (req: any, res: any) => {
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
router.get('/shifts', authenticateToken, wrap(ShiftController.getAllShifts));
router.get('/shifts/:id', authenticateToken, wrap(ShiftController.getShiftById));
router.post('/shifts', authenticateToken, wrap(ShiftController.createShift));
router.put('/shifts/:id', authenticateToken, wrap(ShiftController.updateShift));
router.delete('/shifts/:id', authenticateToken, wrap(ShiftController.deleteShift));
router.post('/shifts/bulk-delete', authenticateToken, wrap(ShiftController.bulkDeleteShifts));

// Employee Schedules (Lịch đăng ký ca)
router.get('/schedules/my', authenticateToken, wrap(ShiftController.getMySchedules));
router.get('/schedules/pending', authenticateToken, wrap(ShiftController.getPendingSchedules));
router.get('/schedules/stats/:year/:month', authenticateToken, wrap(ShiftController.getMonthlyStats));
// Schedule Approval Management (static routes) should be defined before '/schedules/:id' to avoid
// Express treating 'approval' as a dynamic :id parameter.
router.get('/schedules/approval', authenticateToken, wrap(ShiftController.getSchedulesForApproval));
router.post('/schedules/approve', authenticateToken, wrap(ShiftController.bulkApproveSchedules));
router.post('/schedules/approve-month', authenticateToken, wrap(ShiftController.approveMonthSchedules));
router.post('/schedules/delete', authenticateToken, wrap(ShiftController.bulkDeleteSchedules));

// Dynamic schedule route (by id)
router.get('/schedules/:id', authenticateToken, wrap(ShiftController.getScheduleById));
router.post('/schedules', authenticateToken, wrap(ShiftController.createSchedule));
router.post('/schedules/bulk', authenticateToken, wrap(ShiftController.bulkCreateSchedules));
router.put('/schedules/:id', authenticateToken, wrap(ShiftController.updateSchedule));
router.delete('/schedules/:id', authenticateToken, wrap(ShiftController.cancelSchedule));
router.post('/schedules/:id/approve', authenticateToken, wrap(ShiftController.approveSchedule));
router.post('/schedules/:id/reject', authenticateToken, wrap(ShiftController.rejectSchedule));

export default router;

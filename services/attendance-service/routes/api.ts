/**
 * Attendance Service API Routes - Simplified & Clean
 * Chỉ giữ các API đang được sử dụng bởi frontend
 */
import { Router, Request, Response } from 'express';
import { 
  getUserMonthlyFull,
  approveAttendance,
  recordAttendance,
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings,
  updateSettingByKey,
  getSettingByKey,
}  from '@/controller/SettingsController';

const router = Router();

// ===================================
// ATTENDANCE ROUTES - USED BY FRONTEND
// ===================================

// API: Lấy toàn bộ thông tin chấm công tháng (monthly-full)
// GET /api/user/:userId/monthly-full?year=2025&month=10
router.get('/user/:userId/monthly-full', async (req: Request, res: Response) => {
  await getUserMonthlyFull(req, res);
});

// API: Manager - list monthly summaries IN_PROGRESS
// GET /api/monthly-summaries?departmentId=1
router.get('/monthly-summaries', async (req: Request, res: Response) => {
  // lazy-load controller here to avoid circular
  const { getMonthlySummariesForManager } = await import('../src/controller/AttendanceController');
  await getMonthlySummariesForManager(req, res as any);
});

// API: Manager - approve & close monthly summary
// POST /api/monthly-summaries/:id/approve
router.post('/monthly-summaries/:id/approve', async (req: Request, res: Response) => {
  const { approveMonthlySummary } = await import('../src/controller/AttendanceController');
  await approveMonthlySummary(req as any, res as any);
});

// API: Duyệt bảng công tháng
// POST /api/attendance/approve (from gateway) -> /api/approve (in service)
router.post('/approve', async (req: Request, res: Response) => {
  await approveAttendance(req, res);
});

// API: Called by application-service (via API Gateway) to update attendance when
// an application (forgot-check / leave / business-trip) is approved.
// Gateway forwards /api/attendance/update-forgot-check -> attendance-service /api/update-forgot-check
router.post('/update-forgot-check', async (req: Request, res: Response) => {
  const { updateForgotCheck } = await import('../src/controller/AttendanceController');
  await updateForgotCheck(req, res as any);
});

// API: Called by application-service when a leave or business-trip application is approved
// Gateway forwards /api/attendance/create-from-application -> attendance-service /api/create-from-application
router.post('/create-from-application', async (req: Request, res: Response) => {
  const { createFromApplication } = await import('../src/controller/AttendanceController');
  await createFromApplication(req, res as any);
});

// API: Chấm công tự động (check-in/check-out)
// POST /api/attendance/record (from gateway) -> /api/record (in service)
router.post('/record', async (req: Request, res: Response) => {
  await recordAttendance(req, res);
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

export default router;

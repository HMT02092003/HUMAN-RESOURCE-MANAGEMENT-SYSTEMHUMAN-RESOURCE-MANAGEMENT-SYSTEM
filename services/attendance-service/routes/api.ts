/**
 * Attendance Service API Routes - Simplified Version
 * Chỉ còn 2 API chính cho attendance và settings
 * + Thêm compatibility routes cho frontend cũ
 */
import { Router, Request, Response } from 'express';
import { 
  getAllAttendance,
  approveAttendance,
  getUserMonthlyFull,
  getUserMonthlyDetail,
  recordAttendance,
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings,
  getSettingsByKey,
  updateSettingByKey,
  getSettingByKey,
}  from '@/controller/SettingsController';

const router = Router();

// ===================================
// ATTENDANCE ROUTES - MAIN
// ===================================

// API 1: Lấy toàn bộ thông tin chấm công theo tháng
// GET /api/attendance?month=YYYY-MM&departmentId=1
router.get('/attendance', async (req: Request, res: Response) => {
  await getAllAttendance(req, res);
});

// API 2: Duyệt bảng công tháng
// POST /api/attendance/approve
// Body: { userId: number, month: "YYYY-MM" }
router.post('/attendance/approve', async (req: Request, res: Response) => {
  await approveAttendance(req, res);
});

// ===================================
// ATTENDANCE RECORDING ROUTES - NEW
// ===================================

// API: Chấm công tự động (check-in lần đầu, check-out các lần sau)
// POST /api/attendance/record (từ gateway) -> /api/record (trong service)
// Body: { userId: number, time: string }
router.post('/record', async (req: Request, res: Response) => {
  await recordAttendance(req, res);
});

// ===================================
// BACKWARD COMPATIBILITY ROUTES
// ===================================

// GET /api/user/:userId/monthly-full?year=2025&month=10
router.get('/user/:userId/monthly-full', async (req: Request, res: Response) => {
  await getUserMonthlyFull(req, res);
});

// GET /api/user/:userId/monthly-detail?year=2025&month=10
router.get('/user/:userId/monthly-detail', async (req: Request, res: Response) => {
  await getUserMonthlyDetail(req, res);
});

// ===================================
// SETTINGS ROUTES
// ===================================
router.get('/settings', async (req: Request, res: Response) => {
  await getSettings(req, res);
});

router.post('/settings', async (req: Request, res: Response) => {
  await updateSettings(req, res);
});

// New route: update single setting by key (body: { key, value })
router.post('/settings/key', async (req: Request, res: Response) => {
  // Delegate to new controller method that handles single key upsert
  await updateSettingByKey(req, res as any);
});

// Dedicated endpoints per setting (convenience wrappers)
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

router.get('/settings/:key', async (req: Request, res: Response) => {
  await getSettingByKey(req, res);
});

export default router;

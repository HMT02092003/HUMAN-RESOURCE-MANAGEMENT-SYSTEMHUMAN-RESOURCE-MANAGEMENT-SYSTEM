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
}  from '@/controller/SettingsController';
import { AttendanceService } from '@/services/AttendanceService';

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

router.get('/settings/:key', async (req: Request, res: Response) => {
  await getSettingsByKey(req, res);
});

export default router;

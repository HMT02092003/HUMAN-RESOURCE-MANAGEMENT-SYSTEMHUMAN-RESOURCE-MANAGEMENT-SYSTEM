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
  getUserMonthlyDetail
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings,
  getSettingsByKey,
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

// ===================================
// API INFO ENDPOINT
// ===================================
router.get('/', (_req: Request, res: Response) => {
  const apiInfo = {
    service: 'Attendance Service API - Simplified',
    version: '3.0',
    status: 'active',
    endpoints: [
      {
        group: 'Main APIs',
        routes: [
          {
            method: 'GET',
            path: '/attendance',
            description: 'Lấy toàn bộ thông tin chấm công theo tháng',
            params: 'month (YYYY-MM), departmentId (number)'
          },
          {
            method: 'POST',
            path: '/attendance/approve',
            description: 'Duyệt bảng công tháng (tự động xử lý overtime)',
            body: '{ userId: number, month: "YYYY-MM" }'
          }
        ]
      },
      {
        group: 'Compatibility APIs (for old frontend)',
        routes: [
          {
            method: 'GET',
            path: '/user/:userId/monthly-full',
            description: 'Lấy thông tin chấm công đầy đủ của 1 user',
            params: 'year, month'
          },
          {
            method: 'GET',
            path: '/user/:userId/monthly-detail',
            description: 'Tương tự monthly-full',
            params: 'year, month'
          }
        ]
      },
      {
        group: 'Settings APIs',
        routes: [
          {
            method: 'GET',
            path: '/settings',
            description: 'Lấy tất cả settings'
          },
          {
            method: 'POST',
            path: '/settings',
            description: 'Cập nhật settings'
          },
          {
            method: 'GET',
            path: '/settings/:key',
            description: 'Lấy setting theo key'
          }
        ]
      }
    ],
    features: [
      'Lấy thông tin chấm công tháng theo phòng ban',
      'Duyệt bảng công và tự động tính overtime',
      'Tính chính xác số ngày đi muộn/về sớm',
      'Quản lý settings chấm công',
      'Backward compatible với frontend cũ'
    ],
    notes: [
      'Tất cả business logic đã được chuyển sang AttendanceService',
      'Controller chỉ xử lý request/response validation',
      'Tính năng xử lý overtime tự động khi duyệt bảng công',
      'Tính số ngày đi muộn chính xác bằng Objection.js query',
      'Các route /user/:userId/monthly-* để tương thích với frontend cũ'
    ],
    timestamp: new Date().toISOString()
  };

  res.json(apiInfo);
});

export default router;

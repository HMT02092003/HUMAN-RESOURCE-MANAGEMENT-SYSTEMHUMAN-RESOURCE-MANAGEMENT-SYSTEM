import express from 'express';
import { 
  confirmAttendance,
  getUserAttendanceByMonth,
  getMonthlyStats
} from '../src/controller/AttendanceController';
import {
  getSettings,
  updateSettings
}  from '@/controller/SettingsController';

const router = express.Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'attendance-service',
    timestamp: new Date().toISOString()
  });
});

// API xác nhận chấm công
router.post('/confirm', (req, res) => {
  confirmAttendance(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy dữ liệu chấm công theo tháng
router.get('/user/:userId/month', (req, res) => {
  getUserAttendanceByMonth(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy cấu hình settings
router.get('/settings', (req, res) => {
  getSettings(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API cập nhật cấu hình settings
router.post('/settings', (req, res) => {
  updateSettings(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy thống kê tháng
router.get('/user/:userId/stats/monthly', (req, res) => {
  getMonthlyStats(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy thống kê cơ bản (tạm thời trả về dữ liệu cơ bản)
router.get('/user/:userId/stats', (_req, res) => {
  // Tạm thời trả về dữ liệu mock để không bị lỗi
  res.status(200).json({
    totalHours: 0,
    totalDays: 0,
    penalty: 0,
    onTimeRate: 100
  });
});

export default router;

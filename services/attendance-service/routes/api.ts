import express from 'express';
import { 
  confirmAttendance, 
  getAttendanceStatus, 
  getAttendanceHistory,
  getUserAttendanceByMonth,
  getUserMonthlyStats
} from '../src/controller/AttendanceController';

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

// API kiểm tra trạng thái chấm công
router.get('/status/:userId', (req, res) => {
  getAttendanceStatus(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy lịch sử chấm công
router.get('/history/:userId', (req, res) => {
  getAttendanceHistory(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy dữ liệu chấm công theo tháng
router.get('/user/:userId/month', (req, res) => {
  getUserAttendanceByMonth(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

// API lấy thống kê chấm công theo tháng
router.get('/user/:userId/stats', (req, res) => {
  getUserMonthlyStats(req, res).catch((err: any) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });
});

export default router;

import express from 'express';
import { ApplicationController } from '../src/controller/application-controller.js';
import { authenticateToken } from '../src/middleware/auth.js';

const router = express.Router();

// ===================================
// APPLICATION ROUTES (với middleware xác thực)
// ===================================

// Tạo đơn từ mới
router.post('/applications', authenticateToken, ApplicationController.create);

// Lấy danh sách đơn từ của user hiện tại
router.get('/applications/my-applications', authenticateToken, ApplicationController.getMyApplications);

// Lấy danh sách đơn cần duyệt (cho manager)
router.get('/applications/pending', authenticateToken, ApplicationController.getPendingApplications);

// Lấy thống kê đơn từ
router.get('/applications/stats', authenticateToken, ApplicationController.getStats);

// Lấy đơn từ theo khoảng thời gian
router.get('/applications/date-range', authenticateToken, ApplicationController.getByDateRange);

// Lấy chi tiết đơn từ theo ID
router.get('/applications/:id', authenticateToken, ApplicationController.getById);

// Duyệt đơn từ
router.post('/applications/:id/approve', authenticateToken, ApplicationController.approve);

// Từ chối đơn từ
router.post('/applications/:id/reject', authenticateToken, ApplicationController.reject);

// Cập nhật đơn từ
router.put('/applications/:id', authenticateToken, ApplicationController.update);

// Hủy đơn từ
router.delete('/applications/:id', authenticateToken, ApplicationController.delete);

// Lấy tất cả đơn từ (cho admin) - đặt cuối để tránh conflict với các route khác
router.get('/applications', authenticateToken, ApplicationController.getAll);

export default router;

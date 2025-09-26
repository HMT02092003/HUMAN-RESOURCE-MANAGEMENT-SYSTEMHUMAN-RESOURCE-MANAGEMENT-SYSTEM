import express from 'express';
import { ApplicationController } from '../src/controller/application-controller.js';

const router = express.Router();

// ===================================
// APPLICATION ROUTES
// ===================================

// Tạo đơn từ mới
router.post('/applications', ApplicationController.create);

// Lấy danh sách đơn từ của user hiện tại
router.get('/applications/my-applications', ApplicationController.getMyApplications);

// Lấy danh sách đơn cần duyệt (cho manager)
router.get('/applications/pending', ApplicationController.getPendingApplications);

// Lấy thống kê đơn từ
router.get('/applications/stats', ApplicationController.getStats);

// Lấy đơn từ theo khoảng thời gian
router.get('/applications/date-range', ApplicationController.getByDateRange);

// Lấy chi tiết đơn từ theo ID
router.get('/applications/:id', ApplicationController.getById);

// Duyệt đơn từ
router.post('/applications/:id/approve', ApplicationController.approve);

// Từ chối đơn từ
router.post('/applications/:id/reject', ApplicationController.reject);

// Cập nhật đơn từ
router.put('/applications/:id', ApplicationController.update);

// Hủy đơn từ
router.delete('/applications/:id', ApplicationController.delete);

// Lấy tất cả đơn từ (cho admin) - đặt cuối để tránh conflict với các route khác
router.get('/applications', ApplicationController.getAll);

// ===================================
// API INFO
// ===================================
router.get('/', (req, res) => {
  res.json({
    service: 'Application Service API',
    version: '1.0.0',
    status: 'active',
    endpoints: [
      'POST /applications - Tạo đơn từ mới',
      'GET /applications/my-applications - Lấy đơn của user hiện tại',
      'GET /applications/pending - Lấy đơn cần duyệt',
      'GET /applications/stats - Thống kê đơn từ',
      'GET /applications/date-range - Lấy đơn theo thời gian',
      'GET /applications/:id - Chi tiết đơn từ',
      'POST /applications/:id/approve - Duyệt đơn',
      'POST /applications/:id/reject - Từ chối đơn',
      'PUT /applications/:id - Cập nhật đơn',
      'DELETE /applications/:id - Hủy đơn',
      'GET /applications - Tất cả đơn từ (admin)'
    ],
    supportedApplicationTypes: [
      'business-trip - Đơn công tác',
      'leave - Đơn nghỉ phép',
      'overtime - Đơn làm thêm',
      'remote-work - Đơn làm việc từ xa',
      'sick-leave - Đơn nghỉ ốm'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;

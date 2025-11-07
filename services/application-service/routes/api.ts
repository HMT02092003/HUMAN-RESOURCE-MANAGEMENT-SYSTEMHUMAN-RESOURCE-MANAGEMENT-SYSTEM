import express from 'express';
import { ApplicationController } from '../src/controller/application-controller.js';
import { authenticateToken } from '../src/middleware/authenticateToken';
import { uploadEvidence, processAndSaveFiles } from '../src/middleware/upload.js';

const router = express.Router();

// ===================================
// APPLICATION ROUTES (với middleware xác thực)
// ===================================

// Tạo đơn từ mới (với upload)
router.post('/applications',
  authenticateToken,
  (req, res, next) => {
    uploadEvidence(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Lỗi khi upload file'
        });
      }
      next();
    });
  },
  processAndSaveFiles, // Convert ảnh sang PNG và lưu file
  ApplicationController.create
);

// Cập nhật đơn từ (với upload)
router.put('/applications/:id',
  authenticateToken,
  (req, res, next) => {
    uploadEvidence(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Lỗi khi upload file'
        });
      }
      next();
    });
  },
  processAndSaveFiles, // Convert ảnh sang PNG và lưu file
  ApplicationController.update
);

// Lấy danh sách đơn từ của user hiện tại
router.get('/applications/my-applications', authenticateToken, ApplicationController.getMyApplications);

// Inter-service route: Lấy đơn của user theo userId (không cần auth token)
router.get('/applications/user/:userId/approved', ApplicationController.getUserApprovedApplications);

// Lấy danh sách đơn cần duyệt (cho manager)
router.get('/applications/pending', authenticateToken, ApplicationController.getPendingApplications);

// Lấy thống kê đơn từ
router.get('/applications/stats', authenticateToken, ApplicationController.getStats);

// Lấy đơn từ theo khoảng thời gian
router.get('/applications/date-range', authenticateToken, ApplicationController.getByDateRange);

// Duyệt đơn từ - ĐẶT TRƯỚC :id route
router.post('/applications/:id/approve', authenticateToken, ApplicationController.approve);

// Từ chối đơn từ - ĐẶT TRƯỚC :id route
router.post('/applications/:id/reject', authenticateToken, ApplicationController.reject);

// Lấy chi tiết đơn từ theo ID
router.get('/applications/:id', authenticateToken, ApplicationController.getById);

// Xóa nhiều đơn từ (đặt trước route xóa đơn lẻ để tránh conflict)
router.post('/applications/bulk-delete', authenticateToken, ApplicationController.bulkDelete);

// Xóa đơn từ
router.delete('/applications/:id', authenticateToken, ApplicationController.delete);

// Lấy tất cả đơn từ (cho admin) - đặt cuối để tránh conflict với các route khác
router.get('/applications', authenticateToken, ApplicationController.getAll);

export default router;

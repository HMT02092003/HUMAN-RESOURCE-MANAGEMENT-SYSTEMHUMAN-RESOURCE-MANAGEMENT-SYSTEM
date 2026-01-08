/**
 * Application Service API Routes - Gateway Authenticated
 * All routes go through API Gateway which validates JWT and injects x-user-data header
 * No authentication middleware needed at service level (except internal routes)
 */
import express from 'express';
import { ApplicationController } from '../src/controller/application-controller.js';
import { uploadEvidence, processAndSaveFiles } from '../src/middleware/upload.js';

const router = express.Router();

// ===================================
// APPLICATION ROUTES
// ===================================

// Tạo đơn từ mới (với upload)
router.post('/applications',
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

// Lấy danh sách đơn từ của user hiện tại - có server-side search/sort/filter (cho bảng)
router.get('/applications/my-applications', ApplicationController.getMyApplicationsPaginated);

// Lấy tất cả đơn từ của user hiện tại (không phân trang) - dùng cho select/dropdown
router.get('/all/my-applications', ApplicationController.getAllMyApplicationsList);

// Inter-service route: Lấy đơn của user theo userId (không cần auth token)
router.get('/applications/user/:userId/approved', ApplicationController.getUserApprovedApplications);

// Lấy danh sách đơn cần duyệt (cho manager)
router.get('/applications/pending', ApplicationController.getPendingApplications);

// Lấy thống kê đơn từ
router.get('/applications/stats', ApplicationController.getStats);

// Lấy đơn từ theo khoảng thời gian
router.get('/applications/date-range', ApplicationController.getByDateRange);

// Duyệt nhiều đơn cùng lúc - ĐẶT TRƯỚC :id route
router.post('/applications/bulk-approve', ApplicationController.bulkApprove);

// Duyệt đơn từ - ĐẶT TRƯỚC :id route
router.post('/applications/:id/approve', ApplicationController.approve);

// Từ chối đơn từ - ĐẶT TRƯỚC :id route
router.post('/applications/:id/reject', ApplicationController.reject);

// Lấy chi tiết đơn từ theo ID
router.get('/applications/:id', ApplicationController.getById);

// Xóa nhiều đơn từ (đặt trước route xóa đơn lẻ để tránh conflict)
router.post('/applications/bulk-delete', ApplicationController.bulkDelete);

// Xóa đơn từ
router.delete('/applications/:id', ApplicationController.delete);

// Lấy tất cả đơn từ (cho admin) - đặt cuối để tránh conflict với các route khác
router.get('/applications', ApplicationController.getAll);

export default router;

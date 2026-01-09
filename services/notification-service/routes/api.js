import express from 'express';
import { PublicController } from '../src/controller/public-controller.js';

const router = express.Router();

/**
 * Public Routes
 * Client (Web/Mobile) gọi qua Gateway
 * Gateway sẽ attach req.user từ JWT
 */

// Lấy danh sách thông báo (có phân trang)
router.get('/', PublicController.getNotifications);

// Lấy số thông báo chưa đọc
router.get('/unread-count', PublicController.getUnreadCount);

// Đánh dấu 1 thông báo đã đọc
router.patch('/:id/read', PublicController.markAsRead);

// Đánh dấu tất cả đã đọc
router.patch('/read-all', PublicController.markAllAsRead);

// Đăng ký FCM token (Mobile)
router.post('/device-token', PublicController.registerDeviceToken);

// Xóa FCM token
router.delete('/device-token/:token', PublicController.unregisterDeviceToken);

export default router;

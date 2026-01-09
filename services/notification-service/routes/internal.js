import express from 'express';
import { InternalController } from '../src/controller/internal-controller.js';

const router = express.Router();

/**
 * Internal Routes
 * Chỉ dành cho các service khác gọi (không qua Gateway auth)
 */

// Gửi thông báo (được gọi từ Auth, Employee, Application service...)
router.post('/send', InternalController.sendNotification);

// Lấy số lượng thông báo chưa đọc
router.get('/unread-count/:userId', InternalController.getUnreadCount);

export default router;

import { Notification } from '../Models/Notification.js';
import { UserDevice } from '../Models/UserDevice.js';
import FCMService from '../services/FCMService.js';
import SocketManager from '../socket/index.js';
import dayjs from 'dayjs';

/**
 * Internal Controller
 * API nội bộ cho các service khác gọi (Auth, Employee, Application...)
 */
export class InternalController {
  /**
   * Gửi thông báo đến user(s)
   * Flow: Save DB -> Realtime Web (Socket) -> Push Mobile (FCM)
   * 
   * Body: {
   *   userIds: [1, 2, 3],
   *   title: "Đơn nghỉ phép được duyệt",
   *   content: "Đơn nghỉ phép của bạn từ 10/01 đến 12/01 đã được quản lý phê duyệt",
   *   type: "LEAVE_APPROVE",
   *   data: { leave_id: 123, approver_name: "Admin" }
   * }
   */
  static async sendNotification(req, res) {
    try {
      const { userIds, title, content, type, data } = req.body;

      // Validation
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'userIds is required and must be an array'
        });
      }

      if (!title || !content || !type) {
        return res.status(400).json({
          success: false,
          error: 'title, content, and type are required'
        });
      }

      const results = {
        saved: 0,
        socketDelivered: 0,
        fcmSent: 0,
        errors: []
      };

      // 1️⃣ SAVE TO DATABASE (Single Source of Truth)
      const notifications = [];
      for (const userId of userIds) {
        try {
          const notification = await Notification.query().insert({
            user_id: userId,
            title,
            content,
            type,
            data: data || null,
            is_read: false
          });
          notifications.push(notification);
          results.saved++;
        } catch (error) {
          console.error(`Failed to save notification for user ${userId}:`, error);
          results.errors.push({
            userId,
            step: 'database',
            error: error.message
          });
        }
      }

      // 2️⃣ REALTIME WEB (Socket.io) - Emit ngay lập tức
      try {
        console.log(`[Internal Controller] Attempting to emit socket events to ${userIds.length} users: ${JSON.stringify(userIds)}`);
        
        const socketData = {
          id: notifications[0]?.id, // First notification ID
          title,
          content,
          type,
          data,
          created_at: dayjs().format()
        };

        userIds.forEach(userId => {
          const delivered = SocketManager.emitToUser(
            userId,
            'notification', // Event name must match frontend listener
            socketData
          );
          if (delivered) {
            results.socketDelivered++;
            console.log(`  ✅ User ${userId} - socket delivered (online)`);
          } else {
            console.log(`  📴 User ${userId} - offline, saved to DB for later fetch`);
          }
        });
      } catch (error) {
        console.error('Socket emit error:', error);
        results.errors.push({
          step: 'socket',
          error: error.message
        });
      }

      // 3️⃣ PUSH MOBILE (FCM) - Gửi đến các thiết bị
      try {
        // Lấy tất cả FCM tokens của các users
        const devices = await UserDevice.query()
          .whereIn('user_id', userIds)
          .where('is_active', true)
          .select('fcm_token');

        const fcmTokens = devices.map(d => d.fcm_token);

        if (fcmTokens.length > 0) {
          const fcmResult = await FCMService.sendMulticast(
            fcmTokens,
            { title, body: content },
            {
              type,
              notification_id: notifications[0]?.id || '',
              ...data
            }
          );

          results.fcmSent = fcmResult.successCount;

          if (fcmResult.failureCount > 0) {
            results.errors.push({
              step: 'fcm',
              failureCount: fcmResult.failureCount,
              errors: fcmResult.errors
            });
          }
        }
      } catch (error) {
        console.error('FCM send error:', error);
        results.errors.push({
          step: 'fcm',
          error: error.message
        });
      }

      // Response
      res.status(201).json({
        success: true,
        message: 'Notifications processed',
        data: results,
        timestamp: dayjs().format()
      });

    } catch (error) {
      console.error('sendNotification error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Lấy số lượng thông báo chưa đọc của user
   * GET /internal/unread-count/:userId
   */
  static async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;

      const count = await Notification.query()
        .where('user_id', userId)
        .where('is_read', false)
        .count('id as count')
        .first();

      res.json({
        success: true,
        data: {
          user_id: parseInt(userId),
          unread_count: parseInt(count.count || 0)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

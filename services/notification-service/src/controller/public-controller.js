import { Notification } from '../Models/Notification.js';
import { UserDevice } from '../Models/UserDevice.js';
import dayjs from 'dayjs';

// Helper to resolve userId from various sources (req.user, headers)
function resolveUserIdFromReq(req) {
  // Preferred: req.user injected by gateway middleware
  const userFromReq = req.user;
  if (userFromReq) {
    return userFromReq.sub || userFromReq.userId || userFromReq.id || undefined;
  }

  // Fallback: x-user-id header forwarded by gateway
  const xUserId = req.headers['x-user-id'] || req.headers['x-userid'];
  if (xUserId) return Number(xUserId);

  // Fallback: x-user-data Base64 JSON
  const xUserData = req.headers['x-user-data'];
  if (xUserData && typeof xUserData === 'string') {
    try {
      const decoded = JSON.parse(Buffer.from(xUserData, 'base64').toString('utf8'));
      return decoded.sub || decoded.userId || decoded.id || undefined;
    } catch (e) {
      console.warn('PublicController: failed to parse x-user-data header', e.message);
    }
  }

  return undefined;
}

/**
 * Public Controller
 * API cho Client (Web/Mobile) fetch thông báo
 */
export class PublicController {
  /**
   * Lấy danh sách thông báo của user (có phân trang)
   * GET /api/notifications?page=1&limit=20&is_read=false
   */
  static async getNotifications(req, res) {
    try {
      // Resolve userId from req, headers, or gateway-injected data
      const userId = resolveUserIdFromReq(req);

      if (!userId) {
        console.warn('getNotifications: no userId resolved from request. Headers:', {
          authorization: req.headers['authorization'] ? '[present]' : '[missing]',
          xUserId: req.headers['x-user-id'],
          xUserData: req.headers['x-user-data'] ? '[present]' : '[missing]'
        });
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const { page = 1, limit = 20, is_read } = req.query;
      const offset = (page - 1) * limit;

      let query = Notification.query()
        .where('user_id', userId)
        .orderBy('created_at', 'desc');

      // Filter by read status
      if (is_read !== undefined) {
        query = query.where('is_read', is_read === 'true');
      }

      // Pagination
      const notifications = await query
        .limit(parseInt(limit))
        .offset(offset);

      console.log(`[PublicController] getNotifications: userId=${userId}, found ${notifications.length} notifications`);
      
      // Debug: log when no notifications found for a user that exists in DB
      if ((!notifications || notifications.length === 0) && req.query.debug === '1') {
        console.log(`getNotifications debug: user=${userId} returned 0 notifications. Query params:`, { page, limit, is_read });
      }

      // Count total
      const totalQuery = Notification.query()
        .where('user_id', userId)
        .count('id as count');

      if (is_read !== undefined) {
        totalQuery.where('is_read', is_read === 'true');
      }

      const total = await totalQuery.first();

      const payload = {
        success: true,
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total.count || 0),
            totalPages: Math.ceil(total.count / limit)
          }
        },
        timestamp: dayjs().format()
      };

      // If debug flag is present, include resolved user id for easier troubleshooting
      if (req.query.debug === '1') {
        payload.resolved_user_id = userId;
      }

      res.json(payload);

    } catch (error) {
      console.error('getNotifications error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Đánh dấu thông báo đã đọc
   * PATCH /api/notifications/:id/read
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = resolveUserIdFromReq(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      // Validate notification ID is a valid number
      const notificationId = Number(id);
      if (isNaN(notificationId) || !isFinite(notificationId)) {
        console.error('[markAsRead] Invalid notification ID:', id);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid notification ID',
          details: `Notification ID must be a valid number, received: ${id}`
        });
      }

      // Verify ownership
      const notification = await Notification.query()
        .findById(notificationId)
        .where('user_id', userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Update
      await Notification.query()
        .findById(notificationId)
        .patch({ is_read: true });

      res.json({
        success: true,
        message: 'Notification marked as read',
        timestamp: dayjs().format()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Đánh dấu tất cả thông báo đã đọc
   * PATCH /api/notifications/read-all
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = resolveUserIdFromReq(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      await Notification.query()
        .where('user_id', userId)
        .where('is_read', false)
        .patch({ is_read: true });

      res.json({
        success: true,
        message: 'All notifications marked as read',
        timestamp: dayjs().format()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Lấy số lượng thông báo chưa đọc
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = resolveUserIdFromReq(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      const result = await Notification.query()
        .where('user_id', userId)
        .where('is_read', false)
        .count('id as count')
        .first();

      res.json({
        success: true,
        data: {
          unread_count: parseInt(result.count || 0)
        },
        timestamp: dayjs().format()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Đăng ký FCM token (Mobile App)
   * POST /api/notifications/device-token
   * Body: { fcm_token, platform, device_name, app_version }
   */
  static async registerDeviceToken(req, res) {
    try {
      const userId = resolveUserIdFromReq(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });
      const { fcm_token, platform, device_name, app_version } = req.body;

      if (!fcm_token || !platform) {
        return res.status(400).json({
          success: false,
          error: 'fcm_token and platform are required'
        });
      }

      // Validate platform
      if (!['ios', 'android', 'web'].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid platform. Must be ios, android, or web'
        });
      }

      // Check if token already exists
      const existing = await UserDevice.query()
        .where('fcm_token', fcm_token)
        .first();

      if (existing) {
        // Update existing
        await UserDevice.query()
          .where('id', existing.id)
          .patch({
            user_id: userId,
            platform,
            device_name: device_name || existing.device_name,
            app_version: app_version || existing.app_version,
            is_active: true,
            updated_at: new Date().toISOString()
          });

        return res.json({
          success: true,
          message: 'Device token updated',
          data: { device_id: existing.id }
        });
      }

      // Insert new
      const device = await UserDevice.query().insert({
        user_id: userId,
        fcm_token,
        platform,
        device_name: device_name || null,
        app_version: app_version || null,
        is_active: true
      });

      res.status(201).json({
        success: true,
        message: 'Device token registered',
        data: { device_id: device.id }
      });

    } catch (error) {
      console.error('registerDeviceToken error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Xóa FCM token (khi logout hoặc uninstall app)
   * DELETE /api/notifications/device-token/:token
   */
  static async unregisterDeviceToken(req, res) {
    try {
      const { token } = req.params;
      const userId = resolveUserIdFromReq(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      await UserDevice.query()
        .where('fcm_token', token)
        .where('user_id', userId)
        .patch({ is_active: false });

      res.json({
        success: true,
        message: 'Device token unregistered'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

/**
 * Firebase Cloud Messaging Service
 * Xử lý Push Notification cho Mobile (iOS + Android)
 */
class FCMService {
  constructor() {
    this.initialized = false;
    this.initialize();
  }

  /**
   * Khởi tạo Firebase Admin SDK
   */
  initialize() {
    try {
      const credPath = process.env.FIREBASE_CREDENTIALS_PATH;
      
      // Kiểm tra xem file credentials có tồn tại không
      if (!credPath || !fs.existsSync(credPath)) {
        console.warn('⚠️  Firebase credentials not found. FCM features will be disabled.');
        console.warn('💡 To enable: Download service account JSON from Firebase Console');
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error.message);
    }
  }

  /**
   * Gửi notification đến nhiều thiết bị (multicast)
   * @param {string[]} tokens - Danh sách FCM tokens
   * @param {object} notification - { title, body }
   * @param {object} data - Custom data payload
   * @returns {Promise<object>} - { successCount, failureCount, errors }
   */
  async sendMulticast(tokens, notification, data = {}) {
    if (!this.initialized) {
      console.warn('FCM not initialized. Skipping push notification.');
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          ...data,
          // Convert all values to string (FCM requirement)
          type: String(data.type || ''),
          notification_id: String(data.notification_id || ''),
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        tokens // Array of FCM tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      console.log(`📨 FCM sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Log failed tokens để có thể cleanup sau
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({
              token: tokens[idx],
              error: resp.error?.message
            });
          }
        });
        console.error('Failed tokens:', failedTokens);
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses
          .filter(r => !r.success)
          .map(r => r.error?.message)
      };
    } catch (error) {
      console.error('❌ FCM send error:', error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [error.message]
      };
    }
  }

  /**
   * Gửi đến 1 token duy nhất
   */
  async sendToDevice(token, notification, data = {}) {
    return this.sendMulticast([token], notification, data);
  }
}

// Export singleton instance
export default new FCMService();

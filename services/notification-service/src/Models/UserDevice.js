import { Model } from 'objection';

/**
 * UserDevice Model
 * Lưu FCM tokens của các thiết bị mobile
 */
export class UserDevice extends Model {
  static get tableName() {
    return 'user_devices';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'fcm_token', 'platform'],
      properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        fcm_token: { type: 'string', maxLength: 255 },
        platform: { type: 'string', enum: ['ios', 'android', 'web'] },
        device_name: { type: ['string', 'null'], maxLength: 100 },
        app_version: { type: ['string', 'null'], maxLength: 20 },
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      }
    };
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

import { Model } from 'objection';

/**
 * Notification Model
 * Single Source of Truth cho mọi thông báo trong hệ thống
 */
export class Notification extends Model {
  static get tableName() {
    return 'notifications';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'title', 'content', 'type'],
      properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        title: { type: 'string', maxLength: 255 },
        content: { type: 'string' },
        type: { type: 'string', maxLength: 50 },
        data: { type: ['object', 'null'] },
        is_read: { type: 'boolean', default: false },
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

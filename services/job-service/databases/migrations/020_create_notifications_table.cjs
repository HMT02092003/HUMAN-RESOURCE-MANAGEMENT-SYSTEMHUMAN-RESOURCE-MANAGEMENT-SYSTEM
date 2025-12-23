/**
 * Migration: Tạo bảng notifications để lưu trữ thông báo cho users
 */
exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    // ID tự tăng
    table.increments('notification_id').primary();
    
    // User ID - người nhận thông báo
    table.integer('user_id').notNullable();
    
    // Project ID (nullable)
    table.integer('project_id').nullable()
      .references('project_id').inTable('projects').onDelete('CASCADE');
    
    // Task ID (nullable)
    table.string('task_id', 64).nullable()
      .references('task_id').inTable('tasks').onDelete('CASCADE');
    
    // Loại thông báo
    table.enum('notification_type', [
      'task_assigned',        // Task được giao
      'task_updated',         // Task được cập nhật
      'task_completed',       // Task hoàn thành
      'task_approved',        // Task được duyệt
      'task_rejected',        // Task bị từ chối
      'task_overdue',         // Task quá hạn
      'task_due_soon',        // Task sắp đến hạn
      'project_updated',      // Project được cập nhật
      'kpi_calculated',       // KPI được tính
      'member_added',         // Thành viên được thêm vào project
      'comment_added'         // Comment được thêm
    ]).notNullable();
    
    // Nội dung thông báo
    table.string('title', 255).notNullable();
    table.text('message').nullable();
    
    // Trạng thái
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at', { useTz: true }).nullable();
    
    // Priority
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    
    // Metadata
    table.json('metadata').nullable(); // Lưu thông tin chi tiết
    
    // Action URL (để redirect khi click notification)
    table.string('action_url', 512).nullable();
    
    // Sender (người tạo thông báo, nullable)
    table.integer('sender_id').nullable();
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true }).nullable(); // Thông báo có thể có thời hạn
    
    // Indexes
    table.index('user_id');
    table.index('project_id');
    table.index('task_id');
    table.index('notification_type');
    table.index('is_read');
    table.index('created_at');
    table.index(['user_id', 'is_read', 'created_at']); // Compound index để query hiệu quả
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('notifications');
};

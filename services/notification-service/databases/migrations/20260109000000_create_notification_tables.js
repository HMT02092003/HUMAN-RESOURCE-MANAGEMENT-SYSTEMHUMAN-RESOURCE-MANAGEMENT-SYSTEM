/**
 * Migration: Create notifications and user_devices tables
 * Purpose: Single Source of Truth for all notification data
 */

export async function up(knex) {
  // 1. Bảng notifications - Lưu mọi thông báo
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().index();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    
    // Type: LEAVE_APPROVE, LEAVE_REJECT, TASK_ASSIGN, SALARY_UPDATE, etc.
    table.string('type', 50).notNullable().index();
    
    // JSON metadata: { leave_id: 123, approver_name: "Admin" }
    table.json('data').nullable();
    
    table.boolean('is_read').defaultTo(false).index();
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['user_id', 'is_read']);
    table.index(['user_id', 'created_at']);
  });

  // 2. Bảng user_devices - Lưu FCM tokens cho Mobile
  await knex.schema.createTable('user_devices', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().index();
    
    // FCM Token từ Firebase SDK
    table.string('fcm_token', 255).notNullable().unique();
    
    // Platform: ios, android, web
    table.enum('platform', ['ios', 'android', 'web']).notNullable();
    
    // Device info (optional)
    table.string('device_name', 100).nullable();
    table.string('app_version', 20).nullable();
    
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Composite index for active devices
    table.index(['user_id', 'is_active']);
  });

  console.log('✅ Created notifications and user_devices tables');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_devices');
  await knex.schema.dropTableIfExists('notifications');
  console.log('❌ Dropped notifications and user_devices tables');
}

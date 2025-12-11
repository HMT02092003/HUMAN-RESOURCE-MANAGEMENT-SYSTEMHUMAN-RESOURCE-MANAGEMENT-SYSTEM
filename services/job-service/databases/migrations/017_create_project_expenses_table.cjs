/**
 * Migration: Create project_expenses table
 * Lưu chi tiết từng khoản chi tiêu của dự án
 */

exports.up = function(knex) {
  return knex.schema.createTable('project_expenses', function(table) {
    // Primary key
    table.uuid('expense_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign key to project
    table.integer('project_id').unsigned().notNullable()
      .references('project_id').inTable('projects').onDelete('CASCADE');
    
    // Expense details
    table.string('title', 255).notNullable(); // Tên khoản chi tiêu
    table.text('description').nullable(); // Mô tả chi tiết
    table.decimal('amount', 15, 2).notNullable(); // Số tiền chi
    table.enum('category', [
      'personnel', // Chi phí nhân sự
      'equipment', // Thiết bị
      'software', // Phần mềm/License
      'travel', // Đi lại
      'marketing', // Marketing
      'infrastructure', // Cơ sở hạ tầng
      'training', // Đào tạo
      'consulting', // Tư vấn
      'maintenance', // Bảo trì
      'other' // Khác
    ]).notNullable().defaultTo('other');
    
    table.date('expense_date').notNullable(); // Ngày chi tiêu
    
    // Who created this expense record
    table.integer('created_by').nullable(); // User ID from auth-service
    
    // Approval status
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.integer('approved_by').nullable(); // User ID who approved
    table.timestamp('approved_at').nullable();
    
    // Metadata
    table.json('metadata').nullable(); // Lưu thêm thông tin như receipt, invoice, etc.
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index('project_id');
    table.index('category');
    table.index('status');
    table.index('expense_date');
    table.index('created_by');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('project_expenses');
};

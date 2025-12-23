/**
 * Migration: Thêm trạng thái 'pending_approval' cho task và các trường liên quan đến completion
 */
exports.up = function(knex) {
  return knex.schema.alterTable('tasks', function(table) {
    // Thêm trường completed_at để theo dõi thời gian hoàn thành thực tế
    table.timestamp('completed_at', { useTz: true }).nullable();
    
    // Thêm trường approved_by để biết ai duyệt task
    table.integer('approved_by').nullable();
    
    // Thêm trường approved_at để biết khi nào task được duyệt
    table.timestamp('approved_at', { useTz: true }).nullable();
    
    // Thêm index cho completed_at để query performance tốt hơn
    table.index('completed_at');
  })
  .then(() => {
    // Cập nhật enum status để thêm 'pending_approval'
    return knex.raw(`
      ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS tasks_status_check;
    `);
  })
  .then(() => {
    return knex.raw(`
      ALTER TABLE tasks 
      ADD CONSTRAINT tasks_status_check 
      CHECK (status IN ('todo', 'in_progress', 'pending_approval', 'done'));
    `);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('tasks', function(table) {
    table.dropColumn('completed_at');
    table.dropColumn('approved_by');
    table.dropColumn('approved_at');
  })
  .then(() => {
    return knex.raw(`
      ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS tasks_status_check;
    `);
  })
  .then(() => {
    return knex.raw(`
      ALTER TABLE tasks 
      ADD CONSTRAINT tasks_status_check 
      CHECK (status IN ('todo', 'in_progress', 'done'));
    `);
  });
};

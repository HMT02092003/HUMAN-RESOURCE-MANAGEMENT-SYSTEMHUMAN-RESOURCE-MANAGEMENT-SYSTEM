/**
 * Migration: Add task scheduling and dependency fields
 * - start_date: Ngày bắt đầu task (để phân tích overlap)
 * - depends_on: Array task_ids mà task này phụ thuộc (phải hoàn thành trước)
 * - ai_metadata: Lưu kết quả AI analysis (difficulty, recommendations, etc.)
 */
exports.up = async function(knex) {
  // Add start_date if not exists
  if (!(await knex.schema.hasColumn('tasks', 'start_date'))) {
    await knex.schema.table('tasks', function(table) {
      table.date('start_date').nullable();
    });
  }

  // Add depends_on if not exists
  if (!(await knex.schema.hasColumn('tasks', 'depends_on'))) {
    await knex.schema.table('tasks', function(table) {
      table.json('depends_on').nullable();
    });
  }

  // Add ai_metadata if not exists
  if (!(await knex.schema.hasColumn('tasks', 'ai_metadata'))) {
    await knex.schema.table('tasks', function(table) {
      table.json('ai_metadata').nullable();
    });
  }

  // Create index if not exists (use raw SQL to leverage IF NOT EXISTS)
  try {
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date)');
  } catch (e) {
    // ignore index creation errors
  }
};

exports.down = async function(knex) {
  // Remove index if exists
  try {
    await knex.raw('DROP INDEX IF EXISTS idx_tasks_start_date');
  } catch (e) {
    // ignore
  }

  if (await knex.schema.hasColumn('tasks', 'ai_metadata')) {
    await knex.schema.table('tasks', function(table) {
      table.dropColumn('ai_metadata');
    });
  }

  if (await knex.schema.hasColumn('tasks', 'depends_on')) {
    await knex.schema.table('tasks', function(table) {
      table.dropColumn('depends_on');
    });
  }

  if (await knex.schema.hasColumn('tasks', 'start_date')) {
    await knex.schema.table('tasks', function(table) {
      table.dropColumn('start_date');
    });
  }
};

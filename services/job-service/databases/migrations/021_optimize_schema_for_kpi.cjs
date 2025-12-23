/**
 * Migration 021 - Optimize schema for KPI reporting
 * - Simplify user_kpi table to store basic task completion records
 * - Track individual task completion status: early/on_time/late
 * - Easy aggregation for monthly KPI reports
 */

exports.up = async function(knex) {
  // Drop old user_kpi table if exists
  if (await knex.schema.hasTable('user_kpi')) {
    await knex.schema.dropTable('user_kpi');
  }

  // Create new simplified user_kpi table
  await knex.schema.createTable('user_kpi', function(table) {
    table.increments('kpi_id').primary();
    table.integer('user_id').notNullable().comment('ID người dùng');
    table.integer('project_id').notNullable().comment('ID dự án');
    table.string('task_id', 50).notNullable().comment('ID task');
    table.integer('month').notNullable().comment('Tháng (1-12)');
    table.integer('year').notNullable().comment('Năm');
    table.enum('completion_status', ['early', 'on_time', 'late'])
      .notNullable()
      .comment('Trạng thái hoàn thành: early=vượt tiến độ, on_time=đúng hạn, late=chậm tiến độ');
    table.integer('delay_days').nullable().comment('Số ngày chậm/sớm (âm=sớm, dương=chậm)');
    table.timestamp('completed_at', { useTz: true }).notNullable().comment('Thời gian hoàn thành task');
    table.timestamp('due_date', { useTz: true }).nullable().comment('Deadline của task');
    table.timestamp('approved_at', { useTz: true }).notNullable().comment('Thời gian duyệt task');
    table.integer('approved_by').notNullable().comment('Người duyệt');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    // Indexes for better query performance
    table.index(['user_id', 'month', 'year'], 'idx_user_kpi_user_month_year');
    table.index(['project_id', 'month', 'year'], 'idx_user_kpi_project_month_year');
    table.index(['user_id', 'project_id', 'month', 'year'], 'idx_user_kpi_full');
    table.index('completion_status', 'idx_user_kpi_status');
    table.index('task_id', 'idx_user_kpi_task');

    // Unique constraint: một task chỉ được ghi nhận KPI một lần
    table.unique(['task_id'], 'uq_user_kpi_task');
  });

  console.log('✅ Created simplified user_kpi table');

  console.log('✅ Created simplified user_kpi table');

  // Ensure tasks table has required columns for KPI tracking
  if (await knex.schema.hasTable('tasks')) {
    const columns = await knex('information_schema.columns')
      .select('column_name')
      .where({ table_name: 'tasks' });
    
    const colNames = columns.map(c => c.column_name);

    await knex.schema.table('tasks', function(table) {
      if (!colNames.includes('completed_at')) {
        table.timestamp('completed_at', { useTz: true }).nullable();
      }
      if (!colNames.includes('approved_at')) {
        table.timestamp('approved_at', { useTz: true }).nullable();
      }
      if (!colNames.includes('approved_by')) {
        table.integer('approved_by').nullable();
      }
    });

    console.log('✅ Updated tasks table with approval fields');
  }
};

exports.down = async function(knex) {
  // Drop the simplified user_kpi table
  if (await knex.schema.hasTable('user_kpi')) {
    await knex.schema.dropTable('user_kpi');
  }

  console.log('✅ Rolled back user_kpi table');
};

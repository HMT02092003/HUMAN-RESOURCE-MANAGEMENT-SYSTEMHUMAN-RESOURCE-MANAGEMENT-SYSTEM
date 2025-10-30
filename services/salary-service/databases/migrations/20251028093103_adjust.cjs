/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.table('monthly_payslips', function (table) {
    // Xóa tất cả các cột đã chỉ định
    table.dropColumns(
      'period_start',
      'period_end',
      'bonus',
      'other_income',
      'extra_bonus',
      'unemployment_insurance',
      'deduction_details',
      'working_days',
      'actual_working_days',
      'overtime_hours',
      'attendance_summary'
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.table('monthly_payslips', function (table) {
    // Thêm lại các cột với ĐẦY ĐỦ các thuộc tính
    // y như file migration gốc của bạn
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('bonus', 14, 2).defaultTo(0);
    table.decimal('other_income', 14, 2).defaultTo(0);
    table.decimal('extra_bonus', 14, 2).defaultTo(0);
    table.decimal('unemployment_insurance', 14, 2).defaultTo(0);
    table.jsonb('deduction_details').defaultTo(knex.raw("'[]'::jsonb"));
    table.integer('working_days').defaultTo(0);
    table.integer('actual_working_days').defaultTo(0);
    table.decimal('overtime_hours', 8, 2).defaultTo(0);
    table.jsonb('attendance_summary').defaultTo(knex.raw("'{}'::jsonb"));
  });
};
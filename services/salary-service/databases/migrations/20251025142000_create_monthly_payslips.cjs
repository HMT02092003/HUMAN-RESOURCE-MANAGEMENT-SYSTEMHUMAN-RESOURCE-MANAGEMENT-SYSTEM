exports.up = async function(knex) {
  await knex.schema.createTable('monthly_payslips', function(table) {
    table.bigIncrements('id').primary();
    table.text('user_id').notNullable().index();
    table.integer('year').notNullable();
    table.integer('month').notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('base_salary', 14, 2).notNullable().defaultTo(0);
    table.decimal('allowances', 14, 2).defaultTo(0);
    table.decimal('overtime_pay', 14, 2).defaultTo(0);
    table.decimal('bonus', 14, 2).defaultTo(0);
    table.decimal('other_income', 14, 2).defaultTo(0);
    table.decimal('gross_salary', 14, 2).notNullable().defaultTo(0);
    table.decimal('social_insurance', 14, 2).defaultTo(0);
    table.decimal('health_insurance', 14, 2).defaultTo(0);
    table.decimal('unemployment_insurance', 14, 2).defaultTo(0);
    table.decimal('personal_income_tax', 14, 2).defaultTo(0);
    table.decimal('total_deductions', 14, 2).defaultTo(0);
    table.decimal('extra_bonus', 14, 2).defaultTo(0);
    table.decimal('penalty_total', 14, 2).defaultTo(0);
    table.jsonb('deduction_details').defaultTo(knex.raw("'[]'::jsonb"));
    table.decimal('net_salary', 14, 2).notNullable().defaultTo(0);
    table.integer('working_days').defaultTo(0);
    table.integer('actual_working_days').defaultTo(0);
    table.decimal('overtime_hours', 8, 2).defaultTo(0);
    table.jsonb('attendance_summary').defaultTo(knex.raw("'{}'::jsonb"));
    table.text('status').notNullable().defaultTo('draft');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['user_id','year','month']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monthly_payslips');
};

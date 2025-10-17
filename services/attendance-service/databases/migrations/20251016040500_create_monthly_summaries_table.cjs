exports.up = function(knex) {
  return knex.schema.createTable('monthly_summaries', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.integer('month').notNullable();
    table.integer('year').notNullable();
    table.integer('totalWorkDays').defaultTo(0);
    table.decimal('totalWorkHours', 15, 2).defaultTo(0);
    table.integer('totalLateMinutes').defaultTo(0);
    table.integer('totalEarlyLeaveMinutes').defaultTo(0);
    table.decimal('totalOvertimeHours', 15, 2).defaultTo(0);
    table.decimal('totalOvertimeSalary', 15, 2).defaultTo(0);
    table.integer('totalPaidLeaveDays').defaultTo(0);
    table.decimal('totalPenalty', 15, 2).defaultTo(0);
    table.decimal('finalSalary', 15, 2).defaultTo(0);
    table.string('status', 20).defaultTo('IN_PROGRESS');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('monthly_summaries');
};

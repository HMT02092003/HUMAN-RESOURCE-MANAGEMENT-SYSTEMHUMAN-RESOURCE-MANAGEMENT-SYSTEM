exports.up = function(knex) {
  return knex.schema.alterTable('monthly_summaries', function(table) {
    table.integer('totalLateDays').defaultTo(0); // số ngày đi muộn
    table.integer('totalEarlyLeaveDays').defaultTo(0); // số ngày về sớm
    table.integer('totalLateMinutes').defaultTo(0);
    table.integer('totalEarlyLeaveMinutes').defaultTo(0);
    table.integer('totalOvertimeDays').defaultTo(0);
    table.decimal('totalOvertimeHours', 15, 2).defaultTo(0);
    table.decimal('totalOvertimeSalary', 15, 2).defaultTo(0);
    table.integer('totalPaidLeaveDays').defaultTo(0);
    table.integer('totalUnpaidLeaveDays').defaultTo(0);
    table.decimal('totalLatePenalty', 15, 2).defaultTo(0);
    table.decimal('totalEarlyLeavePenalty', 15, 2).defaultTo(0);
    table.decimal('totalPenalty', 15, 2).defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('monthly_summaries', function(table) {
    table.dropColumn('totalLateDays');
    table.dropColumn('totalEarlyLeaveDays');
    table.dropColumn('totalLateMinutes');
    table.dropColumn('totalEarlyLeaveMinutes');
    table.dropColumn('totalOvertimeDays');
    table.dropColumn('totalOvertimeHours');
    table.dropColumn('totalOvertimeSalary');
    table.dropColumn('totalPaidLeaveDays');
    table.dropColumn('totalUnpaidLeaveDays');
    table.dropColumn('totalLatePenalty');
    table.dropColumn('totalEarlyLeavePenalty');
    table.dropColumn('totalPenalty');
  });
};

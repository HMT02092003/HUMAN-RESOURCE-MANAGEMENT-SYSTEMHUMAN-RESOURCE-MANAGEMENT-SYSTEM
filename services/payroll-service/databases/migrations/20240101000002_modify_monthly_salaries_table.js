exports.up = async function(knex) {
  await knex.schema.alterTable('monthly_salaries', function(table) {
    table.decimal('monthlyWorkingDays', 15, 2).defaultTo(0);
    table.decimal('monthlyWorkingHours', 15, 2).defaultTo(0);
    table.decimal('monthlyLateMinutes', 15, 2).defaultTo(0);
    table.decimal('monthlyEarlyMinutes', 15, 2).defaultTo(0);
    table.decimal('monthlyLateCount', 15, 2).defaultTo(0);
    table.decimal('monthlyEarlyLeaveCount', 15, 2).defaultTo(0);
    table.decimal('monthlyOvertimeDays', 15, 2).defaultTo(0);
    table.decimal('monthlyOvertimeMinutes', 15, 2).defaultTo(0);
    table.decimal('monthlyMissingCheckCount', 15, 2).defaultTo(0);
    table.decimal('missingCheckPenalty', 15, 2).defaultTo(0);
    table.decimal('unauthorizedLeaveCount', 15, 2).defaultTo(0);
    table.decimal('unauthorizedLeavePenalty', 15, 2).defaultTo(0);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('monthly_salaries', function(table) {
    table.dropColumn('monthlyWorkingDays');
    table.dropColumn('monthlyWorkingHours');
    table.dropColumn('monthlyLateMinutes');
    table.dropColumn('monthlyEarlyMinutes');
    table.dropColumn('monthlyLateCount');
    table.dropColumn('monthlyEarlyLeaveCount');
    table.dropColumn('monthlyOvertimeDays');
    table.dropColumn('monthlyOvertimeMinutes');
    table.dropColumn('monthlyMissingCheckCount');
    table.dropColumn('missingCheckPenalty');
    table.dropColumn('unauthorizedLeaveCount');
    table.dropColumn('unauthorizedLeavePenalty');
  });
}; 
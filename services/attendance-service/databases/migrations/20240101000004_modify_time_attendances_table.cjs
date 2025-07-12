exports.up = async function(knex) {
  await knex.schema.alterTable('time_attendances', function(table) {
    table.dropColumn('dailyTotalWorkHours');
    table.dropColumn('lateMinutes');
    table.dropColumn('earlyDepartureMinutes');
  });

  await knex.schema.alterTable('time_attendances', function(table) {
    table.decimal('dailyTotalWorkHours', 15, 2).defaultTo(0);
    table.decimal('lateMinutes', 15, 2).defaultTo(0);
    table.decimal('earlyDepartureMinutes', 15, 2).defaultTo(0);
    table.decimal('dailyWorkingUnit', 15, 2).defaultTo(0);
    table.decimal('earlyLeavePenalty', 15, 2).defaultTo(0);
    table.decimal('lateArrivalPenalty', 15, 2).defaultTo(0);
    table.decimal('otWorkingUnit', 15, 2).defaultTo(0);
    table.decimal('otMinutes', 15, 2).defaultTo(0);
    table.decimal('otSalary', 15, 2).defaultTo(0);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('time_attendances', function(table) {
    table.dropColumn('dailyTotalWorkHours');
    table.dropColumn('lateMinutes');
    table.dropColumn('earlyDepartureMinutes');
    table.dropColumn('dailyWorkingUnit');
    table.dropColumn('earlyLeavePenalty');
    table.dropColumn('lateArrivalPenalty');
    table.dropColumn('otWorkingUnit');
    table.dropColumn('otMinutes');
    table.dropColumn('otSalary');
  });

  await knex.schema.alterTable('time_attendances', function(table) {
    table.jsonb('dailyTotalWorkHours');
    table.jsonb('lateMinutes');
    table.jsonb('earlyDepartureMinutes');
  });
}; 
exports.up = function(knex) {
  return knex.schema.createTable('time_attendances', function(table) {
    table.increments('id').primary();
    table.integer('userId').unsigned(); // Không join cross-service, chỉ lưu userId
    table.date('date').notNullable();
    table.timestamp('checkInTime');
    table.timestamp('checkOutTime');
    table.jsonb('dailyTotalWorkHours');
    table.jsonb('lateMinutes');
    table.jsonb('earlyDepartureMinutes');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('time_attendances');
}; 
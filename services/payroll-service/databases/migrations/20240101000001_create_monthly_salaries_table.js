exports.up = function(knex) {
  return knex.schema.createTable('monthly_salaries', function(table) {
    table.increments('id').primary();
    table.integer('userId').unsigned(); // Không join cross-service, chỉ lưu userId
    table.integer('month');
    table.integer('year');
    table.decimal('advanceSalary', 15, 2);
    table.decimal('latePenaltySalary', 15, 2);
    table.decimal('earlyPenaltySalary', 15, 2);
    table.decimal('overTimeSalary', 15, 2);
    table.decimal('tax', 15, 2);
    table.decimal('finalSalary', 15, 2);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('monthly_salaries');
}; 
exports.up = function(knex) {
  return knex.schema.createTable('contracts', function(table) {
    table.increments('id').primary();
    table.integer('contractTypeId', 10).unsigned().references('id').inTable('contract_types');
    table.integer('userId', 10).unsigned(); // Không join cross-service, chỉ lưu userId
    table.date('startDate');
    table.date('endDate');
    table.date('activeDay');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('contracts');
}; 
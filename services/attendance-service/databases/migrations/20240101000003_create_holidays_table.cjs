exports.up = function(knex) {
  return knex.schema.createTable('holidays', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('importance');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('holidays');
};

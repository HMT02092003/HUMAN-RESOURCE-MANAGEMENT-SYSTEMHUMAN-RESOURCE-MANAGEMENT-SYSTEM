exports.up = function(knex) {
  return knex.schema.createTable('departments', function(table) {
    table.increments('id').primary();
    table.string('name', 20).notNullable();
    table.string('description', 100);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('departments');
}; 
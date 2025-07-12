exports.up = function(knex) {
  return knex.schema.createTable('contract_types', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.integer('type');
    table.integer('insurance');
    table.string('description', 255);
    table.integer('contractTerm', 10);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('contract_types');
}; 
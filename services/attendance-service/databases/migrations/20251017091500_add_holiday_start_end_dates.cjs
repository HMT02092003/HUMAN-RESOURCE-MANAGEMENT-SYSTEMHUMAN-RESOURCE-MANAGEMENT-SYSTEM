exports.up = function(knex) {
  return knex.schema.alterTable('holidays', function(table) {
    table.date('start_date');
    table.date('end_date');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('holidays', function(table) {
    table.dropColumn('start_date');
    table.dropColumn('end_date');
  });
};

exports.up = function(knex) {
  return knex.schema.table('tasks', function(table) {
    // Add estimated_days as an integer number of days (canonical unit: 1 day = 8 hours)
    table.integer('estimated_days').defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.table('tasks', function(table) {
    table.dropColumn('estimated_days');
  });
};

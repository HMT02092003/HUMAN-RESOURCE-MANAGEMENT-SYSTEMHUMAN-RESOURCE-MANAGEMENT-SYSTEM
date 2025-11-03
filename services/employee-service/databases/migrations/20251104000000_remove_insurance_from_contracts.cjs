/**
 * Migration: Remove insurance column from contracts table
 * Insurance info is now handled by contract type, not individual contracts
 */
exports.up = function(knex) {
  return knex.schema.table('contracts', function(table) {
    table.dropColumn('insurance');
  });
};

exports.down = function(knex) {
  return knex.schema.table('contracts', function(table) {
    table.decimal('insurance', 14, 2);
  });
};

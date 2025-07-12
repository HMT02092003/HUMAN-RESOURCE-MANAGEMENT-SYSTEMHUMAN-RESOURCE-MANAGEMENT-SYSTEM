exports.up = async function(knex) {
  await knex.schema.alterTable('contracts', function(table) {
    table.integer('insurance').nullable().comment('Insurance amount or details');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('contracts', function(table) {
    table.dropColumn('insurance');
  });
}; 
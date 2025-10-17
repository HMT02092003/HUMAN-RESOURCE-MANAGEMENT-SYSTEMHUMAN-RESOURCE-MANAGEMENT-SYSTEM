exports.up = async function(knex) {
  await knex.schema.alterTable('time_attendances', function(table) {
    // Use varchar for portability; application will enforce enum values
    table.string('day_type', 50).defaultTo('WORKDAY');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('time_attendances', function(table) {
    table.dropColumn('day_type');
  });
};

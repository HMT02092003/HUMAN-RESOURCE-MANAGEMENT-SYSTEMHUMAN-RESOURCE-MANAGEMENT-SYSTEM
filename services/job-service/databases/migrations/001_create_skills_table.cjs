exports.up = function(knex) {
  return knex.schema.createTable('skills', function(table) {
    table.increments('skill_id').primary();
    table.string('skill_name', 100).notNullable().unique();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('skills');
};

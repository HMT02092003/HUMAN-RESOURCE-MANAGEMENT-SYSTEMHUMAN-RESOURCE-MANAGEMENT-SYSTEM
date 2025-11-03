exports.up = function(knex) {
  return knex.schema.createTable('user_skills', function(table) {
    table.integer('user_id').notNullable();
    table.integer('skill_id').notNullable()
      .references('skill_id').inTable('skills').onDelete('CASCADE');
    table.string('proficiency_level', 5);
    table.primary(['user_id', 'skill_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_skills');
};

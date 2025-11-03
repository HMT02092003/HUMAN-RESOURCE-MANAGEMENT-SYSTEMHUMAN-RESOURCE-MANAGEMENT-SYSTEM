exports.up = function(knex) {
  return knex.schema.createTable('job_required_skills', function(table) {
    table.uuid('job_id').notNullable().references('job_id').inTable('jobs').onDelete('CASCADE');
    table.integer('skill_id').notNullable().references('skill_id').inTable('skills').onDelete('CASCADE');
    table.string('proficiency_level', 5);
    table.primary(['job_id', 'skill_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('job_required_skills');
};

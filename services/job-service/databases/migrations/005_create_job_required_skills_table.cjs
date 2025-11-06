exports.up = function(knex) {
  return knex.schema.createTable('project_required_skills', function(table) {
    table.uuid('project_id').notNullable().references('project_id').inTable('projects').onDelete('CASCADE');
    table.integer('skill_id').notNullable().references('skill_id').inTable('skills').onDelete('CASCADE');
    table.string('proficiency_level', 50); // e.g., 'beginner', 'intermediate', 'advanced', 'expert'
    table.primary(['project_id', 'skill_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('project_required_skills');
};

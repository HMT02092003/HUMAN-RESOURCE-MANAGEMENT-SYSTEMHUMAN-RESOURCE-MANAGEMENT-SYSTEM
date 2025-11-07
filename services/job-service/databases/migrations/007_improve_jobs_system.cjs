exports.up = function(knex) {
  return knex.schema 
    // 2. Add more fields to project_suggestions table
    .table('project_suggestions', function(table) {
      table.text('ai_recommendation').nullable(); // AI-generated recommendation text
      table.integer('years_experience_required').nullable(); // Estimated years of experience needed
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('project_suggestions', function(table) {
      table.dropColumn('ai_recommendation');
      table.dropColumn('years_experience_required');
    });
};

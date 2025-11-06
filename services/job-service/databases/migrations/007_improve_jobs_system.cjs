exports.up = function(knex) {
  return knex.schema
    // 1. Add AI analysis fields to projects table
    .table('projects', function(table) {
      table.integer('difficulty_level').nullable(); // 1-5: AI estimated difficulty
      table.integer('estimated_total_hours').nullable(); // Total estimated hours for entire project
      table.json('ai_analysis_result').nullable(); // JSON string with AI analysis (recommended tech stack, team size, etc.)
    })
    
    // 2. Add more fields to project_suggestions table
    .table('project_suggestions', function(table) {
      table.text('ai_recommendation').nullable(); // AI-generated recommendation text
      table.integer('years_experience_required').nullable(); // Estimated years of experience needed
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('projects', function(table) {
      table.dropColumn('difficulty_level');
      table.dropColumn('estimated_total_hours');
      table.dropColumn('ai_analysis_result');
    })
    .table('project_suggestions', function(table) {
      table.dropColumn('ai_recommendation');
      table.dropColumn('years_experience_required');
    });
};

exports.up = function(knex) {
  return knex.schema
    // 1. Add project_id to jobs table
    .table('jobs', function(table) {
      table.string('project_id', 50).nullable();
      table.integer('difficulty_level').nullable(); // 1-5: AI estimated difficulty
      table.integer('estimated_hours').nullable();
      table.text('ai_analysis_result').nullable(); // JSON string with AI analysis
    })
    
    // 2. Improve job_suggestions table
    .table('job_suggestions', function(table) {
      table.text('matched_skills').nullable(); // JSON array of matched skills
      table.text('missing_skills').nullable(); // JSON array of skills user doesn't have
      table.integer('skill_match_count').defaultTo(0);
      table.integer('total_required_skills').defaultTo(0);
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('jobs', function(table) {
      table.dropColumn('project_id');
      table.dropColumn('difficulty_level');
      table.dropColumn('estimated_hours');
      table.dropColumn('ai_analysis_result');
    })
    .table('job_suggestions', function(table) {
      table.dropColumn('matched_skills');
      table.dropColumn('missing_skills');
      table.dropColumn('skill_match_count');
      table.dropColumn('total_required_skills');
    });
};

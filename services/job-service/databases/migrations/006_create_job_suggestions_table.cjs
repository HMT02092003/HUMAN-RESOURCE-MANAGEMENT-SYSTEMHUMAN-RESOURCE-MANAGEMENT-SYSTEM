exports.up = function(knex) {
  return knex.schema.createTable('project_suggestions', function(table) {
  // Use gen_random_uuid() to generate UUIDs in Postgres
  table.uuid('suggestion_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('project_id', 64).notNullable().references('project_id').inTable('projects').onDelete('CASCADE');
    table.integer('user_id').notNullable(); // Foreign key to employee-service
    table.decimal('match_score', 5, 2); // Skill match percentage (0-100)
    table.enum('status', ['pending', 'viewed', 'applied', 'accepted', 'rejected']).defaultTo('pending');
    table.json('matched_skills').nullable(); // JSON array of matched skills
    table.json('missing_skills').nullable(); // JSON array of skills user doesn't have
    table.integer('skill_match_count').defaultTo(0);
    table.integer('total_required_skills').defaultTo(0);
    table.timestamp('generated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index('project_id');
    table.index('user_id');
    table.index('status');
    table.index('match_score');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('project_suggestions');
};

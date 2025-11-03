exports.up = function(knex) {
  return knex.schema.createTable('jobs', function(table) {
    table.uuid('job_id').primary();
    table.string('title', 255);
    table.text('description');
    table.string('status', 50);
  table.integer('created_by_user_id');
  table.integer('assigned_to_user_id').nullable();
    table.string('ai_analysis_status', 20);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('jobs');
};

exports.up = function(knex) {
  return knex.schema.createTable('job_suggestions', function(table) {
    table.uuid('suggestion_id').primary();
    table.uuid('job_id').notNullable().references('job_id').inTable('jobs').onDelete('CASCADE');
  table.integer('user_id').notNullable();
    table.decimal('match_score', 5, 2);
    table.string('status', 30);
    table.timestamp('generated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('job_suggestions');
};

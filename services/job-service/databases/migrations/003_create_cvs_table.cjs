exports.up = function(knex) {
  return knex.schema.createTable('cvs', function(table) {
    table.uuid('cv_id').primary();
    table.integer('user_id').notNullable().index();
    table.string('file_path', 500);
  table.text('original_text');
    table.timestamp('uploaded_at', { useTz: true }).defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('cvs');
};

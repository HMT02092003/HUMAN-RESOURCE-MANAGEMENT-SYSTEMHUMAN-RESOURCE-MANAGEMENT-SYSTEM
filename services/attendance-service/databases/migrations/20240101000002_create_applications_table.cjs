exports.up = function(knex) {
  return knex.schema.createTable('applications', function(table) {
    table.increments('id').primary();
    table.string('type', 255).notNullable();
    table.integer('status').notNullable();
    table.jsonb('data').defaultTo('{}');
    table.integer('userId').unsigned().notNullable(); // Không join cross-service, chỉ lưu userId
    table.integer('userApprovedId').unsigned(); // Không join cross-service, chỉ lưu userId
    table.timestamp('approvedDate');
    table.text('reason');
    table.text('note');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('applications');
}; 
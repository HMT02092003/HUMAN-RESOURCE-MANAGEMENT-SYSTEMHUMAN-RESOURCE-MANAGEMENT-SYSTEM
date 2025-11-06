exports.up = function(knex) {
  return knex.schema.createTable('projects', function(table) {
    // Use gen_random_uuid() from pgcrypto for Postgres
    table.uuid('project_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled']).defaultTo('planning');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('budget', 15, 2).defaultTo(0);
    table.decimal('spent', 15, 2).defaultTo(0);
    table.string('client', 255);
    table.integer('progress').defaultTo(0); // 0-100
    table.integer('manager_id').notNullable(); // Foreign key to employee-service
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index('status');
    table.index('manager_id');
    table.index('start_date');
    table.index('end_date');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('projects');
};

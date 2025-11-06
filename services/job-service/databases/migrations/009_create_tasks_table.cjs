exports.up = function(knex) {
  return knex.schema.createTable('tasks', function(table) {
  // Use gen_random_uuid() from pgcrypto
  table.uuid('task_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable()
      .references('project_id').inTable('projects').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.enum('status', ['todo', 'in_progress', 'review', 'done']).defaultTo('todo');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.integer('assignee_id').nullable(); // Foreign key to employee-service
    table.date('due_date').nullable();
    table.integer('estimated_hours').defaultTo(0);
    table.integer('actual_hours').defaultTo(0);
    table.json('tags').nullable(); // Store tags as JSON array
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index('project_id');
    table.index('status');
    table.index('priority');
    table.index('assignee_id');
    table.index('due_date');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('tasks');
};

exports.up = function(knex) {
  return knex.schema.createTable('project_timeline', function(table) {
  // Use gen_random_uuid() from pgcrypto
  table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable()
      .references('project_id').inTable('projects').onDelete('CASCADE');
    table.enum('event_type', [
      'created', 
      'updated', 
      'status_changed', 
      'member_added', 
      'member_removed', 
      'task_created',
      'task_completed',
      'milestone_reached',
      'budget_updated',
      'comment_added'
    ]).notNullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('user_id').nullable(); // Who triggered this event
    table.json('metadata').nullable(); // Store additional data like old/new values
    table.timestamp('event_time', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index('project_id');
    table.index('event_type');
    table.index('user_id');
    table.index('event_time');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('project_timeline');
};

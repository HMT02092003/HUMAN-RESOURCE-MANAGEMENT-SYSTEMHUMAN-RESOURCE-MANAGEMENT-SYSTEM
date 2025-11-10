exports.up = function(knex) {
  return knex.schema.createTable('project_members', function(table) {
    table.integer('project_id').unsigned().notNullable()
      .references('project_id').inTable('projects').onDelete('CASCADE');
    table.integer('user_id').notNullable(); // Foreign key to employee-service
    table.string('role', 100); // e.g., 'Developer', 'Designer', 'Tester', etc.
    table.timestamp('joined_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Composite primary key
    table.primary(['project_id', 'user_id']);
    
    // Indexes
    table.index('user_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('project_members');
};


export async function up(knex) {
  return knex.schema.createTable('email_templates', function (table) {
    table.increments();
    table.string('name').nullable();
    table.string('key').notNullable().unique();
    table.string('subject').nullable();
    table.text('content').nullable();
    table.jsonb('variables').nullable();
    table.integer('active').defaultTo(1);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
};

export async function down(knex) {
  return knex.schema.dropTable('email_templates');
};
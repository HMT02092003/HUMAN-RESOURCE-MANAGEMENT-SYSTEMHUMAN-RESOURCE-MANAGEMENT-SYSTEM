
export async function up(knex) {
  return knex.schema.createTable('permissions', function (table) {
    table.increments();
    table.string('name').nullable();
    table.text('description').nullable();
    table.integer('value').defaultTo(0);
    table.string('key').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.integer('createdBy').nullable().index().references('id').inTable('users')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });
};

export async function down(knex) {
  return knex.schema.dropTable('permissions');
};
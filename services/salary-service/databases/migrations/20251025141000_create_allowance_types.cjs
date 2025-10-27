exports.up = async function(knex) {
  await knex.schema.createTable('allowance_types', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.boolean('is_taxable').defaultTo(false);
    table.decimal('default_amount', 14, 2).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('allowance_types');
};

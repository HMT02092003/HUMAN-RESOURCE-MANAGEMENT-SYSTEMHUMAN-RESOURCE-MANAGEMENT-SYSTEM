exports.up = async function(knex) {
  await knex.schema.createTable('employee_salary_profile_allowances', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('employee_salary_profile_id').unsigned().notNullable()
      .references('id').inTable('employee_salary_profiles').onDelete('CASCADE');
    table.integer('allowance_type_id').unsigned().nullable()
      .references('id').inTable('allowance_types').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('employee_salary_profile_allowances');
};

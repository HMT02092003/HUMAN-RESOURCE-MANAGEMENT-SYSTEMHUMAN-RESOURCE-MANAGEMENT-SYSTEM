exports.up = async function(knex) {
  await knex.schema.createTable('employee_salary_profiles', function(table) {
    table.bigIncrements('id').primary();
    table.text('user_id').notNullable().unique().index();
    table.decimal('base_salary', 14, 2).notNullable().defaultTo(0);
    table.decimal('insurance_salary', 14, 2).notNullable().defaultTo(0);
    table.text('tax_code').unique();
    table.jsonb('bank_info').defaultTo(knex.raw(`'{"bank_name":"","account_number":"","account_holder":""}'::jsonb`));
    table.date('effective_from');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('employee_salary_profiles');
};

exports.up = async function(knex) {
  await knex.schema.createTable('employee_salary_profiles', function(table) {
    table.bigIncrements('id').primary();
    table.text('user_id').notNullable().index(); // Removed unique constraint to allow multiple salary records per user
    table.decimal('base_salary', 14, 2).notNullable().defaultTo(0);
    table.decimal('insurance_salary', 14, 2).notNullable().defaultTo(0);
    table.text('tax_code');
    table.jsonb('bank_info').defaultTo(knex.raw(`'{"bank_name":"","account_number":"","account_holder":""}'::jsonb`));
    table.date('effective_from').notNullable(); // Make this required for proper historical tracking
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add composite index for efficient queries: get latest salary for a user
    table.index(['user_id', 'effective_from']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('employee_salary_profiles');
};

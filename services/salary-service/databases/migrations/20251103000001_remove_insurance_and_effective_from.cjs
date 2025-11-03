/**
 * Migration: Remove insurance_salary and effective_from from employee_salary_profiles
 * These fields are no longer needed because:
 * - Each contract has one salary profile (contract_id foreign key)
 * - Contract dates handle validity period
 */
exports.up = async function(knex) {
  await knex.schema.table('employee_salary_profiles', function(table) {
    table.dropColumn('insurance_salary');
    table.dropColumn('effective_from');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('employee_salary_profiles', function(table) {
    table.decimal('insurance_salary', 14, 2).notNullable().defaultTo(0);
    table.date('effective_from');
    table.index(['user_id', 'effective_from']);
  });
};

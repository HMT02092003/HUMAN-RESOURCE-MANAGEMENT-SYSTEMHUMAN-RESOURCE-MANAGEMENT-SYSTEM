/**
 * Migration: Add contract_id to employee_salary_profiles table
 * This links salary profiles directly to contracts instead of just users
 */
exports.up = async function(knex) {
  await knex.schema.table('employee_salary_profiles', function(table) {
    // Add contract_id as bigint to match contracts.id type
    table.bigInteger('contract_id').nullable().index();
    
    // Add comment for clarity
    table.comment('Links salary profile to a specific contract');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('employee_salary_profiles', function(table) {
    table.dropColumn('contract_id');
  });
};

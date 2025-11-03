/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('employee_salary_profiles', function(table) {
    table.dropColumn('tax_code');
    table.dropColumn('bank_info');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('employee_salary_profiles', function(table) {
    table.string('tax_code', 50);
    table.text('bank_info');
  });
};

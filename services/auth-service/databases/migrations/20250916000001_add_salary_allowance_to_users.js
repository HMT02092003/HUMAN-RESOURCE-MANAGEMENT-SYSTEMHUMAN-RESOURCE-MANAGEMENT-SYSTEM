/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.decimal('salary', 15, 2).nullable().comment('Lương cơ bản của nhân viên');
    table.decimal('allowance', 15, 2).nullable().comment('Phụ cấp của nhân viên');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('salary');
    table.dropColumn('allowance');
  });
};

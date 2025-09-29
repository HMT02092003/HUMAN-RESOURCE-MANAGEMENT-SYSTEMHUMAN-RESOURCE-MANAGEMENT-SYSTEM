/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// 🟢 Use 'export function' instead of 'exports.up = function'
export function up(knex) {
  return knex.schema.table('users', (table) => {
    table.integer('monthly_leave_balance').defaultTo(0);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// 🟢 Use 'export function' instead of 'exports.down = function'
export function down(knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('monthly_leave_balance');
  });
}
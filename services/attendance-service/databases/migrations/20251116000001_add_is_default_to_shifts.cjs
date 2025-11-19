/**
 * Migration: Thêm trường is_default vào bảng shifts
 * Để đánh dấu ca làm việc mặc định (ca hành chính)
 */

exports.up = function(knex) {
  return knex.schema.table('shifts', function(table) {
    table.boolean('is_default').defaultTo(false).notNullable();
    table.index('is_default');
  });
};

exports.down = function(knex) {
  return knex.schema.table('shifts', function(table) {
    table.dropColumn('is_default');
  });
};

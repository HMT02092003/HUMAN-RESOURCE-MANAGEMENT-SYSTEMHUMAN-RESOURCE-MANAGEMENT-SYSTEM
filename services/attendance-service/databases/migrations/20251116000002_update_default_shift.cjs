/**
 * Migration: Đánh dấu ca hành chính (id=1) là ca mặc định
 */

exports.up = async function(knex) {
  // Đặt ca hành chính (id=1) là mặc định
  await knex('shifts')
    .where('id', 1)
    .update({ is_default: true });
};

exports.down = async function(knex) {
  // Reset lại
  await knex('shifts')
    .where('id', 1)
    .update({ is_default: false });
};

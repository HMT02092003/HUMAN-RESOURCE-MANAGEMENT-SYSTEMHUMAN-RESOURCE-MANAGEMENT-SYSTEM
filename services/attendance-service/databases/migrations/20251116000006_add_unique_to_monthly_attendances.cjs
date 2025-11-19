/**
 * Migration: Add unique constraint on monthly_attendances (userId, month)
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('monthly_attendances', table => {
    table.unique(['userId', 'month']);
  });
  
  console.log('✅ Added unique constraint on (userId, month) to monthly_attendances');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('monthly_attendances', table => {
    table.dropUnique(['userId', 'month']);
  });
  
  console.log('✅ Dropped unique constraint from monthly_attendances');
};

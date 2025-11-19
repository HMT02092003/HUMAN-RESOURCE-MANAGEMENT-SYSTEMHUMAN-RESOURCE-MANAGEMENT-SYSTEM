/**
 * Migration: Remove deprecated OT columns (otMinutes, otSalary)
 * Date: 2025-11-17
 * 
 * Reason: Chuyển sang tính OT theo working units (công)
 */

exports.up = async function(knex) {
  console.log('🗑️  Removing deprecated OT columns...');
  
  // Check if columns exist before dropping
  const hasOtMinutes = await knex.schema.hasColumn('time_attendances', 'otMinutes');
  const hasOtSalary = await knex.schema.hasColumn('time_attendances', 'otSalary');
  
  if (hasOtMinutes || hasOtSalary) {
    await knex.schema.alterTable('time_attendances', (table) => {
      if (hasOtMinutes) {
        table.dropColumn('otMinutes');
        console.log('   ✅ Dropped otMinutes');
      }
      if (hasOtSalary) {
        table.dropColumn('otSalary');
        console.log('   ✅ Dropped otSalary');
      }
    });
  }
  
  console.log('✅ Migration completed');
};

exports.down = async function(knex) {
  console.log('⏪ Rolling back: Re-adding deprecated OT columns...');
  
  await knex.schema.alterTable('time_attendances', (table) => {
    table.decimal('otMinutes', 10, 2).defaultTo(0).comment('DEPRECATED: Use otWorkingUnit instead');
    table.decimal('otSalary', 14, 2).defaultTo(0).comment('DEPRECATED: Calculate from working units');
  });
  
  console.log('✅ Rollback completed');
};

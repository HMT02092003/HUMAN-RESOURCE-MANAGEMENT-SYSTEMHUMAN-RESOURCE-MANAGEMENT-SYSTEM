/**
 * Migration: Thêm trường overtimeHours vào time_attendances và monthly_attendances
 * 
 * Mục đích:
 * - Lưu tổng số giờ làm thêm (raw hours) cho từng ngày
 * - Lưu tổng số giờ làm thêm tích lũy trong tháng
 * - Tách biệt giờ OT (hours) với công OT (working units đã nhân hệ số)
 */

exports.up = async function(knex) {
  // 1. Kiểm tra và thêm cột overtimeHours vào time_attendances nếu chưa có
  const hasOvertimeHoursInDaily = await knex.schema.hasColumn('time_attendances', 'overtimeHours');
  if (!hasOvertimeHoursInDaily) {
    await knex.schema.table('time_attendances', (table) => {
      table.decimal('overtimeHours', 10, 2).defaultTo(0).comment('Tổng số giờ làm thêm trong ngày (chưa nhân hệ số)');
    });
    console.log('✅ Added overtimeHours to time_attendances');
  }

  // 2. Kiểm tra và thêm cột totalOvertimeHours vào monthly_attendances nếu chưa có
  const hasMonthlyTable = await knex.schema.hasTable('monthly_attendances');
  if (hasMonthlyTable) {
    const hasOvertimeHoursInMonthly = await knex.schema.hasColumn('monthly_attendances', 'totalOvertimeHours');
    if (!hasOvertimeHoursInMonthly) {
      await knex.schema.table('monthly_attendances', (table) => {
        table.decimal('totalOvertimeHours', 10, 2).defaultTo(0).comment('Tổng số giờ làm thêm trong tháng (chưa nhân hệ số)');
      });
      console.log('✅ Added totalOvertimeHours to monthly_attendances');
    }
  }
};

exports.down = async function(knex) {
  // Rollback: xóa các cột đã thêm
  await knex.schema.table('time_attendances', (table) => {
    table.dropColumn('overtimeHours');
  });

  const hasMonthlyTable = await knex.schema.hasTable('monthly_attendances');
  if (hasMonthlyTable) {
    await knex.schema.table('monthly_attendances', (table) => {
      table.dropColumn('totalOvertimeHours');
    });
  }

  console.log('✅ Rolled back overtimeHours columns');
};

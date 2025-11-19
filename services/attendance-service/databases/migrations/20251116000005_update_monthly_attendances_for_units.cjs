/**
 * Migration: Cập nhật bảng monthly_attendances cho hệ thống tính công
 * - Xóa cột totalOvertimeSalary (không dùng nữa, tính theo công)
 * Note: totalWorkingUnits và totalOtWorkingUnits đã tồn tại từ migrations trước
 */

exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('monthly_attendances', 'totalOvertimeSalary');
  
  if (hasColumn) {
    await knex.schema.table('monthly_attendances', function(table) {
      table.dropColumn('totalOvertimeSalary');
    });
    console.log('✅ Dropped totalOvertimeSalary column from monthly_attendances');
  } else {
    console.log('ℹ️ Column totalOvertimeSalary does not exist, skipping');
  }
  
  // Kiểm tra và thêm các cột nếu chưa có
  const hasWorkingUnits = await knex.schema.hasColumn('monthly_attendances', 'totalWorkingUnits');
  const hasOtUnits = await knex.schema.hasColumn('monthly_attendances', 'totalOtWorkingUnits');
  
  if (!hasWorkingUnits || !hasOtUnits) {
    await knex.schema.table('monthly_attendances', function(table) {
      if (!hasWorkingUnits) {
        table.decimal('totalWorkingUnits', 10, 4).defaultTo(0);
        console.log('✅ Added totalWorkingUnits column');
      }
      if (!hasOtUnits) {
        table.decimal('totalOtWorkingUnits', 10, 4).defaultTo(0);
        console.log('✅ Added totalOtWorkingUnits column');
      }
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('monthly_attendances', 'totalOvertimeSalary');
  
  if (!hasColumn) {
    await knex.schema.table('monthly_attendances', function(table) {
      table.decimal('totalOvertimeSalary', 15, 2).defaultTo(0);
    });
    console.log('✅ Restored totalOvertimeSalary column');
  }
};

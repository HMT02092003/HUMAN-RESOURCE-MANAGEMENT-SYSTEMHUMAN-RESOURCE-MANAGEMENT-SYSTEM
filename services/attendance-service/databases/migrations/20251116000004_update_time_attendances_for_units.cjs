/**
 * Migration: Cập nhật bảng time_attendances cho hệ thống tính công
 * - Thêm cột totalWorkingUnit: Tổng công trong ngày (bao gồm cả công OT)
 * - Thêm cột otWorkingUnit: Công OT riêng biệt
 * - Set otSalary = 0 (không tính lương OT riêng nữa)
 */

exports.up = function(knex) {
  return knex.schema.table('time_attendances', function(table) {
    // Thêm cột tổng công (bao gồm cả OT)
    table.decimal('totalWorkingUnit', 10, 4).defaultTo(0);
    
    // Thêm cột công OT riêng (để báo cáo)
    table.decimal('otWorkingUnit', 10, 4).defaultTo(0);
    
    // Thêm index để query nhanh
    table.index(['userId', 'date']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('time_attendances', function(table) {
    table.dropColumn('totalWorkingUnit');
    table.dropColumn('otWorkingUnit');
  });
};

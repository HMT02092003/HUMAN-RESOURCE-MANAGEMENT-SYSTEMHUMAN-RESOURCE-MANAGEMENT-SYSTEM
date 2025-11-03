/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  // Hàm "up" sẽ xóa 3 cột này
  return knex.schema.table('users', function(table) {
    // Xóa cột vacationDay
    table.dropColumn('vacationDay');
    
    // Xóa cột baseSalary
    table.dropColumn('baseSalary');
    
    // Xóa cột allowance
    table.dropColumn('allowance');
    table.dropColumn('salary');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  // Hàm "down" (để rollback) sẽ tạo lại 3 cột này
  // Quan trọng: Hãy kiểm tra lại kiểu dữ liệu gốc cho chính xác
  return knex.schema.table('users', function(table) {
    
    // Tạo lại cột vacationDay
    table.integer('vacationDay');
    
    // Tạo lại cột baseSalary (dựa theo ảnh của bạn)
    table.decimal('baseSalary', 15, 2);
    
    // Tạo lại cột allowance (dựa theo ảnh của bạn)
    table.decimal('allowance', 15, 2);
    table.dropColumn('salary');
  });
};
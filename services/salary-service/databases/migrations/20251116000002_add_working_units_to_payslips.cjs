/**
 * Migration: Add working units tracking to monthly_payslips table
 * Date: 2025-01-16
 * Description: Add fields for work-unit-based salary calculation
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('monthly_payslips', table => {
    // Tổng công (bao gồm cả công OT)
    table.decimal('total_working_units', 10, 4).defaultTo(0).comment('Tổng số công trong tháng (bao gồm công OT)');
    
    // Công OT
    table.decimal('total_ot_working_units', 10, 4).defaultTo(0).comment('Tổng số công OT trong tháng');
    
    // Số công chuẩn trong tháng
    table.decimal('standard_working_days', 10, 2).defaultTo(22).comment('Số công chuẩn trong tháng (từ WorkingDays setting)');
    
    // Lương/công
    table.decimal('salary_per_unit', 15, 2).defaultTo(0).comment('Lương trên mỗi công (baseSalary / standardWorkingDays)');
    
    // Lương từ công
    table.decimal('salary_from_units', 15, 2).defaultTo(0).comment('Lương tính từ công (salaryPerUnit * totalWorkingUnits)');
  });
  
  console.log('✅ Added working units fields to monthly_payslips table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('monthly_payslips', table => {
    table.dropColumn('total_working_units');
    table.dropColumn('total_ot_working_units');
    table.dropColumn('standard_working_days');
    table.dropColumn('salary_per_unit');
    table.dropColumn('salary_from_units');
  });
  
  console.log('✅ Dropped working units fields from monthly_payslips table');
};

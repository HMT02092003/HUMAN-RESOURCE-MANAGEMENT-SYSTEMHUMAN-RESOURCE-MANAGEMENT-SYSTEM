// migrations/YYYYMMDDHHMMSS_update_unique_on_profiles.cjs

// Dùng "exports.up" thay vì "export async function up"
export async function up(knex) {
  await knex.schema.alterTable('employee_salary_profiles', function(table) {
    
    // 1. Xóa bỏ ràng buộc unique CHỈ trên 'user_id'
    table.dropUnique(['user_id']);
    
    // 2. Xóa bỏ ràng buộc unique CHỈ trên 'tax_code'
    table.dropUnique(['tax_code']);

    // 3. Tạo một ràng buộc unique MỚI (khóa tổ hợp)
    table.unique(['user_id', 'effective_from'], { indexName: 'employee_salary_profiles_user_effective_from_key' });
  });
};

// Dùng "exports.down" thay vì "export async function down"
export async function down(knex) {
  await knex.schema.alterTable('employee_salary_profiles', function(table) {
    
    // 1. Xóa ràng buộc tổ hợp đã tạo ở trên
    table.dropUnique(['user_id', 'effective_from'], 'employee_salary_profiles_user_effective_from_key');
    
    // 2. Thêm lại các ràng buộc unique ban đầu
    table.unique(['tax_code']);
    table.unique(['user_id']);
  });
};
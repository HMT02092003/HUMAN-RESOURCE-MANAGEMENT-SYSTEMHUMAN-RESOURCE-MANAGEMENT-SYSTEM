/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('employee_salary_profiles', (table) => {
    // Chỉ xóa ràng buộc UNIQUE tổ hợp cũ
    // Chúng ta không thêm bất kỳ ràng buộc mới nào ở đây
    table.dropUnique(
      ['user_id', 'effective_from'],
      'employee_salary_profiles_user_effective_from_key'
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('employee_salary_profiles', (table) => {
    // Hàm down sẽ tạo lại ràng buộc cũ, để có thể rollback
    table.unique(['user_id', 'effective_from'], {
      indexName: 'employee_salary_profiles_user_effective_from_key',
      constraintName: 'employee_salary_profiles_user_effective_from_key' 
    });
  });
};
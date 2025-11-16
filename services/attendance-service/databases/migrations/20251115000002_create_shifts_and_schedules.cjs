/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Bảng 1: shifts (MẪU CA LÀM VIỆC)
    // Định nghĩa các mẫu ca mà nhân viên có thể chọn
    .createTable('shifts', function(table) {
      table.increments('id').primary();
      table.string('name', 150).notNullable();
      table.time('start_time').notNullable();
      table.time('end_time').notNullable();
      
      // Số công của ca: 1.0 (cả ngày), 0.5 (nửa ngày)
      table.decimal('working_unit', 3, 1).notNullable().defaultTo(1.0);
      
      table.text('description');
      table.timestamps(true, true); // Tự động tạo created_at và updated_at
    })
    
    // Bảng 2: employee_schedules (LỊCH LÀM VIỆC ĐÃ ĐĂNG KÝ)
    // Gán một user với một ca vào một ngày cụ thể
    .createTable('employee_schedules', function(table) {
      table.increments('id').primary();
      
      // --- YÊU CẦU CỦA BẠN ---
      // Chỉ lưu user_id, không có bảng users cục bộ
      // Không có ràng buộc khóa ngoại (FOREIGN KEY)
      table.integer('user_id').notNullable().index();
      
      // Khóa ngoại đến bảng 'shifts'
      table.integer('shift_id').unsigned().notNullable();
      table.foreign('shift_id').references('shifts.id').onDelete('RESTRICT');
      
      table.date('date').notNullable();
      
      // Flow duyệt đơn
      table.string('status', 50).notNullable().defaultTo('pending');
      table.check("status IN ('pending', 'approved', 'rejected')");
      
      // ID của người duyệt (cũng chỉ lưu ID)
      table.integer('approved_by').unsigned().nullable();
      table.timestamp('approved_at').nullable();
      
      table.text('notes'); // Ghi chú của nhân viên khi đăng ký
      table.timestamps(true, true);
      
      // Đảm bảo một nhân viên chỉ có 1 lịch trong 1 ngày
      table.unique(['user_id', 'date']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Xóa theo thứ tự ngược lại (phụ thuộc trước)
  return knex.schema
    .dropTableIfExists('employee_schedules')
    .dropTableIfExists('shifts');
};

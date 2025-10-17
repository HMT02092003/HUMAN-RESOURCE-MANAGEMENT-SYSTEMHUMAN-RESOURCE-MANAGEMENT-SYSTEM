/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('monthly_attendances', function(table) {
    table.increments('id').primary();
    table.integer('userId').notNullable();
    table.string('month', 7).notNullable(); // YYYY-MM

    // --- Thống kê số ngày công ---
    table.integer('totalScheduledDays').defaultTo(0); // Tổng số ngày làm việc theo lịch
    table.integer('presentDays').defaultTo(0); // Số ngày có mặt
    table.integer('absentDays').defaultTo(0); // Số ngày vắng
    table.integer('approvedLeaveDays').defaultTo(0); // Số ngày nghỉ phép có duyệt
    table.integer('unauthorizedAbsenceDays').defaultTo(0); // Số ngày vắng không phép
    table.integer('businessTripDays').defaultTo(0); // Số ngày đi công tác
    
    // --- Thống kê vi phạm ---
    table.integer('lateDays').defaultTo(0); // Số ngày đi trễ
    table.integer('earlyLeaveDays').defaultTo(0); // Số ngày về sớm
    table.integer('totalLateMinutes').defaultTo(0); // Tổng số phút đi trễ
    table.integer('totalEarlyLeaveMinutes').defaultTo(0); // Tổng số phút về sớm

    // --- Thống kê giờ làm & công ---
    table.decimal('totalWorkHours', 10, 2).defaultTo(0); // Tổng giờ làm thực tế
    table.decimal('averageWorkHours', 10, 2).defaultTo(0); // Giờ làm trung bình/ngày
    table.decimal('totalWorkingUnits', 6, 2).defaultTo(0); // Tổng số công trong tháng

    // --- Thống kê Overtime (OT) ---
    table.decimal('totalOvertimeHours', 10, 2).defaultTo(0); // Tổng số giờ OT
    table.decimal('totalOtWorkingUnits', 6, 2).defaultTo(0); // Tổng số công OT
    
    // --- Thống kê tài chính & lương ---
    table.decimal('totalLatePenalty', 14, 2).defaultTo(0); // Tổng tiền phạt đi trễ
    table.decimal('totalEarlyLeavePenalty', 14, 2).defaultTo(0); // Tổng tiền phạt về sớm
    table.decimal('totalUnauthorizedAbsencePenalty', 14, 2).defaultTo(0); // Tổng tiền phạt vắng không phép
    table.decimal('totalPenalty', 14, 2).defaultTo(0); // Tổng cộng các khoản phạt
    table.decimal('totalOvertimeSalary', 14, 2).defaultTo(0); // Tổng lương OT
    
    // --- Trạng thái & người duyệt ---
    table.boolean('isApproved').defaultTo(false);
    table.integer('approvedBy').nullable();
    table.foreign('approvedBy'); // Giả sử bạn có bảng users
    table.timestamp('approvedAt').nullable();
    table.text('notes').nullable(); // Ghi chú từ người duyệt

    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('monthly_attendances');
};
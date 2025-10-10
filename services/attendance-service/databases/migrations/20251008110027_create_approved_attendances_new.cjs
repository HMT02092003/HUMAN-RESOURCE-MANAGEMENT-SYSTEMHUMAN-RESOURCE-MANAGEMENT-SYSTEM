/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('approved_attendances', function(table) {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable();
    table.integer('departmentId').unsigned().notNullable();
    table.string('month').notNullable(); // Format: YYYY-MM
    table.date('date').notNullable();
    
    // Thông tin chấm công cơ bản
    table.time('checkInTime').nullable();
    table.time('checkOutTime').nullable();
    table.decimal('dailyTotalWorkHours', 5, 2).defaultTo(0);
    table.integer('lateMinutes').defaultTo(0);
    table.integer('earlyDepartureMinutes').defaultTo(0);
    
    // Thông tin tính toán lương
    table.decimal('dailyWorkingUnit', 5, 2).defaultTo(0);
    table.decimal('earlyLeavePenalty', 12, 2).defaultTo(0);
    table.decimal('lateArrivalPenalty', 12, 2).defaultTo(0);
    
    // Thông tin overtime
    table.decimal('otWorkingUnit', 5, 2).defaultTo(0);
    table.integer('otMinutes').defaultTo(0);
    table.decimal('otSalary', 12, 2).defaultTo(0);
    
    // Thông tin thống kê tháng
    table.integer('totalWorkDays').defaultTo(0);
    table.decimal('totalWorkHours', 6, 2).defaultTo(0);
    table.decimal('totalOvertimeHours', 6, 2).defaultTo(0);
    table.integer('totalLateDays').defaultTo(0);
    table.integer('totalEarlyLeaveDays').defaultTo(0);
    table.decimal('totalPenalty', 12, 2).defaultTo(0);
    table.decimal('totalOvertimeSalary', 12, 2).defaultTo(0);
    
    // Thông tin người duyệt
    table.integer('approvedBy').unsigned().notNullable();
    table.timestamp('approvedAt').defaultTo(knex.fn.now());
    
    // Ghi chú
    table.text('notes').nullable();
    
    table.timestamps(true, true);
    
    // Indexes
    table.index(['userId', 'month'], 'idx_approved_attendances_user_month');
    table.index(['departmentId', 'month'], 'idx_approved_attendances_dept_month');
    table.index('date', 'idx_approved_attendances_date');
    table.index('approvedBy', 'idx_approved_attendances_approved_by');
    
    // Unique constraint để tránh duplicate
    table.unique(['userId', 'date'], 'unique_user_date_attendance');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('approved_attendances');
};

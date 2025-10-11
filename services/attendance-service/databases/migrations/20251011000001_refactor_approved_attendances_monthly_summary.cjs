/**
 * Migration: Refactor approved_attendances to monthly summary only
 * - Remove daily fields (date, checkInTime, checkOutTime, daily*, ot*)
 * - Keep only monthly aggregate fields
 * - Change to 1 record per user per month (not per day)
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Drop the old table and recreate with new structure
  await knex.schema.dropTableIfExists('approved_attendances');
  
  return knex.schema.createTable('approved_attendances', function(table) {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable();
    table.integer('departmentId').unsigned().notNullable();
    table.string('month').notNullable(); // Format: YYYY-MM
    
    // ========== MONTHLY SUMMARY FIELDS ==========
    // Tổng hợp công
    table.integer('totalWorkDays').defaultTo(0).comment('Tổng số ngày làm việc');
    table.decimal('totalWorkHours', 6, 2).defaultTo(0).comment('Tổng giờ làm việc');
    
    // Tổng hợp đi muộn/về sớm
    table.integer('totalLateDays').defaultTo(0).comment('Tổng số ngày đi muộn');
    table.integer('totalEarlyLeaveDays').defaultTo(0).comment('Tổng số ngày về sớm');
    table.integer('totalLateMinutes').defaultTo(0).comment('Tổng số phút đi muộn');
    table.integer('totalEarlyLeaveMinutes').defaultTo(0).comment('Tổng số phút về sớm');
    
    // Tổng hợp OT
    table.decimal('totalOvertimeHours', 6, 2).defaultTo(0).comment('Tổng giờ OT');
    table.integer('totalOvertimeDays').defaultTo(0).comment('Tổng số ngày có OT');
    table.decimal('totalOvertimeSalary', 12, 2).defaultTo(0).comment('Tổng lương OT');
    
    // Tổng hợp nghỉ phép/nghỉ không lương
    table.integer('totalPaidLeaveDays').defaultTo(0).comment('Tổng ngày nghỉ có lương');
    table.integer('totalUnpaidLeaveDays').defaultTo(0).comment('Tổng ngày nghỉ không lương');
    
    // Tổng hợp phạt
    table.decimal('totalLatePenalty', 12, 2).defaultTo(0).comment('Tổng phạt đi muộn');
    table.decimal('totalEarlyLeavePenalty', 12, 2).defaultTo(0).comment('Tổng phạt về sớm');
    table.decimal('totalPenalty', 12, 2).defaultTo(0).comment('Tổng tiền phạt');
    
    // Thông tin lương (có thể thêm sau)
    table.decimal('baseSalary', 12, 2).nullable().comment('Lương cơ bản tháng này');
    table.decimal('totalAllowance', 12, 2).defaultTo(0).comment('Tổng phụ cấp');
    table.decimal('finalSalary', 12, 2).nullable().comment('Lương thực nhận (chưa trừ thuế)');
    
    // ========== APPROVAL INFO ==========
    table.integer('approvedBy').unsigned().notNullable().comment('ID người duyệt');
    table.timestamp('approvedAt').defaultTo(knex.fn.now()).comment('Thời gian duyệt');
    table.text('notes').nullable().comment('Ghi chú khi duyệt');
    
    table.timestamps(true, true);
    
    // ========== INDEXES ==========
    table.index(['userId', 'month'], 'idx_approved_user_month');
    table.index(['departmentId', 'month'], 'idx_approved_dept_month');
    table.index('approvedBy', 'idx_approved_by');
    table.index('approvedAt', 'idx_approved_at');
    
    // ========== UNIQUE CONSTRAINT ==========
    // 1 user chỉ có 1 bản ghi duyệt cho 1 tháng
    table.unique(['userId', 'month'], 'unique_user_month_approval');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Rollback: restore old structure (from previous migration)
  return knex.schema.dropTableIfExists('approved_attendances')
    .then(() => {
      return knex.schema.createTable('approved_attendances', function(table) {
        table.increments('id').primary();
        table.integer('userId').unsigned().notNullable();
        table.integer('departmentId').unsigned().notNullable();
        table.string('month').notNullable();
        table.date('date').notNullable();
        
        table.time('checkInTime').nullable();
        table.time('checkOutTime').nullable();
        table.decimal('dailyTotalWorkHours', 5, 2).defaultTo(0);
        table.integer('lateMinutes').defaultTo(0);
        table.integer('earlyDepartureMinutes').defaultTo(0);
        
        table.decimal('dailyWorkingUnit', 5, 2).defaultTo(0);
        table.decimal('earlyLeavePenalty', 12, 2).defaultTo(0);
        table.decimal('lateArrivalPenalty', 12, 2).defaultTo(0);
        
        table.decimal('otWorkingUnit', 5, 2).defaultTo(0);
        table.integer('otMinutes').defaultTo(0);
        table.decimal('otSalary', 12, 2).defaultTo(0);
        
        table.integer('totalWorkDays').defaultTo(0);
        table.decimal('totalWorkHours', 6, 2).defaultTo(0);
        table.decimal('totalOvertimeHours', 6, 2).defaultTo(0);
        table.integer('totalLateDays').defaultTo(0);
        table.integer('totalEarlyLeaveDays').defaultTo(0);
        table.decimal('totalPenalty', 12, 2).defaultTo(0);
        table.decimal('totalOvertimeSalary', 12, 2).defaultTo(0);
        
        table.integer('approvedBy').unsigned().notNullable();
        table.timestamp('approvedAt').defaultTo(knex.fn.now());
        table.text('notes').nullable();
        
        table.timestamps(true, true);
        
        table.index(['userId', 'month'], 'idx_approved_attendances_user_month');
        table.index(['departmentId', 'month'], 'idx_approved_attendances_dept_month');
        table.index('date', 'idx_approved_attendances_date');
        table.index('approvedBy', 'idx_approved_attendances_approved_by');
        table.unique(['userId', 'date'], 'unique_user_date_attendance');
      });
    });
};

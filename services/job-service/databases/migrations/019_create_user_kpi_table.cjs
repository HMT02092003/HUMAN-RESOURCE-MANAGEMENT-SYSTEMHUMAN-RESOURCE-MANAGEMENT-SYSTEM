/**
 * Migration: Tạo bảng user_kpi để lưu trữ KPI của người dùng theo thời gian
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_kpi', function(table) {
    // ID tự tăng
    table.increments('kpi_id').primary();
    
    // User ID (tham chiếu đến user trong auth-service)
    table.integer('user_id').notNullable();
    
    // Project ID (nullable - có thể tính KPI tổng thể hoặc theo project)
    table.integer('project_id').nullable()
      .references('project_id').inTable('projects').onDelete('CASCADE');
    
    // Thời gian tính KPI
    table.enum('period_type', ['daily', 'weekly', 'monthly']).notNullable();
    table.date('period_start').notNullable(); // Ngày bắt đầu kỳ
    table.date('period_end').notNullable();   // Ngày kết thúc kỳ
    
    // Các chỉ số KPI
    table.integer('total_tasks').defaultTo(0);           // Tổng số task được giao
    table.integer('completed_tasks').defaultTo(0);       // Số task hoàn thành
    table.integer('on_time_tasks').defaultTo(0);         // Số task hoàn thành đúng hạn
    table.integer('late_tasks').defaultTo(0);            // Số task hoàn thành trễ hạn
    table.integer('overdue_tasks').defaultTo(0);         // Số task quá hạn chưa hoàn thành
    table.integer('pending_approval_tasks').defaultTo(0); // Số task đang chờ duyệt
    
    // Điểm KPI (0-100)
    table.decimal('kpi_score', 5, 2).defaultTo(0);       // Điểm KPI tổng thể
    table.decimal('completion_rate', 5, 2).defaultTo(0); // Tỷ lệ hoàn thành (%)
    table.decimal('on_time_rate', 5, 2).defaultTo(0);    // Tỷ lệ đúng hạn (%)
    
    // Thời gian trung bình
    table.decimal('avg_completion_days', 5, 2).nullable(); // Số ngày trung bình để hoàn thành task
    table.decimal('avg_delay_days', 5, 2).nullable();      // Số ngày trung bình bị delay
    
    // Metadata để lưu thông tin chi tiết
    table.json('metadata').nullable(); // Lưu thông tin chi tiết về các task
    
    // Timestamps
    table.timestamp('calculated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('project_id');
    table.index('period_type');
    table.index(['user_id', 'period_type', 'period_start', 'period_end']);
    table.index('calculated_at');
    
    // Unique constraint: Mỗi user chỉ có 1 KPI record cho 1 period
    table.unique(['user_id', 'project_id', 'period_type', 'period_start', 'period_end']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_kpi');
};

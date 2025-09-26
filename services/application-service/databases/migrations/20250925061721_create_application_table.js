export async function up(knex) {
  return knex.schema.createTable('applications', table => {
    table.increments('id').primary();
    table.string('type', 50).notNullable(); // 'business-trip', 'leave', 'overtime', 'remote-work', 'sick-leave'
    table.integer('status').defaultTo(0).notNullable(); // 0: pending, 1: approved, 2: rejected
    table.jsonb('data').defaultTo('{}').notNullable(); // Dữ liệu chi tiết của từng loại đơn
    table.integer('userId').notNullable(); // ID của người tạo đơn
    table.integer('approvedBy').nullable(); // ID của người duyệt
    table.timestamp('applicationDate').defaultTo(knex.fn.now()); // Ngày tạo đơn
    table.timestamp('approvedDate').nullable(); // Ngày duyệt
    table.text('reason').nullable(); // Lý do (cho đơn bị từ chối)
    table.text('rejectionReason').nullable(); // Lý do từ chối chi tiết
    table.text('note').nullable(); // Ghi chú thêm
    table.timestamps(true, true); // created_at, updated_at

    // Index để tối ưu truy vấn
    table.index(['userId'], 'idx_applications_user_id');
    table.index(['type'], 'idx_applications_type');
    table.index(['status'], 'idx_applications_status');
    table.index(['applicationDate'], 'idx_applications_application_date');
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('applications');
}

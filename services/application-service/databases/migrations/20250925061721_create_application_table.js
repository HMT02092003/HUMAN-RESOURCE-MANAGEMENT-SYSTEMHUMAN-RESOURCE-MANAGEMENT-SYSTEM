export async function up(knex) {
  return knex.schema.createTable('applications', table => {
    table.increments('id').primary();
    table.string('type', 50).notNullable(); // 'business-trip', 'leave', 'overtime', 'remote-work', 'sick-leave'
    table.integer('status').defaultTo(0).notNullable(); // 0: pending, 1: approved, 2: rejected
    table.jsonb('data').defaultTo('{}').notNullable(); // Dữ liệu chi tiết của từng loại đơn
    table.integer('userId').notNullable(); // ID của người tạo đơn
    table.integer('approvedBy').nullable(); // ID của người duyệt
    table.timestamp('approvedDate').nullable(); // Ngày duyệt
    table.timestamps(true, true); // created_at, updated_at
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('applications');
}

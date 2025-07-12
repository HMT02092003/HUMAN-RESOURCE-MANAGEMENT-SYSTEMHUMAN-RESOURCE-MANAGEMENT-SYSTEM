export async function up(knex) {
  return knex.schema.createTable('users', function (table) {
    table.increments('id').primary(); // Primary key
    table.string('username', 20).notNullable().unique(); // Unique username
    table.string('password', 255).notNullable(); // Mật khẩu
    table.string('firstName', 50).nullable();
    table.string('lastName', 50).nullable();
    table.string('email', 50).nullable();
    table.date('startDate').nullable(); // Ngày bắt đầu
    table.date('dayOff').nullable(); // Ngày nghỉ
    table.text('profileFamily').nullable(); // Hồ sơ gia đình
    table.integer('chevronId')
    table.integer('departmentId')
    table.string('status', 20).nullable(); // Trạng thái
    table.integer('roleId').unsigned().references('id').inTable('roles')
      .onUpdate('CASCADE')
      .onDelete('CASCADE'); // Vai trò
    table.integer('vacationDay').nullable(); // Ngày nghỉ phép
    table.decimal('baseSalary', 15, 2).nullable(); // Lương cơ bản
    table.integer('createdBy').unsigned().nullable().references('id').inTable('users')
      .onUpdate('CASCADE')
      .onDelete('SET NULL'); // Người tạo
    table.integer('updatedBy').unsigned().nullable().references('id').inTable('users')
      .onUpdate('CASCADE')
      .onDelete('SET NULL'); // Người cập nhật
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
};

export async function down(knex) {
  return knex.schema.dropTable('users');
};

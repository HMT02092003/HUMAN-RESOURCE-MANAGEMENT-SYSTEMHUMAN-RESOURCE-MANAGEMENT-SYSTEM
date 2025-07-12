export async function up(knex) {
  return knex.schema.createTable("role_permissions", function (table) {
    table.increments();
    table
      .integer("roleId")
      .notNullable()
      .index()
      .references("id")
      .inTable("roles")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .integer("permissionId")
      .nullable()
      .index()
      .references("id")
      .inTable("permissions")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.integer("value").defaultTo(0);
    table.string("key").nullable();
    table.timestamp("createdAt").defaultTo(knex.fn.now());
    table
      .integer("createdBy")
      .nullable()
      .index()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.integer("scope").nullable();
  });
};

export async function down(knex) {
  return knex.schema.dropTable("role_permissions");
};

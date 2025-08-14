export async function up(knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('identificationPhoto', 512).nullable();
  });
};

export async function down(knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('identificationPhoto');
  });
};



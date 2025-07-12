export async function up(knex) {
    return knex.schema.alterTable('users', function (table) {
        table.integer('gender').defaultTo(0);
        table.date('birthday').nullable();
        table.string('phone', 15).nullable();
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('birthday');
        table.dropColumn('phone');
        table.dropColumn('gender');
    });
};

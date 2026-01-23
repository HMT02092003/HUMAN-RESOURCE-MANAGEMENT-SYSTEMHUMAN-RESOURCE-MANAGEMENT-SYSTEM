export async function up(knex) {
    return knex.schema.table('applications', table => {
        table.timestamp('applicationDate').nullable();
    });
}

export async function down(knex) {
    return knex.schema.table('applications', table => {
        table.dropColumn('applicationDate');
    });
}

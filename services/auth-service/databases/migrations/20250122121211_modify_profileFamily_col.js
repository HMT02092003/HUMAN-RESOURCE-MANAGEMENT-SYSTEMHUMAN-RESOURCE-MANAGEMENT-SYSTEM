// migrations/YYYYMMDDHHMMSS_create_contracts_table.js
export async function up(knex) {
    return knex.schema.alterTable('users', function (table) {
        table.jsonb('profileFamily').defaultTo('[]').alter();
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.text('profileFamily').nullable().alter();
    });
};
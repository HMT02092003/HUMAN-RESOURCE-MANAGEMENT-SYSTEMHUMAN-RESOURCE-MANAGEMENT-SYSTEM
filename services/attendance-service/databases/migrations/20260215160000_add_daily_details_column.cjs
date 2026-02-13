
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('monthly_attendances', function (table) {
        // Add dailyDetails column to store JSON snapshot of daily attendance
        // Use jsonb for better performance and indexing capabilities in Postgres
        // fall back to json if jsonb not available, or text if needed
        table.jsonb('dailyDetails').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('monthly_attendances', function (table) {
        table.dropColumn('dailyDetails');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('departments', table => {
        table.specificType('role_ids', 'INTEGER[]').nullable();
    });
    await knex.schema.alterTable('chevrons', table => {
        table.specificType('role_ids', 'INTEGER[]').nullable();
    });

    // Update data for departments
    // 1: Ban Giám đốc (Role 1: Admin)
    await knex('departments').where('id', 1).update({ role_ids: [1] });
    // 2, 3, 4: Công nghệ, Kinh doanh, Marketing (Role 2: Employee, 3: Leader)
    await knex('departments').whereIn('id', [2, 3, 4]).update({ role_ids: [2, 3] });
    // 5: Tài chính (Role 4: Accountant)
    await knex('departments').where('id', 5).update({ role_ids: [4] });
    // 6: Nhân sự (Role 5: HR)
    await knex('departments').where('id', 6).update({ role_ids: [5] });

    // Update data for chevrons
    // 1, 2: CEO, Giám đốc (Role 1: Admin)
    await knex('chevrons').whereIn('id', [1, 2]).update({ role_ids: [1] });
    // 3-10: All other roles
    await knex('chevrons').whereNotIn('id', [1, 2]).update({ role_ids: [2, 3, 4, 5] });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable('chevrons', table => {
        table.dropColumn('role_ids');
    });
    await knex.schema.alterTable('departments', table => {
        table.dropColumn('role_ids');
    });
};

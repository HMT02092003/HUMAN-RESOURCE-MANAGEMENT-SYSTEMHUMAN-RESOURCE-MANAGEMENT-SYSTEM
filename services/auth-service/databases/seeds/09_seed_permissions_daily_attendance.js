export async function seed(knex) {
    // 1. Create permissions
    const permissionId = 23;
    const permissionKey = 'dailyAttendance';

    // Check if permission exists
    const existingPerm = await knex('permissions').where('id', permissionId).first();

    if (!existingPerm) {
        await knex('permissions').insert({
            id: permissionId,
            name: 'Chấm công hàng ngày',
            description: 'Xem chấm công hàng ngày (Daily Attendance Monitor)',
            value: 31,
            key: permissionKey
        });
        console.log(`✅ Permission '${permissionKey}' created.`);
    } else {
        await knex('permissions').where('id', permissionId).update({
            key: permissionKey
        });
        console.log(`ℹ️ Permission '${permissionKey}' updated.`);
    }

    // 2. Assign to Roles with Scopes
    const rolePermissions = [
        { roleId: 1, permissionId: permissionId, value: 31, scope: 1, key: permissionKey }, // Admin - Global
        { roleId: 5, permissionId: permissionId, value: 31, scope: 1, key: permissionKey }, // HR - Global
        { roleId: 3, permissionId: permissionId, value: 4, scope: 2, key: permissionKey },  // Leader - Department
    ];

    for (const rp of rolePermissions) {
        const existing = await knex('role_permissions')
            .where({ roleId: rp.roleId, permissionId: rp.permissionId })
            .first();

        if (existing) {
            await knex('role_permissions')
                .where({ roleId: rp.roleId, permissionId: rp.permissionId })
                .update({ scope: rp.scope, value: rp.value, key: rp.key });
        } else {
            await knex('role_permissions').insert(rp);
        }
    }

    console.log('✅ Role permissions for Daily Attendance assigned.');
};

export const permissionFlags = {
    create: 8,
    read: 4,
    update: 2,
    delete: 1,
    approve: 16,
};

export const decodePermissions = (totalPermissions) => {
    const permissions = {
        create: false,
        read: false,
        update: false,
        delete: false,
        approve: false,
    };

    if (typeof totalPermissions !== 'number' || isNaN(totalPermissions)) {
        return permissions;
    }

    for (const [action, flag] of Object.entries(permissionFlags)) {
        if ((totalPermissions & flag) === flag) {
            permissions[action] = true;
        }
    }

    return permissions;
};

export const encodePermissions = (permissions) => {
    let totalPermissions = 0;

    for (const [action, flag] of Object.entries(permissionFlags)) {
        if (permissions[action]) {
            totalPermissions += flag;
        }
    }

    return totalPermissions;
};

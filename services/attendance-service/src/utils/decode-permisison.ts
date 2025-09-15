export type PermissionType = 'create' | 'read' | 'update' | 'delete' | 'approve';

export const permissionFlags: { [key in PermissionType]: number } = {
    create: 8,
    read: 4,
    update: 2,
    delete: 1,
    approve: 16,
};

export type PermissionObject = {
    [key in PermissionType]?: boolean;
};

export const decodePermissions = (totalPermissions: number): PermissionObject => {
    const permissions: PermissionObject = {
        create: false,
        read: false,
        update: false,
        delete: false,
        approve: false,
    };

    for (const [action, flag] of Object.entries(permissionFlags)) {
        if ((totalPermissions & flag) === flag) {
            permissions[action as PermissionType] = true;
        }
    }

    return permissions;
};


export const encodePermissions = (permissions: PermissionObject): number => {
    let totalPermissions = 0;

    for (const [action, flag] of Object.entries(permissionFlags)) {
        if (permissions[action as PermissionType]) {
            totalPermissions += flag;
        }
    }

    return totalPermissions;
};
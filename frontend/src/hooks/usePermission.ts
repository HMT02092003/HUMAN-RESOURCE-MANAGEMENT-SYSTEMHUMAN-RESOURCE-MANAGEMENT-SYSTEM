"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';
import { decodePermissions, PermissionType, PermissionObject } from '@/utils/decode-permisison';

/**
 * Hook để kiểm tra quyền của người dùng hiện tại.
 * @param permissionKey Khóa quyền cần kiểm tra (vd: 'users', 'roles', ...)
 * @returns Object chứa các cờ quyền (create, read, update, delete, approve)
 */
export const usePermission = (permissionKey?: string) => {
    const [permissions, setPermissions] = useState<PermissionObject>({
        create: false,
        read: false,
        update: false,
        delete: false,
        approve: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = Cookies.get('token');
        if (!token) {
            setLoading(false);
            return;
        }

        const decoded = getDecodedToken(token);
        const userPermissions = decoded?.user?.permissions || decoded?.permissions;

        if (userPermissions && permissionKey && userPermissions[permissionKey] !== undefined) {
            const value = Number(userPermissions[permissionKey]);
            setPermissions(decodePermissions(value));
        } else if (!permissionKey && userPermissions) {
            // Nếu không truyền key, có thể trả về toàn bộ object permissions để check tay
            // Nhưng ở đây ta mặc định set false nếu không có key
        }

        setLoading(false);
    }, [permissionKey]);

    return { permissions, loading };
};

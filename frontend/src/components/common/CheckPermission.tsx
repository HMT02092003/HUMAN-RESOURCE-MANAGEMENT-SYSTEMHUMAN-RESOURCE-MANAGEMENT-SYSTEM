"use client";

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';
import { decodePermissions, PermissionType } from '@/utils/decode-permisison';

interface CheckPermissionProps {
    permissionKey: string;
    requiredType?: PermissionType;
    children: React.ReactNode;
}

/**
 * Component lớp bọc để kiểm tra quyền truy cập của người dùng.
 * Nếu người dùng có quyền tương ứng với `permissionKey` và `requiredType`, 
 * component sẽ hiển thị children. Ngược lại, nó sẽ không hiển thị gì (null).
 */
const CheckPermission: React.FC<CheckPermissionProps> = ({
    permissionKey,
    requiredType = 'read',
    children
}) => {
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const check = () => {
            try {
                // 1. Lấy token từ Cookies
                const token = Cookies.get('token');
                if (!token) {
                    setHasPermission(false);
                    setIsLoading(false);
                    return;
                }

                // 2. Giải mã token để lấy thông tin user và permissions
                const decoded = getDecodedToken(token);
                // Lưu ý: Cấu trúc token có thể là decoded.permissions hoặc decoded.user.permissions
                const userPermissions = decoded?.user?.permissions || decoded?.permissions;

                if (userPermissions && userPermissions[permissionKey] !== undefined) {
                    const permissionValue = userPermissions[permissionKey];

                    // 3. Giải mã giá trị quyền (bitmask)
                    const decodedPerms = decodePermissions(Number(permissionValue));

                    // 4. Kiểm tra quyền cụ thể
                    if (decodedPerms[requiredType]) {
                        setHasPermission(true);
                    } else {
                        setHasPermission(false);
                    }
                } else {
                    setHasPermission(false);
                }
            } catch (error) {
                console.error('❌ [CheckPermission] Error checking permissions:', error);
                setHasPermission(false);
            } finally {
                setIsLoading(false);
            }
        };

        check();
    }, [permissionKey, requiredType]);

    // Trong khi đang check, không hiển thị gì để tránh layout shift hoặc lộ button
    if (isLoading) return null;

    if (!hasPermission) return null;

    return <>{children}</>;
};

export default CheckPermission;

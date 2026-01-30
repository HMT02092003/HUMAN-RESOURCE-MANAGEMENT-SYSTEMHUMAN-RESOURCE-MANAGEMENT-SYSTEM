import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { decodePermissions } from '../src/utils/decodePermission';

/**
 * Component wrapper to check user permissions.
 * Similar to CheckPermission in the web frontend.
 */
const CheckPermission = ({
    permissionKey,
    requiredType = 'read',
    children,
    hideOnLoading = true
}) => {
    const { user, isLoading: authLoading } = useAuth();
    const [hasPermission, setHasPermission] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const check = () => {
            if (authLoading) return;

            try {
                // Determine user data structure
                const userData = user?.user || user;

                // 1. ADMIN (Role ID 1) always has permission
                const roleId = userData?.roleId || userData?.role?.id || userData?.role_id;
                const isAdmin = parseInt(roleId) === 1;

                if (isAdmin) {
                    console.log(`[CheckPermission] Admin access granted for ${permissionKey}`);
                    setHasPermission(true);
                    setIsChecking(false);
                    return;
                }

                // 2. Get permissions from user object
                const userPermissions = userData?.permissions || {};
                const permissionValue = userPermissions[permissionKey];

                if (permissionValue !== undefined) {
                    const decodedPerms = decodePermissions(parseInt(permissionValue));
                    const allowed = !!decodedPerms[requiredType];

                    console.log(`[CheckPermission] User: ${userData?.username}, Module: ${permissionKey}, Type: ${requiredType}, Value: ${permissionValue}, Allowed: ${allowed}`);

                    setHasPermission(allowed);
                } else {
                    console.log(`[CheckPermission] No permission found for module: ${permissionKey}`);
                    setHasPermission(false);
                }
            } catch (error) {
                console.error('❌ [CheckPermission] Error checking permissions:', error);
                setHasPermission(false);
            } finally {
                setIsChecking(false);
            }
        };

        check();
    }, [user, authLoading, permissionKey, requiredType]);

    if ((authLoading || isChecking) && hideOnLoading) return null;

    if (!hasPermission) return null;

    return <>{children}</>;
};

export default CheckPermission;

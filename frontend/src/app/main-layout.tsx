"use client";

import React from 'react';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { getDecodedToken } from '../utils/decode-token';
import AdminMainLayout from './admin-main-layout';
import api from '@/src/service/apiService';
import { usePathname, useRouter } from 'next/navigation';
import { decodePermissions, PermissionObject } from '@/src/utils/decode-permisison'; // Import your permission utilities

type PermissionType = 'create' | 'read' | 'update' | 'delete' | 'approve';

interface MainLayoutProps {
    children: React.ReactNode;
    breadcrumbItems?: any;
    pageName?: string;
    pageDes?: string;
    requiredPermission?: string;
    permissionType?: PermissionType;
};

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    breadcrumbItems,
    pageName,
    pageDes,
    requiredPermission,
    permissionType = 'read' // Default to 'read' if not specified
}) => {
    const [role, setRole] = useState<any>();
    const [permissions, setPermissions] = useState<PermissionObject | null>(null);
    const [hasAccess, setHasAccess] = useState<boolean>(false);
    const pathname = usePathname();
    const router = useRouter();

    console.log("permissions", permissions);
    console.log("hasAccess", hasAccess);
    console.log("permissionType", permissionType);

    // Generate default breadcrumb items based on current path
    const [currentBreadcrumb, setCurrentBreadcrumb] = useState<{ title: string; href?: string }[]>([]);

    useEffect(() => {
        // If custom breadcrumb items are provided, use those
        if (breadcrumbItems && breadcrumbItems.length > 0) {
            setCurrentBreadcrumb(breadcrumbItems);
            return;
        }

        // Otherwise, generate breadcrumb from pathname
        const generateBreadcrumb = () => {
            // Create default home item
            const items = [{ title: 'Trang chủ', href: '/home' }];

            // Map paths to readable names
            const pathMap: Record<string, string> = {
                'home': 'Trang chủ',
                'profileManagement': 'Quản lý người dùng',
                // Add more path mappings as needed
            };

            // Split the pathname and add relevant paths
            if (pathname) {
                const paths = pathname.split('/').filter(p => p);

                paths.forEach((path, index) => {
                    const readableName = pathMap[path] || path.charAt(0).toUpperCase() + path.slice(1);
                    const href = `/${paths.slice(0, index + 1).join('/')}`;

                    // Don't duplicate the home item if it's already there
                    if (path !== 'home' || items.length === 0) {
                        items.push({ title: readableName, href });
                    }
                });
            }

            return items;
        };

        setCurrentBreadcrumb(generateBreadcrumb());
    }, [pathname, breadcrumbItems]);

    useEffect(() => {
        // Lấy token từ cookies
        const authToken = Cookies.get('token');
        console.log("authToken", authToken);
        if (authToken) {
            const tokenAfterDecode = getDecodedToken(authToken);
            console.log("tokenAfterDecode", tokenAfterDecode);
            setRole(tokenAfterDecode);

            // Check permissions when we have both the decoded token and a requiredPermission
            if (tokenAfterDecode && requiredPermission) {
                checkUserPermissions(tokenAfterDecode, requiredPermission, permissionType);
            }
        } else {
            // Thử refresh token nếu có
            const refreshToken = Cookies.get('refreshToken');
            console.log("refreshToken", refreshToken);
            if (refreshToken) {
                api.post('/api/refresh-token', { refreshToken })
                    .then(response => {
                        if (response.data.token) {
                            const newToken = response.data.token;
                            const newTokenDecoded = getDecodedToken(newToken);
                            setRole(newTokenDecoded);

                            // Check permissions with the refreshed token
                            if (newTokenDecoded && requiredPermission) {
                                checkUserPermissions(newTokenDecoded, requiredPermission, permissionType);
                            }

                            // Set the new token in cookies
                            Cookies.set('token', newToken);
                        }
                    })
                    .catch(err => {
                        console.error('Error refreshing token:', err);
                        // Nếu refresh thất bại, chuyển hướng đến trang đăng nhập
                        window.location.href = '/login';
                    });
            } else {
                // No token and no refresh token - redirect to login
                window.location.href = '/login';
            }
        }
    }, [requiredPermission, permissionType]);

    useEffect(() => {
        if (role && requiredPermission) {
            checkUserPermissions(role, requiredPermission, permissionType);
        }
    }, [role, requiredPermission, permissionType]);

    const checkUserPermissions = (userData: any, permissionKey: string, permType: PermissionType) => {
        if (userData?.user?.permissions) {
            const permissionValue = userData.user.permissions[permissionKey];
            console.log("permissionValue", permissionValue);

            const decodedPermissions = decodePermissions(permissionValue);
            setPermissions(decodedPermissions);

            // Check if user has the specific permission type requested (read, create, update, delete, approve)
            const canAccess = decodedPermissions[permType] === true;
            setHasAccess(canAccess);

            if (!canAccess) {
                router.push('/unauthorized');
            }
        } else {
            setHasAccess(false);
            router.push('/unauthorized');
        }
    };

    React.useEffect(() => {
        document.body.style.margin = '0';
    }, []);

    // Only render the content if the user has access or if no specific permission is required
    return (
        <AdminMainLayout
            userData={role}
            breadcrumbItems={currentBreadcrumb}
            pageTitle={pageName}
            pageDescription={pageDes}
            userPermissions={role?.user?.permissions}
        >
            {(!requiredPermission || hasAccess) ? children : null}
        </AdminMainLayout>
    );
};

export default MainLayout;
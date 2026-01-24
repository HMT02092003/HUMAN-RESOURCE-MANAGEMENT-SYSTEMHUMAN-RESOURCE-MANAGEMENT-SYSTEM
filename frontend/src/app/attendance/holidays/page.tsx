'use client';

import React, { useEffect, useState } from 'react';
import AdminMainLayout from '@/components/admin-main-layout';
import HolidayManagement from '@/components/holidays';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';
import userService from '@/service/userService';
import { message, Spin } from 'antd';
import { useRouter } from 'next/navigation';

export default function HolidayPage() {
    const [userData, setUserData] = useState<any>(null);
    const [userPermissions, setUserPermissions] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = Cookies.get('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const decoded = getDecodedToken(token);
                if (!decoded || !decoded.sub) {
                    router.push('/login');
                    return;
                }

                const userId = parseInt(decoded.sub);
                const user = await userService.getUserDetail(userId);

                // Check if user has permission to view this page
                // Role-based check first (Admin and HR)
                const isAdminOrHR = user.roleId === 1 || user.roleId === 5;

                // Extract permissions from user details or fallback to token
                let permissions = user.role?.permissions || [];
                const permissionMap: Record<string, string> = {};

                if (permissions.length > 0) {
                    permissions.forEach((p: any) => {
                        permissionMap[p.key] = p.value.toString();
                    });
                } else if (decoded.user?.permissions) {
                    // Fallback to token permissions
                    Object.entries(decoded.user.permissions).forEach(([key, value]) => {
                        permissionMap[key] = String(value);
                    });
                }

                // Check specifically for settings or root permission
                const hasAccess = permissionMap['settings'] || permissionMap['root'] || isAdminOrHR;

                if (!hasAccess) {
                    message.error('Bạn không có quyền truy cập trang này');
                    router.push('/unauthorized');
                    return;
                }

                setUserData(user);
                setUserPermissions(permissionMap);
            } catch (error) {
                console.error('Error fetching user data:', error);
                message.error('Không thể xác thực người dùng');
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="Đang tải..." />
            </div>
        );
    }

    return (
        <AdminMainLayout
            userData={userData}
            userPermissions={userPermissions}
            pageTitle="Cấu hình ngày nghỉ lễ"
            pageDescription="Quản lý danh sách các ngày nghỉ lễ trong năm"
            breadcrumbItems={[
                { title: 'Dashboard', href: '/home' },
                { title: 'Chấm công', href: '/attendance' },
                { title: 'Cấu hình ngày nghỉ lễ' }
            ]}
        >
            <HolidayManagement />
        </AdminMainLayout>
    );
}

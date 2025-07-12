"use client";

import React from 'react';
import Index from '@/src/components/users';
import MainLayout from "@/src/app/main-layout";
import { HomeOutlined } from '@ant-design/icons';

const UserPage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' }
    ];

    const pageName = "Quản lí thông tin người dùng";
    const pageDes = "Hiển thị danh sách thông tin người dùng trong hệ thống";

    const requiredPermission = "users";
    const permissionType = "read";

    return (
        <>
            <MainLayout
                breadcrumbItems={breadcrumbItems}
                pageName={pageName}
                pageDes={pageDes}
                requiredPermission={requiredPermission}
                permissionType={permissionType}
            >
                <Index />
            </MainLayout>
        </>
    );
};

export default UserPage;

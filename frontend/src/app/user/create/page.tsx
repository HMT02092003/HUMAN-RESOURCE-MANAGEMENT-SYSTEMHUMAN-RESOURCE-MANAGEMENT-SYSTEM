"use client";

import React from 'react';
import Create from '@/components/users/create';
import MainLayout from "@/components/main-layout";
import { HomeOutlined } from '@ant-design/icons';

const CreateUserPage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Tạo mới người dùng', href: '/user/create' }
    ];

    const pageName = "Quản lí thông tin người dùng";
    const pageDes = "Tạo mới thông tin người dùng trong hệ thống";

    const requiredPermission = "users";
    const permissionType = "create";

    return (
        <>
            <MainLayout
                breadcrumbItems={breadcrumbItems}
                pageName={pageName}
                pageDes={pageDes}
                requiredPermission={requiredPermission}
                permissionType={permissionType}
            >
                <Create />
            </MainLayout>
        </>
    );
};

export default CreateUserPage;

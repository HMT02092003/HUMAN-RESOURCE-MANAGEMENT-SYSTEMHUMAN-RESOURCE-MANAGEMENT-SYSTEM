"use client";

import React from 'react';
import UserUpload from '@/components/users/uploadExcel'; // Reusing the existing component but I will fix it
import MainLayout from "@/components/main-layout";
import { HomeOutlined } from '@ant-design/icons';

const UploadUserPage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Tải lên danh sách', href: '/user/upload' }
    ];

    const pageName = "Tải lên danh sách người dùng";
    const pageDes = "Nhập danh sách người dùng từ file Excel vào hệ thống";

    const requiredPermission = "users";
    const permissionType = "create";

    return (
        <MainLayout
            breadcrumbItems={breadcrumbItems}
            pageName={pageName}
            pageDes={pageDes}
            requiredPermission={requiredPermission}
            permissionType={permissionType}
        >
            <UserUpload />
        </MainLayout>
    );
};

export default UploadUserPage;

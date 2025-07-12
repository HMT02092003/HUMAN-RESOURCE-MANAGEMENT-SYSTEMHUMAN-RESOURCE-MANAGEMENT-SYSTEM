"use client";

import React from 'react';
import Edit from '@/src/components/users/edit';
import MainLayout from "@/src/app/main-layout";
import { HomeOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';

const EditUserPage = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Cập nhật người dùng', href: `/user/edit?id=${id}` }
    ];

    const pageName = "Quản lí thông tin người dùng";
    const pageDes = "Cập nhật thông tin người dùng trong hệ thống";

    const requiredPermission = "users";
    const permissionType = "update";

    return (
        <>
            <MainLayout
                breadcrumbItems={breadcrumbItems}
                pageName={pageName}
                pageDes={pageDes}
                requiredPermission={requiredPermission}
                permissionType={permissionType}
            >
                <Edit />
            </MainLayout>
        </>
    );
};

export default EditUserPage; 
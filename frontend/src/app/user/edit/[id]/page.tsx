"use client";

import React from 'react';
import Edit from '@/components/users/edit';
import MainLayout from "@/components/main-layout";
import { HomeOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const EditUserPage = () => {
    const params = useParams();
    const id = params.id;

    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Cập nhật người dùng', href: `/user/edit/${id}` }
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
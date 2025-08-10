"use client";

import React from 'react';
import View from '@/src/components/users/view';
import MainLayout from "@/src/app/main-layout";
import { HomeOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const ViewUserPage = () => {
    const params = useParams();
    const id = params.id;

    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Xem chi tiết người dùng', href: `/user/view/${id}` }
    ];

    const pageName = "Quản lí thông tin người dùng";
    const pageDes = "Xem chi tiết thông tin người dùng trong hệ thống";

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
                <View />
            </MainLayout>
        </>
    );
};

export default ViewUserPage; 
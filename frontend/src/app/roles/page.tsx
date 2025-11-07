"use client";

import React from 'react'
import Index from "@/components/roles/index"
import MainLayout from "@/components/main-layout"
import { HomeOutlined } from '@ant-design/icons';

const HomePage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí vai trò', href: '/roles' }
    ];

    const pageName = "Quản lí thông tin vai trò";
    const pageDes = "Hiển thị danh sách thông tin vai trò trong hệ thống";

    const requiredPermission = "roles";
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
    )
}

export default HomePage
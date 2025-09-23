"use client";

import React from 'react'
import Index from "@/components/chevrons/index"
import MainLayout from "@/components/main-layout"
import { HomeOutlined } from '@ant-design/icons';

const HomePage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí chức vụ', href: '/chevrons' }
    ];

    const pageName = "Quản lí thông tin chức vụ";
    const pageDes = "Hiển thị danh sách thông tin chức vụ trong hệ thống"

    const requiredPermission = "chevrons";
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
"use client";

import React from 'react'
import Index from "@/components/departments/index"
import MainLayout from "@/components/main-layout"
import { HomeOutlined } from '@ant-design/icons';

const HomePage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí phòng ban', href: '/departments' }
    ];

    const pageName = "Quản lí thông tin phòng ban";
    const pageDes = "Hiển thị danh sách thông tin phòng ban trong hệ thống"


    const requiredPermission = "departments";
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
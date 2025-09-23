"use client";

import React from 'react'
import Index from "@/components/contractTypes/index"
import MainLayout from "@/components/main-layout"
import { HomeOutlined } from '@ant-design/icons';

const HomePage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí loại hợp đồng', href: '/contractTypes' }
    ];

    const pageName = "Quản lí thông tin loại hợp đồng";
    const pageDes = "Hiển thị danh sách thông tin loại hợp đồng trong hệ thống"


    const requiredPermission = "contractTypes";
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
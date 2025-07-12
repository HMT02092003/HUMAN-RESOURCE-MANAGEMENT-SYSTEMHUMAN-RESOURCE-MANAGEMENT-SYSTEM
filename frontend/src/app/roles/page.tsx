"use client";

import React from 'react'
import Index from "@/src/components/roles/index"
import MainLayout from "@/src/app/main-layout"
import { HomeOutlined } from '@ant-design/icons';

const HomePage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí vai trò', href: '/departments' }
    ];

    const pageName = "Quản lí thông tin vai trò";
    const pageDes = "Hiển thị danh sách thông tin vai trò trong hệ thống"

    return (
        <>
            <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName} pageDes={pageDes}>
                <Index />
            </MainLayout>
        </>
    )
}

export default HomePage
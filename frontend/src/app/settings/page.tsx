"use client";

import React from 'react';
import Index from '@/components/settings';
import MainLayout from "@/components/main-layout";
import { HomeOutlined } from '@ant-design/icons';

const SettingsPage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Cấu hình hệ thống', href: '/settings' }
    ];

    const pageName = "Cấu hình hệ thống";
    const pageDes = "Quản lý các cấu hình chính của hệ thống chấm công và tính lương";

    const requiredPermission = "settings";
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
    );
};

export default SettingsPage;

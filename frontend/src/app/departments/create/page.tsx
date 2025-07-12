"use client";

import MainLayout from "@/src/app/main-layout";
import Create from '@/src/components/departments/create';
import { HomeOutlined } from '@ant-design/icons';


const ENTER_KEY_CODE = 13;

export default function CreateProfileManagementPage() {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí phòng ban', href: '/departments' },
        { title: 'Tạo mới phòng ban', href: '/departments/create' }
    ];

    const pageName = "Tạo mới thông tin phòng ban"
    const pageDes = "Tạo mới phòng ban trong hệ thống"

    const requiredPermission = "departments";
    const permissionType = "create";

    return (
        <>
            <MainLayout
                breadcrumbItems={breadcrumbItems}
                pageName={pageName}
                pageDes={pageDes}
                requiredPermission={requiredPermission}
                permissionType={permissionType}
            >
                <Create />
            </MainLayout>
        </>
    );
}

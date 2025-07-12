"use client";

import MainLayout from "@/src/app/main-layout";
import Create from '@/src/components/chevrons/create';
import { HomeOutlined } from '@ant-design/icons';


const ENTER_KEY_CODE = 13;

export default function CreateProfileManagementPage() {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí chức vụ', href: '/chevrons' },
        { title: 'Tạo mới chức vụ', href: '/chevrons/create' }
    ];

    const pageName = "Quản lí thông tin chức vụ"
    const pageDes = "Tạo mới chức vụ trong hệ thống"

    const requiredPermission = "chevrons";
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

"use client";

import MainLayout from "@/src/app/main-layout";
import Create from '@/src/components/contractTypes/create';
import { HomeOutlined } from '@ant-design/icons';


const ENTER_KEY_CODE = 13;

export default function CreateProfileManagementPage() {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí loại hợp dồng', href: '/contractTypes' },
        { title: 'Tạo mới loại hợp dồng', href: '/contractTypes/create' }
    ];

    const pageName = "Quản lí thông tin loại hợp dồng"
    const pageDes = "Tạo mới loại hợp đồng trong hệ thống"


    const requiredPermission = "contractTypes";
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

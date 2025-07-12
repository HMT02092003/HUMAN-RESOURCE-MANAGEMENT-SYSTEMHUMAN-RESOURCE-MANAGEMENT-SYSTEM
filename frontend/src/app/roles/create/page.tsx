"use client";

import MainLayout from "@/src/app/main-layout";
import Create from '@/src/components/roles/create';
import { HomeOutlined } from '@ant-design/icons';


const ENTER_KEY_CODE = 13;

export default function CreateProfileManagementPage() {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí vai trò', href: '/roles' },
        { title: 'Tạo mới vai trò', href: '/roles/create' }
    ];

    const pageName = "Tạo mới thông tin vai trò"
    const pageDes = "Tạo mới vai trò trong hệ thống"
    return (
        <>
            <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName} pageDes={pageDes}>
                <Create />
            </MainLayout>
        </>
    );
}

"use client";

import React from 'react';
import CreateContract from '@/src/components/users/createContract';
import MainLayout from "@/src/app/main-layout";
import { HomeOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';

const CreateContractPage = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Tạo mới hợp đồng', href: `/user/create-contract?id=${id}` }
    ];

    const pageName = "Quản lí thông tin người dùng";
    const pageDes = "Tạo mới hợp đồng cho người dùng trong hệ thống";

    const requiredPermission = "users";
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
                <CreateContract />
            </MainLayout>
        </>
    );
};

export default CreateContractPage; 
"use client";

import React from 'react';
import CreateContract from '@/components/users/createContract';
import MainLayout from "@/components/main-layout";
import { HomeOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const CreateContractPage = () => {
    const params = useParams();
    const id = params.id;

    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lí người dùng', href: '/user' },
        { title: 'Tạo mới hợp đồng', href: `/user/createContract/${id}` }
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
'use client';

import React from 'react';
import { Card } from 'antd';
import { HomeOutlined, ProjectOutlined } from '@ant-design/icons';
import MainLayout from '@/components/main-layout';
import ProjectForm from '@/components/projects/ProjectForm';

const CreateProjectPage: React.FC = () => {

    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Quản lý dự án', href: '/projects' },
        { title: 'Tạo dự án mới' }
    ];

    const pageName = 'Tạo dự án mới';
    const pageDes = 'Tạo mới thông tin dự án trong hệ thống';

    return (
        <MainLayout
            breadcrumbItems={breadcrumbItems}
            pageName={pageName}
            pageDes={pageDes}
        >
            <ProjectForm
                submitButtonText="Tạo dự án"
            />
        </MainLayout>
    );
};

export default CreateProjectPage;

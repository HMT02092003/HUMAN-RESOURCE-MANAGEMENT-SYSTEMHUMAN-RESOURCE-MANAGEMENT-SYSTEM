'use client';

import React from 'react';
import { HomeOutlined } from '@ant-design/icons';
import MainLayout from '@/components/main-layout';
import ProjectForm from '@/components/projects/ProjectForm';
import { useParams } from 'next/navigation';

const EditProjectPage: React.FC = () => {
  const params = useParams();
  const projectId = params?.id as string;

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý dự án', href: '/projects' },
    { title: 'Chỉnh sửa dự án' }
  ];

  const pageName = 'Chỉnh sửa dự án';
  const pageDes = 'Cập nhật thông tin dự án trong hệ thống';

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
    >
      <ProjectForm 
        projectId={projectId}
        submitButtonText="Cập nhật"
      />
    </MainLayout>
  );
};

export default EditProjectPage;

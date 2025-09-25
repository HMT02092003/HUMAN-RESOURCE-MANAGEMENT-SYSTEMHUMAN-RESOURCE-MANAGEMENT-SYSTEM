'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import CreateApplicationForm from '@/components/applications/CreateApplicationForm';
import { HomeOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';

const CreateApplicationPage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý đơn từ', href: '/applications' },
    { title: 'Tạo đơn từ mới', href: '/applications/create' }
  ];

  const pageName = 'Tạo đơn từ mới';
  const pageDes = 'Tạo và gửi yêu cầu đơn từ của bạn';
  const requiredPermission = 'applications';
  const permissionType = 'create' as const;

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      // requiredPermission={requiredPermission}
      // permissionType={permissionType}
    >
      <CreateApplicationForm />
    </MainLayout>
  );
};

export default CreateApplicationPage;

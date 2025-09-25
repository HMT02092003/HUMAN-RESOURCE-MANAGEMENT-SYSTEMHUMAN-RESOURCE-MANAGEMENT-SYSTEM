'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import ApplicationManagement from '../../components/applications/ApplicationManagement';
import { HomeOutlined, FileTextOutlined } from '@ant-design/icons';

const ApplicationsPage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý đơn từ', href: '/applications' }
  ];

  const pageName = 'Quản lý đơn từ';
  const pageDes = 'Tạo và quản lý các loại đơn từ của nhân viên';
  const requiredPermission = 'applications';
  const permissionType = 'read' as const;

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      // requiredPermission={requiredPermission}
      // permissionType={permissionType}
    >
      <ApplicationManagement />
    </MainLayout>
  );
};

export default ApplicationsPage;

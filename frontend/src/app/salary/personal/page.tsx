"use client";

import React from 'react';
import AllPayslips from '@/components/salary/personal/AllPayslips';
import MainLayout from '@/components/main-layout';
import { HomeOutlined } from '@ant-design/icons';

const PersonalPayslipsPage: React.FC = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Bảng lương cá nhân', href: '/salary/personal' }
  ];

  const pageName = 'Bảng lương cá nhân';
  const pageDes = 'Xem và quản lý bảng lương cá nhân của bạn';

  // Use the same permission key used for salary screens; adapt if you have a dedicated permission
  const requiredPermission = 'personal_salary_info';
  const permissionType = 'read';

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      requiredPermission={requiredPermission}
      permissionType={permissionType}
    >
      <AllPayslips />
    </MainLayout>
  );
};

export default PersonalPayslipsPage;

'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import ShiftConfigurationManagement from '@/components/shifts/ShiftConfigurationManagement';
import { HomeOutlined, SettingOutlined } from '@ant-design/icons';

const ShiftConfigurationPage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý ca làm việc', href: '/shifts' },
    { title: 'Cấu hình ca', href: '/shifts/configuration' }
  ];

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName="Cấu hình ca làm việc"
      pageDes="Quản lý các ca làm việc: sáng, chiều, tối, đêm..."
      requiredPermission="shiftConfiguration"
      permissionType="read"
    >
      <ShiftConfigurationManagement />
    </MainLayout>
  );
};

export default ShiftConfigurationPage;

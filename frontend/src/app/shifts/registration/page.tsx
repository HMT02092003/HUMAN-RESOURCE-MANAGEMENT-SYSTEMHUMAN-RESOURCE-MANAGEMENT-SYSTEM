'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import ShiftRegistrationManagement from '@/components/shifts/ShiftRegistrationManagement';
import { HomeOutlined, ClockCircleOutlined } from '@ant-design/icons';

const ShiftRegistrationPage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý ca làm việc', href: '/shifts' },
    { title: 'Đăng ký ca', href: '/shifts/registration' }
  ];

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName="Đăng ký ca làm việc"
      pageDes="Đăng ký ca làm việc theo nhu cầu cá nhân"
      requiredPermission="shiftRegistration"
      permissionType="create"
    >
      <ShiftRegistrationManagement />
    </MainLayout>
  );
};

export default ShiftRegistrationPage;

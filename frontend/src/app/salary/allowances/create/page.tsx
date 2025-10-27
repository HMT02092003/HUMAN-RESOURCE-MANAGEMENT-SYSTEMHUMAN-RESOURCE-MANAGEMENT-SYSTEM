"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import AllowanceForm from '@/components/salary/AllowanceForm';
import { HomeOutlined } from '@ant-design/icons';

const Page = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Cấu hình phụ cấp', href: '/salary/allowances' },
    { title: 'Tạo mới', href: '/salary/allowances/create' }
  ];

  return (
    <MainLayout breadcrumbItems={breadcrumbItems} pageName="Tạo phụ cấp" pageDes="Tạo mới phụ cấp" requiredPermission={'salary_allowances'} permissionType={'create' as any}>
      <AllowanceForm />
    </MainLayout>
  );
};

export default Page;

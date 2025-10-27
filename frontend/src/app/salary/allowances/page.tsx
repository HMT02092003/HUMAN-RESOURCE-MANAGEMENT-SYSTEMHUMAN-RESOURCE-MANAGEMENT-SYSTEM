"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import AdminAllowanceList from '@/components/salary/allowanceList';
import { HomeOutlined } from '@ant-design/icons';

const Page = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Cấu hình phụ cấp', href: '/salary/allowances' }
  ];

  const pageName = 'Cấu hình phụ cấp';
  const pageDes = 'Quản lý các loại phụ cấp toàn hệ thống. Bạn có thể thêm, sửa, dừng phụ cấp ở đây.';

  const requiredPermission = 'salary_allowances';
  const permissionType = 'read';

  return (
    <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName} pageDes={pageDes} requiredPermission={requiredPermission} permissionType={permissionType as any}>
      <AdminAllowanceList />
    </MainLayout>
  )
}

export default Page;
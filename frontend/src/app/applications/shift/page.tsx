"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import ShiftForm from '@/components/applications/application/ShiftForm';
import { HomeOutlined } from '@ant-design/icons';

const ShiftPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' },
    { title: 'Đơn đăng ký ca làm việc', href: '/applications/shift' }
  ];

  const pageName = "Đơn đăng ký ca làm việc";
  const pageDes = "Đăng ký ca sáng, chiều, đêm hoặc ca tăng ca nhiều ngày";

  const requiredPermission = "applications";
  const permissionType = "create";

  const handleSubmit = (data: any) => {
    console.log('Shift application submitted:', data);
  };

  const handleCancel = () => {
    router.push('/applications/select-type');
  };

  return (
    <>
      <MainLayout
        breadcrumbItems={breadcrumbItems}
        pageName={pageName}
        pageDes={pageDes}
        requiredPermission={requiredPermission}
        permissionType={permissionType}
      >
        <ShiftForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </MainLayout>
    </>
  );
};

export default ShiftPage;

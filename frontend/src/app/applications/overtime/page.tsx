"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import OvertimeForm from '@/components/applications/application/OvertimeForm';
import { HomeOutlined } from '@ant-design/icons';

const OvertimePage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' },
    { title: 'Đơn đăng ký tăng ca', href: '/applications/overtime' }
  ];

  const pageName = "Đơn đăng ký tăng ca";
  const pageDes = "Đăng ký làm thêm giờ 2/4/6 giờ với mức lương tăng ca";

  const requiredPermission = "applications";
  const permissionType = "create";

  const handleSubmit = (data: any) => {
    console.log('Overtime application submitted:', data);
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
        <OvertimeForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </MainLayout>
    </>
  );
};

export default OvertimePage;

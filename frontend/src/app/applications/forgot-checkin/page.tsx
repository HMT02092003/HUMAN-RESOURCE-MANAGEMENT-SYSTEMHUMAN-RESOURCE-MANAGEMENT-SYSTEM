"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import ForgotCheckInForm from '@/components/applications/application/ForgotCheckInForm';
import { HomeOutlined } from '@ant-design/icons';

const ForgotCheckinPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' },
    { title: 'Đơn báo cáo quên chấm công', href: '/applications/forgot-checkin' }
  ];

  const pageName = "Đơn báo cáo quên chấm công";
  const pageDes = "Báo cáo trường hợp quên check in/out và xin bổ sung chấm công";

  const requiredPermission = "applications";
  const permissionType = "create";

  const handleSubmit = (data: any) => {
    console.log('Forgot check-in application submitted:', data);
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
        <ForgotCheckInForm 
          onCancel={handleCancel}
        />
      </MainLayout>
    </>
  );
};

export default ForgotCheckinPage;

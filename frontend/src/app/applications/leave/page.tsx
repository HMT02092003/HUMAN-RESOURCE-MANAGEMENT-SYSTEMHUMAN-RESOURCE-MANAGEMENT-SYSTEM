"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import LeaveForm from '@/components/applications/application/LeaveForm';
import { HomeOutlined } from '@ant-design/icons';

const LeavePage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' },
    { title: 'Đơn xin nghỉ phép', href: '/applications/leave' }
  ];

  const pageName = "Đơn xin nghỉ phép";
  const pageDes = "Tạo đơn xin nghỉ phép có lương, không lương, nghỉ ốm, nghỉ cá nhân...";

  const requiredPermission = "applications";
  const permissionType = "create";

  const handleSubmit = (data: any) => {
    console.log('Leave application submitted:', data);
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
        <LeaveForm 
          onCancel={handleCancel}
        />
      </MainLayout>
    </>
  );
};

export default LeavePage;

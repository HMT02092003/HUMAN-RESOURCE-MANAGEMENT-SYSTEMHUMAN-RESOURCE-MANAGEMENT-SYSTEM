"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import ResignationForm from '@/components/applications/application/ResignationForm';
import { HomeOutlined } from '@ant-design/icons';

const ResignationPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' },
    { title: 'Đơn thôi việc', href: '/applications/resignation' }
  ];

  const pageName = "Đơn thôi việc";
  const pageDes = "Thông báo nghỉ việc và bàn giao công việc đầy đủ";

  const requiredPermission = "applications";
  const permissionType = "create";

  const handleSubmit = (data: any) => {
    console.log('Resignation application submitted:', data);
  };

  const handleCancel = () => {
    router.push('/applications/me');
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
        <ResignationForm 
          onCancel={handleCancel}
        />
      </MainLayout>
    </>
  );
};

export default ResignationPage;

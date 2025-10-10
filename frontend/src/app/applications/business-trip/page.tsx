"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import BusinessTripForm from '@/components/applications/application/BusinessTripForm';
import { HomeOutlined } from '@ant-design/icons';

const BusinessTripPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' },
    { title: 'Đơn đăng ký công tác', href: '/applications/business-trip' }
  ];

  const pageName = "Đơn đăng ký công tác";
  const pageDes = "Đăng ký công tác xa với thông tin chi tiết và bằng chứng";

  const requiredPermission = "applications";
  const permissionType = "create";

  const handleSubmit = (data: any) => {
    console.log('Business trip application submitted:', data);
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
        <BusinessTripForm 
          onCancel={handleCancel}
        />
      </MainLayout>
    </>
  );
};

export default BusinessTripPage;

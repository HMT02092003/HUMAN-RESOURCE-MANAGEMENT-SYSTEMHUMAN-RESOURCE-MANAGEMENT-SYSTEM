"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import MyApplicationList from '@/components/applications/MyApplicationList';
import { HomeOutlined } from '@ant-design/icons';

const MyApplicationsPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Danh sách đơn từ', href: '/applications' },
    { title: 'Đơn từ của tôi', href: '/applications/me' },
  ];

  const pageName = "Đơn từ cá nhân";
  const pageDes = "Quản lí các đơn từ bạn đã tạo như đơn xin nghỉ phép, đơn công tác, tăng ca...";

  const requiredPermission = "applications";
  const permissionType = "read";

  const handleCreateClick = () => {
    router.push('/applications/select-type');
  };

  const handleEditClick = (record: any) => {
    // Navigate to edit page based on application type
    const editRoutes: { [key: string]: string } = {
      leave: '/applications/leave/edit',
      overtime: '/applications/overtime/edit',
      business_trip: '/applications/business-trip/edit',
      forgot_check: '/applications/forgot-check/edit',
      shift_registration: '/applications/shift/edit',
      resignation: '/applications/resignation/edit'
    };
    
    const route = editRoutes[record.applicationType];
    if (route) {
      router.push(`${route}?id=${record.id}`);
    } else {
      router.push('/applications/select-type');
    }
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
        <MyApplicationList 
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
        />
      </MainLayout>
    </>
  );
};

export default MyApplicationsPage;

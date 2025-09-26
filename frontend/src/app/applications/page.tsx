'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import ApplicationList from '@/components/applications';
import { HomeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const ApplicationsPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Đơn từ', href: '/applications' }
  ];

  const pageName = 'Danh sách đơn từ';
  const pageDes = 'Xem và quản lý tất cả các đơn từ đã gửi';

  const handleCreateClick = () => {
    router.push('/applications/select-type');
  };

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
    >
      <ApplicationList onCreateClick={handleCreateClick} />
    </MainLayout>
  );
};

export default ApplicationsPage;

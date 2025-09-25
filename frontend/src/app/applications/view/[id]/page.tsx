'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/main-layout';
import ViewApplicationDetail from '@/components/applications/ViewApplicationDetail';
import { HomeOutlined, FileTextOutlined, EyeOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const ViewApplicationPage = () => {
  const params = useParams();
  const applicationId = params?.id as string;

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý đơn từ', href: '/applications' },
    { title: `Chi tiết đơn từ #${applicationId}`, href: `/applications/view/${applicationId}` }
  ];

  const pageName = `Chi tiết đơn từ #${applicationId}`;
  const pageDes = 'Xem thông tin chi tiết đơn từ';
  const requiredPermission = 'applications';
  const permissionType = 'read' as const;

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      // requiredPermission={requiredPermission}
      // permissionType={permissionType}
    >
      <ViewApplicationDetail applicationId={applicationId} />
    </MainLayout>
  );
};

export default ViewApplicationPage;

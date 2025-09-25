'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/main-layout';
import EditApplicationForm from '@/components/applications/EditApplicationForm';
import { HomeOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const EditApplicationPage = () => {
  const params = useParams();
  const applicationId = params?.id as string;

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý đơn từ', href: '/applications' },
    { title: `Chỉnh sửa đơn từ #${applicationId}`, href: `/applications/edit/${applicationId}` }
  ];

  const pageName = `Chỉnh sửa đơn từ #${applicationId}`;
  const pageDes = 'Cập nhật thông tin đơn từ của bạn';
  const requiredPermission = 'applications';
  const permissionType = 'update' as const;

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      // requiredPermission={requiredPermission}
      // permissionType={permissionType}
    >
      <EditApplicationForm applicationId={applicationId} />
    </MainLayout>
  );
};

export default EditApplicationPage;

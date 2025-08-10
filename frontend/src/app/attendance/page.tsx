'use client';

import React from 'react';
import MainLayout from '@/src/app/main-layout';
import AttendanceSimplePage from '@/src/components/attendance/simple-page';
import { HomeOutlined } from '@ant-design/icons';

const AttendancePage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Chấm công', href: '/attendance' }
  ];

  const pageName = 'Thông tin chấm công';
  const pageDes = 'Theo dõi thời gian làm việc và hiệu suất';
  const requiredPermission = 'attendance';
  const permissionType = 'read' as const;

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      // requiredPermission={requiredPermission}
      // permissionType={permissionType}
    >
      <AttendanceSimplePage />
    </MainLayout>
  );
};

export default AttendancePage;

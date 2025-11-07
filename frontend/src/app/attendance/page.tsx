'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import AttendanceSimplePage from '@/components/attendance';
import { HomeOutlined } from '@ant-design/icons';

const AttendancePage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Chấm công', href: '/attendance' }
  ];

  const pageName = 'Thông tin chấm công';
  const pageDes = 'Theo dõi thời gian làm việc và hiệu suất';
  
  const requiredPermission = 'timeAttendance';
  const permissionType = 'read';

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      requiredPermission={requiredPermission}
      permissionType={permissionType}
    >
      <AttendanceSimplePage />
    </MainLayout>
  );
};

export default AttendancePage;

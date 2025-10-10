"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import AttendanceApprovalManagement from '@/components/attendance/AttendanceApprovalManagement';
import { HomeOutlined } from '@ant-design/icons';

const AttendanceApprovalPage = () => {
  const router = useRouter();

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Chấm công', href: '/attendance' },
    { title: 'Duyệt bảng chấm công', href: '/attendance/approval' }
  ];

  const pageName = "Duyệt bảng chấm công";
  const pageDes = "Xem và phê duyệt bảng chấm công của nhân viên theo phòng ban";

  const requiredPermission = "timeAttendance";
  const permissionType = "approve";

  return (
    <>
      <MainLayout
        breadcrumbItems={breadcrumbItems}
        pageName={pageName}
        pageDes={pageDes}
        // requiredPermission={requiredPermission}
        // permissionType={permissionType}
      >
        <AttendanceApprovalManagement />
      </MainLayout>
    </>
  );
};

export default AttendanceApprovalPage;

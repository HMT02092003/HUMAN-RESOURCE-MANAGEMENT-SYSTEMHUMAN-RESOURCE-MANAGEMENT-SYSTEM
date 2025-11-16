import React from 'react';
import MainLayout from '@/components/main-layout';
import ShiftApprovalManagement from '@/components/shifts/ShiftApprovalManagement';
import { HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';

const ShiftApprovalPage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Quản lý ca làm việc', href: '/shifts' },
    { title: 'Duyệt đơn đăng ký ca', href: '/shifts/approval' }
  ];

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName="Duyệt đơn đăng ký ca"
      pageDes="Quản lý và duyệt các đơn đăng ký ca của nhân viên"
    >
      <ShiftApprovalManagement />
    </MainLayout>
  );
};

export default ShiftApprovalPage;

'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import KpiManagementList from '@/components/kpi-management';
import { HomeOutlined } from '@ant-design/icons';

const KpiManagementPage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lý KPI', href: '/kpi-management' }
  ];

  const pageName = 'Quản lý KPI nhân viên';
  const pageDes = 'Theo dõi hiệu suất làm việc và KPI của nhân viên trong các dự án';

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
    >
      <KpiManagementList />
    </MainLayout>
  );
};

export default KpiManagementPage;

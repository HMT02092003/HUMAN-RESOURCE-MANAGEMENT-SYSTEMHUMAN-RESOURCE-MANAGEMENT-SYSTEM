'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import SelectApplicationType from '@/components/applications/SelectApplicationType';
import { HomeOutlined } from '@ant-design/icons';

const SelectApplicationTypePage = () => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Đơn từ', href: '/applications' },
    { title: 'Chọn loại đơn', href: '/applications/select-type' }
  ];

  const pageName = 'Tạo đơn từ mới';
  const pageDes = 'Chọn loại đơn từ bạn muốn tạo';

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
    >
      <SelectApplicationType />
    </MainLayout>
  );
};

export default SelectApplicationTypePage;

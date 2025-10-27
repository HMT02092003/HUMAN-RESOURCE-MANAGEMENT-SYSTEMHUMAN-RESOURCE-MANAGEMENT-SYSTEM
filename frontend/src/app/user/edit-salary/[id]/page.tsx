"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import EditSalary from '@/components/users/EditSalary';
import { HomeOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';

const EditSalaryPage = () => {
  const params = useParams();
  const id = params?.id;

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Quản lí người dùng', href: '/user' },
    { title: 'Cấu hình lương', href: `/user/edit-salary/${id}` }
  ];

  const pageName = 'Cấu hình lương nhân viên';
  const pageDes = 'Thêm / chỉnh lương cơ bản, phụ cấp, mã thuế và thông tin ngân hàng cho nhân viên.';

  return (
    <MainLayout
      breadcrumbItems={breadcrumbItems}
      pageName={pageName}
      pageDes={pageDes}
      requiredPermission="users"
      permissionType="update"
    >
      <EditSalary id={id} />
    </MainLayout>
  );
};

export default EditSalaryPage;

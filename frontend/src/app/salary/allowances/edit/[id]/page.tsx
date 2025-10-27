"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import AllowanceForm from '@/components/salary/allowanceForm';
import { HomeOutlined } from '@ant-design/icons';

type Props = { params: { id: string } };

const Page: React.FC<Props> = ({ params }) => {
  const id = Number(params.id);
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Cấu hình phụ cấp', href: '/salary/allowances' },
    { title: 'Sửa', href: `/salary/allowances/edit/${id}` }
  ];

  return (
    <MainLayout breadcrumbItems={breadcrumbItems} pageName="Sửa phụ cấp" pageDes={`Sửa phụ cấp #${id}`} requiredPermission={'salary_allowances'} permissionType={'update' as any}>
      <AllowanceForm id={id} />
    </MainLayout>
  );
};

export default Page;

"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import dynamic from 'next/dynamic';
import { HomeOutlined } from '@ant-design/icons';
import CreateCv from '@/components/CV/CreateCv';


export default function CreateCvPage() {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Hồ Sơ', href: '/jobs' },
    { title: 'Tạo Hồ Sơ' },
  ];

  const pageName = 'Tạo Hồ Sơ';
  const pageDes = 'Tạo hồ sơ ứng viên mới';

  return (
    <MainLayout pageName={pageName} breadcrumbItems={breadcrumbItems} pageDes={pageDes}>
        <CreateCv />
    </MainLayout>
  );
}

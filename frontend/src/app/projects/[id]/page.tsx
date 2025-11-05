'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import ProjectDetail from '@/components/projects/ProjectDetail';
import { HomeOutlined } from '@ant-design/icons';

interface PageProps {
  params: {
    id: string;
  };
}

const ProjectDetailPage: React.FC<PageProps> = ({ params }) => {
  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
    { title: 'Quản lý dự án', href: '/projects' },
    { title: 'Chi tiết dự án', href: `/projects/${params.id}` },
  ];

  const pageName = 'Chi tiết dự án';
  const pageDes = 'Xem và quản lý dự án';

  return (
    <MainLayout requiredPermission="jobs" pageName={pageName} pageDes={pageDes} breadcrumbItems={breadcrumbItems}>
      <ProjectDetail projectId={params.id} />
    </MainLayout>
  );
};

export default ProjectDetailPage;

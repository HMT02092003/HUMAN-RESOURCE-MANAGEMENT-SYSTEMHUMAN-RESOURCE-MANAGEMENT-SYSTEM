'use client';

import { useParams } from 'next/navigation';
import Edit from '@/src/components/roles/edit';
import MainLayout from "@/src/app/main-layout"
import { HomeOutlined } from '@ant-design/icons';



const EditProfilePage = () => {
  const params = useParams();
  const id = params.id as string;

  if (!id) {
    return <div>Loading...</div>;
  }

  const breadcrumbItems = [
    { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
    { title: 'Quản lí vai trò', href: '/roles' },
    { title: 'Cập nhật thông tin vai trò', href: `/roles/edit/${id}` }
  ];

  const pageName = "Cập nhật thông tin chức vụ";
  const pageDes = "Cập nhật thông tin chức vụ trong hệ thống"

  return (
    <>
      <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName} pageDes={pageDes}>
        <Edit id={id} />;
      </MainLayout>

    </>
  )

};

export default EditProfilePage;
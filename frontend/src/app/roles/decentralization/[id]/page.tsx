'use client';

import { useParams } from 'next/navigation';
import Decentralization from '@/components/roles/decentralization';
import MainLayout from "@/components/main-layout"
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

  const pageName = "Cập nhật thông tin phân quyền";
  const pageDes = "Cập nhật thông tin phân quyền trong hệ thống"

  return (
    <>
      <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName} pageDes={pageDes}>
        <Decentralization id={id} />;
      </MainLayout>

    </>
  )

};

export default EditProfilePage;
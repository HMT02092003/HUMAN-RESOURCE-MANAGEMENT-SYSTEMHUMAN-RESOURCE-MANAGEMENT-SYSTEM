'use client';

import { useParams } from 'next/navigation';
import Edit from '@/src/components/departments/edit';
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
    { title: 'Quản lí phòng ban', href: '/chevrons' },
    { title: 'Cập nhật thông tin phòng ban', href: `/chevrons/edit/${id}` }
  ];

  const pageName = "Cập nhật thông tin chức vụ";
  const pageDes = "Cập nhật thông tin chức vụ trong hệ thống"


  const requiredPermission = "departments";
  const permissionType = "update";

  return (
    <>
      <MainLayout
        breadcrumbItems={breadcrumbItems}
        pageName={pageName}
        pageDes={pageDes}
        requiredPermission={requiredPermission}
        permissionType={permissionType}
      >
        <Edit id={id} />;
      </MainLayout>

    </>
  )

};

export default EditProfilePage;
'use client';

import { useParams } from 'next/navigation';
import Edit from '@/components/contractTypes/edit';
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
    { title: 'Quản lí loại hợp đồng', href: '/contractTypes' },
    { title: 'Cập nhật loại hợp đồng', href: `/contractTypes/edit/${id}` }
  ];

  const pageName = "Cập nhật thông tin loại hợp đồng";
  const pageDes = "Cập nhật thông tin loại hợp đồng trong hệ thống"


  const requiredPermission = "contractTypes";
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
        <Edit id={id} />
      </MainLayout>

    </>
  )

};

export default EditProfilePage;
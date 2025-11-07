"use client";

import React from 'react'
import Home from "../../components/home/index"
import MainLayout from "@/components/main-layout"

const HomePage = () => {
  const breadcrumbItems = [
    { title: 'Trang chủ', href: '/home' },
    { title: 'Dashboard', href: '/home' }
  ];

  const pageName = "Dashboard";
  const pageDes = "Tổng quan hệ thống quản lý nhân sự";

  return (
    <>
      <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName} pageDes={pageDes}>
        <Home />
      </MainLayout>
    </>
  )
}

export default HomePage
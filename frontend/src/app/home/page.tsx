"use client";

import React from 'react'
import Home from "../../components/home/index"
import MainLayout from "../main-layout"

const HomePage = () => {
  const breadcrumbItems = [
    { title: 'Trang chủ', href: '/home' },
    { title: 'Dashboard', href: '/home' }
  ];

  const pageName = "Dashboard"

  return (
    <>
      <MainLayout breadcrumbItems={breadcrumbItems} pageName={pageName}>
        <Home />
      </MainLayout>
    </>
  )
}

export default HomePage
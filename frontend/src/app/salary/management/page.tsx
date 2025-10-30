"use client";

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/main-layout';
import SalaryManagement from '@/components/salary/salaryManagement/salaryManagement';
// ...existing code...

const SalaryManagementPage: React.FC = () => {
  return (
  <MainLayout pageName="Quản lý bảng lương" pageDes="Danh sách bảng lương" requiredPermission={'salaries'} permissionType={'read'}>
      <SalaryManagement />
    </MainLayout>
  );
};

export default SalaryManagementPage;

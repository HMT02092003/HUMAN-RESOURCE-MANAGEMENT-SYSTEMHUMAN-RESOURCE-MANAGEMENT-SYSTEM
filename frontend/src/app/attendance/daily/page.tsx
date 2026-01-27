'use client';

import React from 'react';
import MainLayout from '@/components/main-layout';
import DailyAttendanceMonitor from '@/components/attendance/DailyAttendanceMonitor';
import { HomeOutlined } from '@ant-design/icons';

const DailyAttendancePage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Chấm công', href: '/attendance' },
        { title: 'Chấm công hàng ngày' }
    ];

    const pageName = 'Chấm công hàng ngày';
    const pageDes = 'Theo dõi chấm công hàng ngày của nhân viên';

    // Use the new permission key
    const requiredPermission = 'dailyAttendance';
    const permissionType = 'read';

    return (
        <MainLayout
            breadcrumbItems={breadcrumbItems}
            pageName={pageName}
            pageDes={pageDes}
            requiredPermission={requiredPermission}
            permissionType={permissionType}
        >
            <DailyAttendanceMonitor />
        </MainLayout>
    );
};

export default DailyAttendancePage;

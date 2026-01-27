"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import { HomeOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';

const AttendanceHistoryPage = () => {
    const breadcrumbItems = [
        { title: <HomeOutlined style={{ fontSize: "20px" }} />, href: '/home' },
        { title: 'Chấm công', href: '/attendance' },
        { title: 'Lịch sử chấm công (AI)' }
    ];

    const pageName = 'Lịch sử chấm công (AI)';
    const pageDes = 'Xem và tìm kiếm lịch sử chấm công nhận diện khuôn mặt';

    // Permission key from auth-service seed: 'attendance_history' (value 31)
    const requiredPermission = 'attendance_history';
    const permissionType = 'read';

    return (
        <MainLayout
            breadcrumbItems={breadcrumbItems}
            pageName={pageName}
            pageDes={pageDes}
            requiredPermission={requiredPermission}
            permissionType={permissionType}
        >
            <AttendanceHistory />
        </MainLayout>
    );
};

export default AttendanceHistoryPage;

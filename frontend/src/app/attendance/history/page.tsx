"use client";

import React from 'react';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import CheckPermission from '@/components/common/CheckPermission';

const attendanceHistoryPermission = 'attendance_history';

const AttendanceHistoryPage = () => {
    return (
        <CheckPermission requiredPermission={attendanceHistoryPermission}>
            <AttendanceHistory />
        </CheckPermission>
    );
};

export default AttendanceHistoryPage;

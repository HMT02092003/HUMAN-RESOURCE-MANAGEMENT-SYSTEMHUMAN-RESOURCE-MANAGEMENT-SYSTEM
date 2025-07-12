"use client";
import React from 'react';
import { Result, Button } from 'antd';
import { useRouter } from 'next/navigation';

const UnauthorizedPage = () => {
    const router = useRouter();

    return (
        <Result
            status="403"
            title="Opp!"
            subTitle="Bạn không có quyền truy cập trang này."
            extra={<Button type="primary" onClick={() => router.push('/home')}>Về trang chủ</Button>}
        />
    );
};

export default UnauthorizedPage;

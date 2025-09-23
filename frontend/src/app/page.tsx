"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = document.cookie.includes('token=') || localStorage.getItem('token');
    
    if (token) {
      // Redirect to dashboard/home
      router.push('/home');
    } else {
      // Redirect to login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="loading-spinner">
      <Spin size="large" tip="Đang tải..." />
    </div>
  );
}

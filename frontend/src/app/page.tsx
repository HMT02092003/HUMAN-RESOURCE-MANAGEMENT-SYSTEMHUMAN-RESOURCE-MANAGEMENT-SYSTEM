"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import MainLayout from '@/components/main-layout';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = document.cookie.includes('token=') || localStorage.getItem('token');
    
    if (token) {
      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      // Redirect to login
      router.push('/login');
    }
  }, [router]);

  return (
    <MainLayout pageName="" pageDes="">
      <div style={{ padding: 24 }}>
        <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
          <LoadingSkeleton type="card" count={6} />
        </div>
      </div>
    </MainLayout>
  );
}

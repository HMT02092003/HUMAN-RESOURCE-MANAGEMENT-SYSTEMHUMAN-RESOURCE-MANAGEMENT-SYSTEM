"use client";

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import Cookies from 'js-cookie';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    Cookies.remove('token');
    router.push('/login');
  }, [router]);

  return (
    <></>
  );
}

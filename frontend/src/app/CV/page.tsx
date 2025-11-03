"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import dynamic from 'next/dynamic';
import { HomeOutlined } from '@ant-design/icons';
import CvManager from '@/components/CV/CvManager';


export default function JobsPage() {
	const breadcrumbItems = [
		{ title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
		{ title: 'Hồ Sơ', href: '/jobs' },
	];

	const pageName = 'Hồ Sơ';
	const pageDes = 'Xem và quản lý tất cả hồ sơ ứng viên';

	return (
		<MainLayout pageName={pageName} pageDes={pageDes} breadcrumbItems={breadcrumbItems}>
				<div style={{ padding: 24 }}>
					<CvManager />
				</div>
			</MainLayout>
	);
}

"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import dynamic from 'next/dynamic';
import { HomeOutlined } from '@ant-design/icons';
import JobManager from '@/components/jobs/JobManager';

// Import Job manager (client component)

export default function JobsPage() {
	const breadcrumbItems = [
		{ title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
		{ title: 'Quản lí công việc', href: '/jobs' },
	];

	const pageName = 'Quản lí công việc';
	const pageDes = 'Xem và quản lý tất cả công việc';

	return (
		<MainLayout
			pageName={pageName}
			pageDes={pageDes}
			breadcrumbItems={breadcrumbItems}
		>
			<div style={{ padding: 24 }}>
				<JobManager />
			</div>
		</MainLayout>
	);
}

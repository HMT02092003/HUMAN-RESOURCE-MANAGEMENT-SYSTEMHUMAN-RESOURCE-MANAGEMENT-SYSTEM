"use client";

import React from 'react';
import MainLayout from '@/components/main-layout';
import { HomeOutlined } from '@ant-design/icons';
import ProjectManager from '@/components/projects/ProjectManager';

export default function ProjectsPage() {
	const breadcrumbItems = [
		{ title: <HomeOutlined style={{ fontSize: '20px' }} />, href: '/home' },
		{ title: 'Quản lý dự án', href: '/projects' },
	];

	const pageName = 'Quản lý dự án';
	const pageDes = 'Xem và quản lý tất cả dự án';

	return (
		<MainLayout
			pageName={pageName}
			pageDes={pageDes}
			breadcrumbItems={breadcrumbItems}
			requiredPermission="projects"
		>
			<div style={{ padding: 24 }}>
				<ProjectManager />
			</div>
		</MainLayout>
	);
}

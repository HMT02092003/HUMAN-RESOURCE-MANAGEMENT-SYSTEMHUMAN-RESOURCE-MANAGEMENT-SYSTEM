import React, { useEffect, useState, useRef } from 'react';
import { Table, Button, Space, Modal, message, Row, Col, Tag, Input } from 'antd';
import { DeleteOutlined, PlusOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import type { InputRef, TableColumnsType, TableColumnType } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import jobService from '@/service/jobService';
import UserService from '@/service/userService';
import { useRouter } from 'next/navigation';

interface CvRecord {
	cv_id: string;
	user_id: number;
	file_path: string;
	uploaded_at?: string;
	original_text?: string;
}

interface UserInfo {
	id: number;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	username?: string;
	email?: string;
}

interface CvWithUser extends CvRecord {
	user?: UserInfo;
	fullName?: string;
	userEmail?: string;
}

const CvManager: React.FC = () => {
	const [data, setData] = useState<CvWithUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [pagination, setPagination] = useState({
		current: 1,
		pageSize: 10,
		total: 0
	});
	const searchInput = useRef<InputRef>(null);
	const router = useRouter();

	const load = async (page = 1, pageSize = 10) => {
		setLoading(true);
		try {
			const res = await jobService.fetchCvs({
				page,
				pageSize
			});

			// Handle response structure and prefer server-enriched user info
			let rawData: CvRecord[] = [];
			let paginationData = { current: page, pageSize, total: 0 };

			if (res?.data?.data && Array.isArray(res.data.data)) {
				rawData = res.data.data;
				paginationData = res.data.pagination || paginationData;
			} else if (Array.isArray(res?.data)) {
				rawData = res.data;
			}

			let cvWithUsers: CvWithUser[] = [];

			// If backend already attached `user` objects, use them directly to avoid extra calls
			if (rawData.length > 0 && (rawData[0] as any).user !== undefined) {
				cvWithUsers = rawData.map((cv: any) => {
					const user = cv.user || null;
					const fullName = user
						? (user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email)
						: `User ${cv.user_id}`;
					return {
						...cv,
						user,
						fullName,
						userEmail: user?.email
					};
				});
			} else {
				// Fallback: fetch user info individually (back-compat)
				cvWithUsers = await Promise.all(
					rawData.map(async (cv: CvRecord) => {
						try {
							const userRes = await UserService.getUserById(cv.user_id as any);
							const fullName = userRes?.fullName || [userRes?.firstName, userRes?.lastName].filter(Boolean).join(' ') || userRes?.username || userRes?.email || `User ${cv.user_id}`;
							return { ...cv, user: userRes, fullName, userEmail: userRes?.email };
						} catch (err) {
							console.error(`Failed to fetch user ${cv.user_id}:`, err);
							return { ...cv, user: undefined, fullName: `User ${cv.user_id}`, userEmail: undefined };
						}
					})
				);
			}

			setData(cvWithUsers);
			setPagination(paginationData);
		} catch (err: any) {
			console.error('Load CVs error:', err);
			message.error(err?.message || 'Failed to load CVs');
		} finally {
			setLoading(false);
		}
	};

	// Helper: gateway base URL (use env if provided)
	const getGatewayBase = () => {
		if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_GATEWAY_URL) {
			return process.env.NEXT_PUBLIC_API_GATEWAY_URL.replace(/\/$/, '');
		}
		if (typeof window !== 'undefined') {
			return `${window.location.protocol}//${window.location.hostname}:4000`;
		}
		return 'http://localhost:4000';
	};

	// Helper: direct Job Service base (used for serving static uploads)
	const getJobServiceBase = () => {
		if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_JOB_SERVICE_URL) {
			return process.env.NEXT_PUBLIC_JOB_SERVICE_URL.replace(/\/$/, '');
		}
		if (typeof window !== 'undefined') {
			return `${window.location.protocol}//${window.location.hostname}:4008`;
		}
		return 'http://localhost:4008';
	};

	useEffect(() => {
		load();
	}, []);

	const goCreate = () => {
		router.push('/CV/create');
	};

	const handleDelete = (cvId: string) => {
		Modal.confirm({
			title: 'Xóa CV',
			content: 'Bạn có chắc muốn xóa CV này?',
			onOk: async () => {
				try {
					await jobService.deleteCv(cvId);
					message.success('Đã xóa');
					load(pagination.current, pagination.pageSize);
				} catch (err: any) {
					message.error(err?.message || 'Xóa thất bại');
				}
			}
		});
	};

	const handleBulkDelete = () => {
		if (selectedRowKeys.length === 0) {
			message.warning('Vui lòng chọn ít nhất một bản ghi');
			return;
		}

		Modal.confirm({
			title: 'Xóa nhiều CV',
			content: `Bạn có chắc muốn xóa ${selectedRowKeys.length} CV đã chọn?`,
			onOk: async () => {
				try {
					await jobService.bulkDeleteCvs(selectedRowKeys as string[]);
					message.success(`Đã xóa ${selectedRowKeys.length} CV`);
					setSelectedRowKeys([]);
					load(pagination.current, pagination.pageSize);
				} catch (err: any) {
					message.error(err?.message || 'Xóa thất bại');
				}
			}
		});
	};

	const handleSearch = (
		selectedKeys: string[],
		confirm: FilterDropdownProps['confirm'],
		dataIndex: string,
	) => {
		confirm();
	};

	const handleReset = (clearFilters: () => void) => {
		clearFilters();
	};

	const getColumnSearchProps = (dataIndex: keyof CvWithUser, title: string): TableColumnType<CvWithUser> => ({
		filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
			<div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
				<Input
					ref={searchInput}
					placeholder={`Tìm ${title}`}
					value={selectedKeys[0]}
					onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
					onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
					style={{ marginBottom: 8, display: 'block' }}
				/>
				<Space>
					<Button
						type="primary"
						onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
						icon={<SearchOutlined />}
						size="small"
						style={{ width: 90 }}
					>
						Tìm
					</Button>
					<Button
						onClick={() => clearFilters && handleReset(clearFilters)}
						size="small"
						style={{ width: 90 }}
					>
						Xóa
					</Button>
				</Space>
			</div>
		),
		filterIcon: (filtered: boolean) => (
			<SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
		),
		onFilter: (value, record) => {
			const val = record[dataIndex];
			return val ? String(val).toLowerCase().includes(String(value).toLowerCase()) : false;
		},
		onFilterDropdownOpenChange: (visible) => {
			if (visible) {
				setTimeout(() => searchInput.current?.select(), 100);
			}
		},
	});

	const columns: TableColumnsType<CvWithUser> = [
		{
			title: 'Người dùng',
			dataIndex: 'fullName',
			key: 'fullName',
			...getColumnSearchProps('fullName', 'người dùng'),
			sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
			render: (fullName: string, record) => (
				<Space direction="vertical" size={0}>
					<strong>{fullName}</strong>
					{record.userEmail && <span style={{ fontSize: 12, color: '#666' }}>{record.userEmail}</span>}
				</Space>
			),
		},
		{
			title: 'File CV',
			dataIndex: 'file_path',
			key: 'file_path',
			...getColumnSearchProps('file_path', 'file'),
			render: (v: string) => {
				if (!v) return 'N/A';
				// Normalize Windows backslashes to forward slashes
				const normalized = v.replace(/\\/g, '/').replace(/^\/+/, '');
				// Use direct Job Service URL for static files so we hit the /uploads static handler
				const url = `${getJobServiceBase()}/${normalized}`;
				const fileName = normalized.split('/').pop() || 'CV';
				return (
					<a href={url} target="_blank" rel="noreferrer" download={fileName}>
						<FileTextOutlined /> {fileName}
					</a>
				);
			},
		},
		{
			title: 'Ngày tải lên',
			dataIndex: 'uploaded_at',
			key: 'uploaded_at',
			sorter: (a, b) => {
				const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
				const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
				return dateA - dateB;
			},
			defaultSortOrder: 'descend',
			render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : 'N/A',
		},
		{
			title: 'Thao tác',
			key: 'actions',
			fixed: 'right',
			width: 100,
			render: (_: any, record: CvWithUser) => (
				<Button
					danger
					size="small"
					icon={<DeleteOutlined />}
					onClick={() => handleDelete(record.cv_id)}
				>
					Xóa
				</Button>
			)
		}
	];

	const rowSelection = {
		selectedRowKeys,
		onChange: (selectedKeys: React.Key[]) => {
			setSelectedRowKeys(selectedKeys);
		},
	};

	return (
		<div>
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col>
					<Button type="primary" icon={<PlusOutlined />} onClick={goCreate}>
						Tạo mới hồ sơ
					</Button>
				</Col>
				{selectedRowKeys.length > 0 && (
					<Col>
						<Button
							danger
							icon={<DeleteOutlined />}
							onClick={handleBulkDelete}
						>
							Xóa {selectedRowKeys.length} mục đã chọn
						</Button>
					</Col>
				)}
			</Row>

			<Table
				rowKey="cv_id"
				dataSource={data}
				columns={columns}
				loading={loading}
				rowSelection={rowSelection}
				pagination={{
					...pagination,
					showSizeChanger: true,
					showTotal: (total) => `Tổng ${total} bản ghi`,
					onChange: (page, pageSize) => load(page, pageSize),
				}}
				scroll={{ x: 800 }}
			/>
		</div>
	);
};

export default CvManager;

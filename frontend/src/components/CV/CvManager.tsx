import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Space, Modal, message, Row, Col, Tag, Input, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined, FileTextOutlined, SearchOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { usePermission } from "@/hooks/usePermission";
import CheckPermission from "@/components/common/CheckPermission";
import type { FilterDropdownProps } from 'antd/es/table/interface';
import jobService from '@/service/jobService';
import UserService from '@/service/userService';
import { useRouter } from 'next/navigation';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import dayjs from 'dayjs';

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
	const [excelData, setExcelData] = useState<CvWithUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [skillsModalVisible, setSkillsModalVisible] = useState(false);
	const [skillsModalData, setSkillsModalData] = useState<{ fullName: string; text: string }>({ fullName: '', text: '' });
	const searchInput = useRef<InputRef>(null);
	const router = useRouter();

	// Helper: gateway base URL (use env if provided)
	const getGatewayBase = () => {
		if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_GATEWAY_URL) {
			return process.env.NEXT_PUBLIC_API_GATEWAY_URL.replace(/\/$/, '');
		}
		return '';
	};

	// Helper: direct Job Service base (used for serving static uploads)
	const getJobServiceBase = () => {
		if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_JOB_SERVICE_URL) {
			return process.env.NEXT_PUBLIC_JOB_SERVICE_URL.replace(/\/$/, '');
		}
		return '';
	};

	// do not auto-load here; ServerSideTable will call `fetchData`

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
					setRefreshTrigger((v) => v + 1);
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
					setRefreshTrigger((v) => v + 1);
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

	// We will use ServerSideTable filters; keep this helper for backward compatibility if needed
	const getColumnSearchProps = (dataIndex: keyof CvWithUser, title: string) => ({
		// placeholder - ServerSideTable will render its own filter dropdowns
	});

	const columns: ServerSideColumnType<CvWithUser>[] = [
		{
			title: 'Người dùng',
			dataIndex: 'fullName',
			key: 'fullName',
			searchField: 'fullName',
			filterType: 'text',
			sortable: true,
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
			searchField: 'file_path',
			filterType: 'text',
			render: (v: string) => {
				if (!v) return 'N/A';
				const normalized = v.replace(/\\/g, '/').replace(/^\/+/, '');
				const fileName = normalized.split('/').pop() || 'CV';
				return (
					<Space>
						<FileTextOutlined style={{ color: '#1890ff' }} />
						<span>{fileName}</span>
					</Space>
				);
			},
		},
		{
			title: 'Ngày tải lên',
			dataIndex: 'uploaded_at',
			key: 'uploaded_at',
			searchField: 'uploaded_at',
			filterType: 'date',
			sortable: true,
			defaultSortOrder: 'descend' as const,
			render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : 'N/A',
		},
		{
			title: 'Thao tác',
			key: 'actions',
			fixed: 'right',
			width: 180,
			render: (_: any, record: CvWithUser) => {
				const normalized = record.file_path ? record.file_path.replace(/\\/g, '/').replace(/^\/+/, '') : '';
				const fileUrl = normalized ? `${getJobServiceBase()}/${normalized}` : '';
				const fileName = normalized ? normalized.split('/').pop() || 'CV' : 'CV';

				return (
					<Space size={4}>
						{fileUrl && (
							<>
								<Tooltip title="Xem hồ sơ">
									<Button
										type="link"
										size="small"
										icon={<EyeOutlined />}
										onClick={() => window.open(fileUrl, '_blank')}
										style={{ color: '#1890ff' }}
									/>
								</Tooltip>
								<Tooltip title="Tải hồ sơ">
									<Button
										type="link"
										size="small"
										icon={<DownloadOutlined />}
										onClick={() => {
											const a = document.createElement('a');
											a.href = fileUrl;
											a.download = fileName;
											a.target = '_blank';
											document.body.appendChild(a);
											a.click();
											document.body.removeChild(a);
										}}
										style={{ color: '#52c41a' }}
									/>
								</Tooltip>
							</>
						)}
						<Tooltip title="Xem kỹ năng phân tích">
							<Button
								type="link"
								size="small"
								icon={<FileTextOutlined />}
								onClick={() => {
									setSkillsModalData({
										fullName: record.fullName || 'Không rõ',
										text: record.original_text || 'Chưa có dữ liệu phân tích kỹ năng.'
									});
									setSkillsModalVisible(true);
								}}
								style={{ color: '#722ed1' }}
							/>
						</Tooltip>
						<CheckPermission permissionKey="CV" requiredType="delete">
							<Tooltip title="Xóa">
								<Button
									danger
									type="link"
									size="small"
									icon={<DeleteOutlined />}
									onClick={() => handleDelete(record.cv_id)}
								/>
							</Tooltip>
						</CheckPermission>
					</Space>
				);
			}
		}
	];

	// Row selection will be handled by ServerSideTable onSelectionChange

	const excelColumns: ExcelColumn[] = [
		{ title: 'Người dùng', dataIndex: 'fullName', width: 25 },
		{ title: 'Email', dataIndex: 'userEmail', width: 25 },
		{ title: 'File CV', dataIndex: 'file_path', width: 35 },
		{ title: 'Ngày tải lên', dataIndex: 'uploaded_at', width: 15, render: (val: any) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '' }
	];


	const handleSelectionChange = (keys: React.Key[], rows: CvWithUser[]) => {
		setSelectedRowKeys(keys);
	};

	const fetchData = useCallback(async (params: any) => {
		const res = await jobService.fetchCvs(params);
		// Normalize response and map userInfo -> user/fullName/userEmail for rendering
		const body = res?.data ?? res;
		// body may be { success, data: [...], pagination, total }
		const rowsRaw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
		const mapped = (rowsRaw as any[]).map((r) => {
			const userInfo = r.userInfo || r.user || null;
			const fullName = userInfo
				? (userInfo.fullName || [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') || userInfo.username || userInfo.email)
				: `User ${r.user_id}`;
			return {
				...r,
				user: userInfo,
				fullName,
				userEmail: userInfo?.email,
			};
		});

		const pagination = body?.pagination ?? { page: params.page ?? 1, pageSize: params.limit ?? params.pageSize ?? 10, total: body?.total ?? mapped.length };

		return {
			data: mapped,
			total: body?.total ?? pagination.total,
			pagination: {
				page: pagination.page,
				pageSize: pagination.pageSize,
				total: pagination.total,
			},
		};
	}, []);

	return (
		<div>
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col>
					<CheckPermission permissionKey="CV" requiredType="create">
						<Button type="primary" icon={<PlusOutlined />} onClick={goCreate}>
							Tạo mới hồ sơ
						</Button>
					</CheckPermission>
				</Col>
				{selectedRowKeys.length > 0 && (
					<Col>
						<CheckPermission permissionKey="CV" requiredType="delete">
							<Button
								danger
								icon={<DeleteOutlined />}
								onClick={handleBulkDelete}
							>
								Xóa {selectedRowKeys.length} mục đã chọn
							</Button>
						</CheckPermission>
					</Col>
				)}
				<Col>
					<ExcelExportButton
						data={excelData}
						columns={excelColumns}
						fileName={`danh-sach-cv-${dayjs().format('YYYY-MM-DD')}`}
						title="DANH SÁCH HỒ SƠ CV"
						description={`Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
					/>
				</Col>
			</Row>

			<ServerSideTable
				rowKey="cv_id"
				columns={columns}
				fetchData={fetchData}
				showSelection
				onSelectionChange={handleSelectionChange}
				refreshTrigger={refreshTrigger}
				onDataChange={useCallback((rows: any[], pagination: any) => {
					// keep current page rows for export
					setExcelData(rows as CvWithUser[]);
				}, [])}
				scroll={{ x: 800 }}
			/>

			{/* Modal xem kỹ năng phân tích từ CV */}
			<Modal
				title={`Kỹ năng phân tích - ${skillsModalData.fullName}`}
				open={skillsModalVisible}
				onCancel={() => setSkillsModalVisible(false)}
				footer={[
					<Button key="close" onClick={() => setSkillsModalVisible(false)}>
						Đóng
					</Button>
				]}
				width={700}
			>
				<div style={{ maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap', padding: '12px 0', lineHeight: 1.8 }}>
					{skillsModalData.text}
				</div>
			</Modal>
		</div>
	);
};

export default CvManager;

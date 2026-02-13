import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Space, Typography, Empty, message, Tooltip, Tag, Modal, Form, Input } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import applicationService from '@/service/applicationService';
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_COLORS } from '@/config/constant';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import ApplicationDetailModal from './ApplicationDetailModal';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import dayjs from 'dayjs';
import { usePermission } from "@/hooks/usePermission";
import CheckPermission from "@/components/common/CheckPermission";

// Material icons for filters
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import FlightIcon from '@mui/icons-material/Flight';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import EventIcon from '@mui/icons-material/Event';

const { Title, Text } = Typography;

interface ApplicationListProps {
    onCreateClick?: () => void;
    onEditClick?: (record: any) => void;
}

const ApplicationList: React.FC<ApplicationListProps> = ({
    onCreateClick,
    onEditClick
}) => {
    const router = useRouter();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [currentPageData, setCurrentPageData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Handle data changes from ServerSideTable - use current page data for export
    const handleDataChange = useCallback((data: any[], pagination: { current: number; pageSize: number; total: number }) => {
        setCurrentPageData(data);
    }, []);

    // Excel columns configuration
    const excelColumns: ExcelColumn[] = [
        {
            title: 'STT',
            dataIndex: 'id',
            width: 10,
            render: (_: any, __: any, index: number) => index + 1
        },
        {
            title: 'Nhân viên',
            dataIndex: ['userInfo', 'fullName'],
            width: 25
        },
        {
            title: 'Phòng ban',
            dataIndex: ['userInfo', 'department', 'name'],
            width: 20
        },
        {
            title: 'Loại đơn',
            dataIndex: 'type',
            width: 25,
            render: (type: any) => APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 15,
            render: (status: any) => APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] || status
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            width: 20,
            render: (date: any) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : ''
        },
        {
            title: 'Ngày duyệt',
            dataIndex: 'approvedDate',
            width: 20,
            render: (date: any) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : ''
        }
    ];

    // Local filter options
    const TYPE_FILTER_OPTIONS = [
        { value: 'leave', label: 'Xin nghỉ phép', icon: <BeachAccessIcon fontSize="small" /> },
        { value: 'business-trip', label: 'Công tác', icon: <FlightIcon fontSize="small" /> },
        { value: 'overtime', label: 'Làm thêm giờ', icon: <AccessTimeIcon fontSize="small" /> },
        { value: 'forgot-check', label: 'Quên check in/out', icon: <FingerprintIcon fontSize="small" /> },
        { value: 'shift-registration', label: 'Đăng ký ca', icon: <EventIcon fontSize="small" /> },
    ];

    const STATUS_FILTER_OPTIONS = [
        { value: 0, label: 'Chờ duyệt' },
        { value: 1, label: 'Đã duyệt' },
        { value: 2, label: 'Bị từ chối' },
    ];

    const handleView = (record: any) => {
        setSelectedApplicationId(record.id);
        setDetailModalVisible(true);
    };

    const handleApproveClick = async (record: any) => {
        Modal.confirm({
            title: 'Xác nhận duyệt đơn',
            content: `Bạn có chắc chắn muốn duyệt đơn của ${record.userInfo?.fullName || 'nhân viên này'}?`,
            okText: 'Duyệt',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    // Use bulk API with single ID for consistency
                    await applicationService.bulkApproveApplications([record.id]);
                    message.success('Duyệt đơn từ thành công');
                    setRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Duyệt đơn từ thất bại');
                }
            }
        });
    };

    const handleRejectClick = (record: any) => {
        Modal.confirm({
            title: 'Xác nhận từ chối đơn từ',
            icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
            content: `Bạn có chắc chắn muốn từ chối đơn từ của ${record.userInfo?.fullName || 'nhân viên này'}?`,
            okText: 'Từ chối',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    // Use bulk API with single ID for consistency and to fix the loading/failure issue
                    await applicationService.bulkRejectApplications([record.id]);
                    message.success('Từ chối đơn từ thành công');
                    setRefreshTrigger(prev => prev + 1); // Trigger reload
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Từ chối đơn từ thất bại');
                }
            }
        });
    };

    const handleBulkApprove = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một đơn để duyệt');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận duyệt hàng loạt',
            content: `Bạn có chắc chắn muốn duyệt ${selectedRowKeys.length} đơn đã chọn?`,
            okText: 'Duyệt tất cả',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    setLoading(true);
                    await applicationService.bulkApproveApplications(selectedRowKeys as number[]);
                    message.success(`Đã duyệt thành công ${selectedRowKeys.length} đơn`);
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    setRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Duyệt hàng loạt thất bại');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleBulkReject = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một đơn để từ chối');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận từ chối hàng loạt',
            icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
            content: `Bạn có chắc chắn muốn từ chối ${selectedRowKeys.length} đơn đã chọn?`,
            okText: 'Từ chối tất cả',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    setLoading(true);
                    await applicationService.bulkRejectApplications(selectedRowKeys as number[]);
                    message.success(`Đã từ chối thành công ${selectedRowKeys.length} đơn`);
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    setRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Từ chối hàng loạt thất bại');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // Define columns với ServerSideTable format
    const columns: ServerSideColumnType<any>[] = useMemo(() => [
        {
            title: 'STT',
            key: 'stt',
            width: 60,
            searchable: false,
            render: (text: any, record: any, index: number) => {
                return <Text strong>{index + 1}</Text>;
            },
        },
        {
            title: 'Nhân viên',
            dataIndex: ['userInfo', 'fullName'],
            key: 'userInfo.fullName',
            sortable: true,
            filterType: 'text',
            render: (_: any, record: any) => {
                const user = record.userInfo || {};
                return user.fullName || '-';
            }
        },
        {
            title: 'Phòng ban',
            dataIndex: ['userInfo', 'department', 'name'],
            key: 'userInfo.department.name',
            sortable: true,
            filterType: 'text',
            render: (_: any, record: any) => {
                const department = record.userInfo?.department || {};
                return department.name || '-';
            }
        },
        {
            title: 'Loại đơn',
            dataIndex: 'type',
            key: 'type',
            sortable: true,
            filterType: 'select',
            filterOptions: TYPE_FILTER_OPTIONS.map(opt => ({
                value: opt.value,
                label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{opt.icon}<span>{opt.label}</span></span>
            })),
            render: (type: string) => APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            sortable: true,
            filterType: 'select',
            filterOptions: STATUS_FILTER_OPTIONS,
            render: (status: number) => {
                const color = APPLICATION_STATUS_COLORS[status as keyof typeof APPLICATION_STATUS_COLORS] || 'default';
                return (
                    <Tag color={color} style={{ fontWeight: '500' }}>
                        {APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] || status}
                    </Tag>
                );
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            key: 'created_at',
            searchField: 'createdAt',
            sortable: true,
            filterType: 'dateRange',
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
        },
        {
            title: 'Ngày duyệt',
            dataIndex: 'approvedDate',
            key: 'approvedDate',
            sortable: true,
            filterType: 'dateRange',
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
        },
        {
            title: 'Thao tác',
            key: 'actions',
            fixed: 'right' as const,
            width: 150,
            searchable: false,
            render: (_: any, record: any) => (
                <Space size="small">
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record)}
                        />
                    </Tooltip>
                    {record.status === 0 && (
                        <>
                            <CheckPermission permissionKey="manage_applications" requiredType="approve">
                                <Tooltip title="Duyệt đơn">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CheckOutlined />}
                                        onClick={() => handleApproveClick(record)}
                                        style={{ color: '#52c41a' }}
                                    />
                                </Tooltip>
                            </CheckPermission>
                            <CheckPermission permissionKey="manage_applications" requiredType="approve">
                                <Tooltip title="Từ chối">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined />}
                                        onClick={() => handleRejectClick(record)}
                                        danger
                                    />
                                </Tooltip>
                            </CheckPermission>
                        </>
                    )}
                </Space>
            )
        }
    ], []);

    // Row selection configuration
    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            setSelectedRowKeys(selectedRowKeys);
            setSelectedRows(selectedRows);
        },
        getCheckboxProps: (record: any) => ({
            disabled: record.status !== 0,
            name: record.id,
        }),
    };

    return (
        <div style={{ padding: '0px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    {selectedRowKeys.length > 0 && (
                        <>
                            <CheckPermission permissionKey="manage_applications" requiredType="approve">
                                <Button
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    onClick={handleBulkApprove}
                                    loading={loading}
                                    style={{
                                        borderRadius: '8px',
                                        height: '48px',
                                        paddingLeft: '24px',
                                        paddingRight: '24px',
                                        fontSize: '16px',
                                        fontWeight: '500'
                                    }}
                                >
                                    Duyệt đã chọn ({selectedRowKeys.length})
                                </Button>
                            </CheckPermission>
                            <CheckPermission permissionKey="manage_applications" requiredType="approve">
                                <Button
                                    danger
                                    icon={<CloseOutlined />}
                                    onClick={handleBulkReject}
                                    loading={loading}
                                    style={{
                                        borderRadius: '8px',
                                        height: '48px',
                                        paddingLeft: '24px',
                                        paddingRight: '24px',
                                        fontSize: '16px',
                                        fontWeight: '500'
                                    }}
                                >
                                    Từ chối đã chọn ({selectedRowKeys.length})
                                </Button>
                            </CheckPermission>
                        </>
                    )}
                    {currentPageData.length > 0 && (
                        <ExcelExportButton
                            data={currentPageData}
                            columns={excelColumns}
                            fileName="Danh_sach_don_tu"
                            title="DANH SÁCH ĐƠN TỪ"
                            description={`Tổng số: ${currentPageData.length} đơn từ (trang hiện tại) | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
                            type="primary"
                            style={{
                                borderRadius: '8px',
                                height: '48px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}
                        >
                            <DownloadOutlined />
                            Xuất Excel (trang hiện tại)
                        </ExcelExportButton>
                    )}
                </Space>
            </div>

            {/* Applications Table với ServerSideTable */}
            <ServerSideTable
                columns={columns}
                fetchData={applicationService.getAllApplications}
                rowKey="id"
                // Enable selection callbacks so checkboxes are active
                onSelectionChange={(keys, rows) => {
                    setSelectedRowKeys(keys);
                    setSelectedRows(rows as any[]);
                }}
                // Callback to receive current page data for Excel export
                onDataChange={handleDataChange}
                // Only allow selecting pending applications (status === 0)
                getCheckboxProps={(record: any) => ({ disabled: record.status !== 0 })}
                defaultPageSize={10}
                scroll={{ x: 'auto' }}
                bordered
                refreshTrigger={refreshTrigger}
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ fontSize: '60px', marginBottom: '16px', color: '#1890ff' }}><FileTextOutlined /></div>
                                    <Title level={4} type="secondary" style={{ marginBottom: '8px' }}>
                                        Chưa có đơn từ nào cần duyệt
                                    </Title>
                                    <Text type="secondary">Các đơn từ chờ duyệt sẽ hiển thị ở đây</Text>
                                </div>
                            }
                        />
                    )
                }}
            />

            {/* Detail Modal */}
            <ApplicationDetailModal
                applicationId={selectedApplicationId}
                visible={detailModalVisible}
                onClose={() => {
                    setDetailModalVisible(false);
                    setSelectedApplicationId(null);
                }}
            />
        </div>
    );
};

export default ApplicationList;

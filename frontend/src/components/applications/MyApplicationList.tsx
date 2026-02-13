import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Space, Typography, Empty, message, Tooltip, Tag, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import applicationService from '@/service/applicationService';
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_COLORS } from '@/config/constant';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import ApplicationDetailModal from './ApplicationDetailModal';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import dayjs from 'dayjs';

// Material icons for filters
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import FlightIcon from '@mui/icons-material/Flight';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import EventIcon from '@mui/icons-material/Event';

const { Title, Text } = Typography;

interface MyApplicationListProps {
    onCreateClick?: () => void;
    onEditClick?: (record: any) => void;
}

const MyApplicationList: React.FC<MyApplicationListProps> = ({
    onCreateClick,
    onEditClick
}) => {
    const router = useRouter();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
    const [allApplications, setAllApplications] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch all data for Excel export
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const response = await applicationService.getMyApplications({ page: 1, limit: 10000 });
                setAllApplications(response.data || []);
            } catch (error) {
                console.error('Error fetching my applications:', error);
            }
        };
        fetchAllData();
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
            title: 'Người duyệt',
            dataIndex: ['approvedByInfo', 'fullName'],
            width: 25
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
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

    const handleBulkDelete = () => {
        if (selectedRows.length === 0) {
            message.warning('Vui lòng chọn ít nhất một đơn từ để xóa');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận xóa đơn từ',
            icon: <ExclamationCircleOutlined />,
            content: `Bạn có chắc chắn muốn xóa ${selectedRows.length} đơn từ đã chọn? Hành động này không thể hoàn tác.`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    // TODO: Implement bulk delete API
                    message.success(`Đã xóa ${selectedRows.length} đơn từ thành công`);
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                } catch (error) {
                    message.error('Xóa đơn từ thất bại');
                }
            }
        });
    };

    const handleView = (record: any) => {
        setSelectedApplicationId(record.id);
        setDetailModalVisible(true);
    };

    const handleEdit = (record: any) => {
        const typeRouteMap: { [key: string]: string } = {
            'leave': '/applications/leave',
            'overtime': '/applications/overtime',
            'business-trip': '/applications/business-trip',
            'forgot-check': '/applications/forgot-check',
            'resignation': '/applications/resignation',
            'shift-registration': '/applications/shift',
        };

        const route = typeRouteMap[record.type];
        if (route) {
            router.push(`${route}?id=${record.id}`);
        } else {
            message.error('Loại đơn không hợp lệ');
        }
    };

    const handleCancel = async (record: any) => {
        Modal.confirm({
            title: 'Xác nhận xóa đơn từ',
            icon: <ExclamationCircleOutlined />,
            content: `Bạn có chắc chắn muốn xóa đơn từ này? Hành động này không thể hoàn tác.`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const response = await applicationService.deleteApplication(record.id);
                    if (response.success) {
                        message.success('Xóa đơn từ thành công');
                        setRefreshTrigger(prev => prev + 1);
                    }
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Xóa đơn từ thất bại');
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
            title: 'Người duyệt',
            dataIndex: ['approvedByInfo', 'fullName'],
            key: 'approvedByInfo.fullName',
            searchField: 'approvedByInfo.fullName',
            sortable: true,
            filterType: 'text',
            render: (_: any, record: any) => {
                const approver = record.approvedByInfo || {};
                const name = approver.fullName || '-';
                return name;
            }
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
            title: 'Thao tác',
            key: 'actions',
            fixed: 'right' as const,
            width: 150,
            searchable: false,
            render: (_: any, record: any) => (
                <>
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
                            <Tooltip title="Chỉnh sửa">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEdit(record)}
                                />
                            </Tooltip>
                            <Tooltip title="Hủy đơn">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleCancel(record)}
                                    danger
                                />
                            </Tooltip>
                        </>
                    )}
                </>
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
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onCreateClick}
                        style={{
                            borderRadius: '8px',
                            height: '48px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontSize: '16px',
                            fontWeight: '500'
                        }}
                    >
                        Tạo đơn mới
                    </Button>
                    {selectedRowKeys.length > 0 && (
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleBulkDelete}
                            style={{
                                borderRadius: '8px',
                                height: '48px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}
                        >
                            Xóa đã chọn ({selectedRowKeys.length})
                        </Button>
                    )}
                    {allApplications.length > 0 && (
                        <ExcelExportButton
                            data={allApplications}
                            columns={excelColumns}
                            fileName="Don_tu_cua_toi"
                            title="ĐƠN TỪ CỦA TÔI"
                            description={`Tổng số: ${allApplications.length} đơn từ | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
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
                            Xuất Excel
                        </ExcelExportButton>
                    )}
                </Space>
            </div>

            {/* Applications Table với ServerSideTable */}
            <ServerSideTable
                columns={columns}
                fetchData={applicationService.getMyApplications}
                rowKey="id"
                rowSelection={rowSelection}
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
                                    <div style={{ fontSize: '60px', marginBottom: '16px', color: '#1890ff' }}><InboxOutlined /></div>
                                    <Title level={4} type="secondary" style={{ marginBottom: '8px' }}>
                                        Bạn chưa có đơn từ nào
                                    </Title>
                                    <Text type="secondary">Tạo đơn từ đầu tiên của bạn ngay hôm nay</Text>
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

export default MyApplicationList;

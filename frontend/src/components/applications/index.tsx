import React, { useState, useMemo, useEffect } from 'react';
import { Button, Space, Typography, Empty, message, Tooltip, Tag, Modal, Form, Input } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
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
    const [approveModalVisible, setApproveModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<any>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [approveForm] = Form.useForm();
    const [allApplications, setAllApplications] = useState<any[]>([]);

    // Fetch all data for Excel export
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const response = await applicationService.getAllApplications({ page: 1, pageSize: 10000 });
                setAllApplications(response.data || []);
            } catch (error) {
                console.error('Error fetching all applications:', error);
            }
        };
        fetchAllData();
    }, [refreshTrigger]);

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

    const handleApproveClick = (record: any) => {
        setSelectedApplication(record);
        setApproveModalVisible(true);
        approveForm.resetFields();
    };

    const handleRejectClick = (record: any) => {
        Modal.confirm({
            title: 'Xác nhận từ chối đơn từ',
            content: 'Bạn có chắc chắn muốn từ chối đơn từ này?',
            okText: 'Từ chối',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await applicationService.rejectApplication(record.id, {});
                    message.success('Từ chối đơn từ thành công');
                    setRefreshTrigger(prev => prev + 1); // Trigger reload
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Từ chối đơn từ thất bại');
                }
            }
        });
    };

    const handleApproveSubmit = async () => {
        try {
            const values = await approveForm.validateFields();
            await applicationService.approveApplication(selectedApplication.id, values);
            message.success('Duyệt đơn từ thành công');
            setApproveModalVisible(false);
            setSelectedApplication(null);
            setRefreshTrigger(prev => prev + 1); // Trigger reload
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Duyệt đơn từ thất bại');
        }
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
                            <Tooltip title="Duyệt đơn">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleApproveClick(record)}
                                    style={{ color: '#52c41a' }}
                                />
                            </Tooltip>
                            <Tooltip title="Từ chối">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CloseOutlined />}
                                    onClick={() => handleRejectClick(record)}
                                    danger
                                />
                            </Tooltip>
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
                            <Button
                                type="primary"
                                icon={<CheckOutlined />}
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
                            <Button
                                danger
                                icon={<CloseOutlined />}
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
                        </>
                    )}
                    {allApplications.length > 0 && (
                        <ExcelExportButton
                            data={allApplications}
                            columns={excelColumns}
                            fileName="Danh_sach_don_tu"
                            title="DANH SÁCH ĐƠN TỪ"
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
                fetchData={applicationService.getAllApplications}
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
                                    <div style={{ fontSize: '60px', marginBottom: '16px' }}>📋</div>
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

            {/* Approve Modal */}
            <Modal
                title="Duyệt đơn từ"
                open={approveModalVisible}
                onOk={handleApproveSubmit}
                onCancel={() => {
                    setApproveModalVisible(false);
                    setSelectedApplication(null);
                }}
                okText="Duyệt"
                cancelText="Hủy"
            >
                <Form form={approveForm} layout="vertical">
                    <Form.Item
                        label="Ghi chú (không bắt buộc)"
                        name="note"
                    >
                        <Input.TextArea rows={4} placeholder="Nhập ghi chú..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ApplicationList;

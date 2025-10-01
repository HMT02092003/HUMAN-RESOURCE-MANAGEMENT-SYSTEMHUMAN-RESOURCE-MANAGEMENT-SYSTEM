import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Table, Button, Space, Typography, Empty, message, Tooltip, DatePicker, Input, Row, Col, Tag, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, SearchOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { FilterConfirmProps, FilterDropdownProps } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import applicationService from '@/service/applicationService';
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_COLORS } from '@/config/constant';
import ApplicationDetailModal from './ApplicationDetailModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface MyApplicationListProps {
    onCreateClick?: () => void;
    onEditClick?: (record: any) => void;
}

const MyApplicationList: React.FC<MyApplicationListProps> = ({
    onCreateClick,
    onEditClick
}) => {
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
    const searchInput = useRef<any>(null);

    const fetchMyApplications = useCallback(async (page = 1, size = 10) => {
        try {
            setLoading(true);
            const response = await applicationService.getMyApplications({
                page: page,
                pageSize: size
            });
            setApplications(response.data || []);
            setTotal(response.total || response.data?.length || 0);
            setCurrentPage(page);
            setPageSize(size);
        } catch (error) {
            message.error('Lấy danh sách đơn từ thất bại');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyApplications(1, 10);
    }, [fetchMyApplications]);

    const handleTableChange = (pagination: any) => {
        const { current, pageSize: newPageSize } = pagination;
        fetchMyApplications(current, newPageSize);
    };

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
                    const selectedIds = selectedRowKeys;
                    setApplications(prev => prev.filter(app => !selectedIds.includes(app.id)));
                    setTotal(prev => prev - selectedRows.length);
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    message.success(`Đã xóa ${selectedRows.length} đơn từ thành công`);
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
        // Chuyển đến trang edit tương ứng với loại đơn
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
                        fetchMyApplications(currentPage, pageSize);
                    }
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Xóa đơn từ thất bại');
                }
            }
        });
    };

    const getColumnSearchProps = (dataIndex: string, placeholder: string = 'Tìm kiếm...'): any => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={placeholder}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => confirm()}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => confirm()}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Tìm
                    </Button>
                    <Button
                        onClick={() => clearFilters && clearFilters()}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Xóa
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => close()}
                    >
                        Đóng
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
        ),
        onFilter: (value: any, record: any) =>
            record[dataIndex]
                ?.toString()
                .toLowerCase()
                .includes((value as string).toLowerCase()),
        onFilterDropdownOpenChange: (visible: boolean) => {
            if (visible) {
                setTimeout(() => searchInput.current?.select(), 100);
            }
        },
    });

    const getDateRangeFilter = () => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
            <div style={{ padding: 8 }}>
                <RangePicker
                    value={selectedKeys[0] ? [dayjs(String(selectedKeys[0]).split(',')[0]), dayjs(String(selectedKeys[0]).split(',')[1])] : null}
                    onChange={(dates) => {
                        if (dates) {
                            setSelectedKeys([`${dates[0]?.format('YYYY-MM-DD')},${dates[1]?.format('YYYY-MM-DD')}`]);
                        } else {
                            setSelectedKeys([]);
                        }
                    }}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => confirm()}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Áp dụng
                    </Button>
                    <Button
                        onClick={() => clearFilters && clearFilters()}
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
        onFilter: (value: any, record: any) => {
            if (!value) return true;
            const [startDate, endDate] = String(value).split(',');
            const recordDate = dayjs(record.applicationDate);
            return recordDate.isAfter(dayjs(startDate).subtract(1, 'day')) &&
                recordDate.isBefore(dayjs(endDate).add(1, 'day'));
        },
    });

    const columns = useMemo(() => [
        {
            title: 'STT',
            key: 'stt',
            width: 60,
            render: (text: any, record: any, index: number) => {
                const stt = (currentPage - 1) * pageSize + index + 1;
                return <Text strong>{stt}</Text>;
            },
        },
        {
            title: 'Loại đơn',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type,
            filters: [
                { text: '🏖️ Nghỉ phép', value: 'leave' },
                { text: '⏰ Tăng ca', value: 'overtime' },
                { text: '✈️ Công tác', value: 'business_trip' },
                { text: '⏰ Quên check', value: 'forgot_check' },
                { text: '🕒 Đăng ký ca', value: 'shift_registration' },
                { text: '📄 Thôi việc', value: 'resignation' }
            ],
            onFilter: (value: any, record: any) => record.type === value,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: number) => {
                const color = APPLICATION_STATUS_COLORS[status as keyof typeof APPLICATION_STATUS_COLORS] || 'default';
                return (
                    <Tag color={color} style={{ fontWeight: '500' }}>
                        {APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] || status}
                    </Tag>
                );
            },
            filters: [
                { text: '⏳ Chờ duyệt', value: 0 },
                { text: '✅ Đã duyệt', value: 1 },
                { text: '❌ Bị từ chối', value: 2 }
            ],
            onFilter: (value: any, record: any) => record.status === value,
        },
        {
            title: 'Người duyệt',
            dataIndex: 'approvedBy',
            key: 'approvedBy',
            ...getColumnSearchProps('approvedBy', 'Tìm người duyệt...'),
        },
        {
            title: 'Ngày duyệt',
            dataIndex: 'approvedDate',
            key: 'approvedDate',
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'applicationDate',
            key: 'applicationDate',
            render: (date: string) => (
                <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
            ),
            sorter: (a: any, b: any) =>
                dayjs(a.applicationDate).unix() - dayjs(b.applicationDate).unix(),
            ...getDateRangeFilter(),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            fixed: 'right' as const,
            width: 150,
            render: (record: any) => (
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
    ], [currentPage, pageSize]);

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
            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
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
                    </Space>
                </Col>
                <Col>
                    <Space direction="vertical" size={0} align="end">
                        <Text type="secondary" style={{ fontSize: '16px' }}>
                            Tổng số: <Text strong style={{ color: '#1677ff' }}>{total}</Text> đơn từ
                        </Text>
                        {selectedRowKeys.length > 0 && (
                            <Text type="secondary" style={{ fontSize: '14px', color: '#ff4d4f' }}>
                                Đã chọn: <Text strong>{selectedRowKeys.length}</Text> đơn từ
                            </Text>
                        )}
                    </Space>
                </Col>
            </Row>

            {/* Applications Table */}
            <Table
                columns={columns}
                dataSource={applications}
                rowKey="id"
                loading={loading}
                onChange={handleTableChange}
                rowSelection={rowSelection}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                        `${range[0]}-${range[1]} của ${total} đơn từ`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    style: { marginTop: '24px' }
                }}
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ fontSize: '60px', marginBottom: '16px' }}>📭</div>
                                    <Title level={4} type="secondary" style={{ marginBottom: '8px' }}>
                                        Bạn chưa có đơn từ nào
                                    </Title>
                                    <Text type="secondary">Tạo đơn từ đầu tiên của bạn ngay hôm nay</Text>
                                </div>
                            }
                        />
                    )
                }}
                style={{
                    background: 'white',
                    borderRadius: '8px'
                }}
                size="middle"
                scroll={{ x: 'auto' }}
                bordered
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
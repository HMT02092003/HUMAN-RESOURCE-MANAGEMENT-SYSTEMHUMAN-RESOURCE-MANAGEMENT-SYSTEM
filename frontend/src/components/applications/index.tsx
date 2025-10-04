import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Table, Button, Space, Typography, Empty, message, Tooltip, DatePicker, Input, Row, Col, Tag, Modal, Form } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, SearchOutlined, EditOutlined, ExclamationCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { FilterConfirmProps, FilterDropdownProps } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import applicationService from '@/service/applicationService';
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_COLORS, FORGOT_CHECK_TYPE_LABELS } from '@/config/constant';
import ApplicationDetailModal from './ApplicationDetailModal';
import { render } from 'react-dom';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface MyApplicationListProps {
    onCreateClick?: () => void;
    onEditClick?: (record: any) => void;
}

const ApplicationList: React.FC<MyApplicationListProps> = ({
    onCreateClick,
    onEditClick
}) => {
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
    const [approveModalVisible, setApproveModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<any>(null);
    const [approveForm] = Form.useForm();
    const searchInput = useRef<any>(null);

    const fetchMyApplications = useCallback(async (page = 1, size = 10) => {
        try {
            setLoading(true);
            const response = await applicationService.getAllApplications({
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
                    const selectedIds = selectedRowKeys.map(key => Number(key));
                    await applicationService.bulkDeleteApplications(selectedIds);
                    setSelectedRowKeys([]);
                    setSelectedRows([]);
                    message.success(`Đã xóa ${selectedRows.length} đơn từ thành công`);
                    fetchMyApplications(currentPage, pageSize);
                } catch (error) {
                    message.error('Xóa đơn từ thất bại');
                }
            }
        });
    };

    const handleSearch = (
        selectedKeys: string[],
        confirm: (param?: FilterConfirmProps) => void,
        dataIndex: string,
    ) => {
        confirm();
        setSearchText(selectedKeys[0]);
        setSearchedColumn(dataIndex);
    };

    const handleReset = (clearFilters: () => void) => {
        clearFilters();
        setSearchText('');
    };

    const handleView = (record: any) => {
        setSelectedApplicationId(record.id);
        setDetailModalVisible(true);
    };

    const handleEdit = (record: any) => {
        const typeRouteMap: Record<string, string> = {
            'leave': '/applications/leave',
            'overtime': '/applications/overtime',
            'business-trip': '/applications/business-trip',
            'forgot-check': '/applications/forgot-check',
            'resignation': '/applications/resignation',
            'shift-registration': '/applications/shift-registration'
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
            cancelText: 'Không',
            onOk: async () => {
                try {
                    await applicationService.deleteApplication(record.id);
                    message.success('Xóa đơn thành công');
                    fetchMyApplications(currentPage, pageSize);
                } catch (error) {
                    message.error('Xóa đơn thất bại');
                }
            }
        });
    };

    // Xử lý mở modal duyệt đơn
    const handleOpenApproveModal = (record: any) => {
        setSelectedApplication(record);
        setApproveModalVisible(true);
        approveForm.resetFields();
    };

    // Xử lý mở modal từ chối đơn
    const handleOpenRejectModal = (record: any) => {
        Modal.confirm({
            title: 'Xác nhận không duyệt đơn từ',
            icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
            content: (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <Text>Bạn có chắc chắn muốn <Text strong style={{ color: '#ff4d4f' }}>không duyệt</Text> đơn từ này?</Text>
                    </div>
                    <div style={{ padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                        <Text strong>Thông tin đơn từ:</Text>
                        <div style={{ marginTop: 8 }}>
                            <Text>Loại đơn: {APPLICATION_TYPE_LABELS[record.type as keyof typeof APPLICATION_TYPE_LABELS]}</Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                            <Text>Người tạo: {record?.userInfo?.fullName}</Text>
                        </div>
                    </div>
                    <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#fff2e8', borderRadius: '4px', border: '1px solid #ffbb96' }}>
                        <Text strong style={{ color: '#ff4d4f' }}>⚠️ Lưu ý:</Text>
                        <div style={{ marginTop: 8 }}>
                            <Text>• Sau khi không duyệt, đơn sẽ không thể chỉnh sửa hoặc xóa</Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                            <Text>• Trạng thái đơn sẽ chuyển sang "Không duyệt"</Text>
                        </div>
                    </div>
                </div>
            ),
            okText: 'Không duyệt',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const response = await applicationService.rejectApplication(record.id, {});
                    if (response.success) {
                        message.success('Không duyệt đơn thành công');
                        fetchMyApplications(currentPage, pageSize);
                    }
                } catch (error: any) {
                    message.error(error?.response?.data?.message || 'Không duyệt đơn thất bại');
                }
            }
        });
    };

    // Xử lý duyệt đơn
    const handleApprove = async () => {
        try {
            const values = await approveForm.validateFields();
            await applicationService.approveApplication(selectedApplication.id, {
                note: values.note || ''
            });
            message.success('Duyệt đơn thành công');
            setApproveModalVisible(false);
            setSelectedApplication(null);
            approveForm.resetFields();
            fetchMyApplications(currentPage, pageSize);
        } catch (error: any) {
            if (error?.errorFields) {
                // Validation error from form
                return;
            }
            message.error(error?.response?.data?.message || 'Duyệt đơn thất bại');
        }
    };

    const getColumnSearchProps = (dataIndex: string, placeholder: string = 'Tìm kiếm...'): any => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={placeholder}
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
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            close();
                        }}
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
                .toString()
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
            onFilter: (value: any, record: any) => record.applicationType === value,
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
            title: 'Người tạo đơn',
            dataIndex: ['userInfo', 'fullName'],
            key: 'userInfo.fullName',
        },
        {
            title: 'Người duyệt',
            dataIndex: ['approvedByInfo', 'fullName'],
            key: 'approvedByInfo.fullName',
        },
        {
            title: 'Ngày duyệt',
            dataIndex: 'approvedDate',
            key: 'approvedDate',
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : null,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            key: 'created_at',
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
                    {record.status === 0 && (
                        <>
                            <Tooltip title="Duyệt">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CheckOutlined />}
                                    onClick={() => handleOpenApproveModal(record)}
                                    style={{ 
                                        color: '#52c41a'
                                    }}
                                />
                            </Tooltip>
                            <Tooltip title="Không duyệt">
                                <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<CloseOutlined />}
                                    onClick={() => handleOpenRejectModal(record)}
                                />
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                                setDetailModalVisible(true);
                                setSelectedApplicationId(record.id);
                            }}
                        />
                    </Tooltip>
                </>
            )
        }
    ], [onEditClick, currentPage, pageSize]);

    // Row selection configuration
    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            setSelectedRowKeys(selectedRowKeys);
            setSelectedRows(selectedRows);
        },
        onSelectAll: (selected: boolean, selectedRows: any[], changeRows: any[]) => {
            // Handle select all
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
                        {selectedRowKeys.length > 0 ? (
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
                        ) : null}
                    </Space>
                </Col>
                <Col>
                    <Space direction="vertical" size={0}>
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
                        `${range[0]}-${range[1]} của ${total} đơn từ của bạn`,
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

            {/* Modal Duyệt đơn */}
            <Modal
                title={
                    <Space>
                        <CheckOutlined style={{ color: '#52c41a' }} />
                        <span>Duyệt đơn từ</span>
                    </Space>
                }
                open={approveModalVisible}
                onOk={handleApprove}
                onCancel={() => {
                    setApproveModalVisible(false);
                    setSelectedApplication(null);
                    approveForm.resetFields();
                }}
                okText="Duyệt"
                cancelText="Hủy"
                okButtonProps={{ 
                    style: { 
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a'
                    } 
                }}
            >
                <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                    <Text strong>Thông tin đơn từ:</Text>
                    <div style={{ marginTop: 8 }}>
                        <Text>Loại đơn: {selectedApplication && APPLICATION_TYPE_LABELS[selectedApplication.type as keyof typeof APPLICATION_TYPE_LABELS]}</Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                        <Text>Người tạo: {selectedApplication?.userInfo?.fullName}</Text>
                    </div>
                </div>
            </Modal>

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

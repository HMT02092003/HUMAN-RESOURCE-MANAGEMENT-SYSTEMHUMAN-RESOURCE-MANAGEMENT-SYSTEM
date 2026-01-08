"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button, Space, Typography, Empty, message, Tooltip, Tag, Popconfirm } from 'antd';
import { CheckOutlined, CloseOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ShiftApprovalManagement: React.FC = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [allApprovals, setAllApprovals] = useState<any[]>([]);

    const STATUS_OPTIONS = [
        { value: 'pending', label: 'Chờ duyệt' },
        { value: 'approved', label: 'Đã duyệt' },
        { value: 'rejected', label: 'Từ chối' }
    ];

    // Fetch all data for Excel export
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const response: any = await shiftService.getSchedulesForApproval({ page: 1, limit: 10000 });
                // Normalize response similar to useServerSideTable
                let payload: any;
                if (Array.isArray(response)) {
                    payload = response;
                } else if (response && typeof response === 'object') {
                    if ('status' in response && 'data' in response) {
                        payload = response.data;
                    } else if ('data' in response && ('pagination' in response || 'total' in response || 'success' in response)) {
                        payload = response;
                    } else if ('data' in response) {
                        payload = response.data;
                    } else {
                        payload = response;
                    }
                } else {
                    payload = response;
                }

                const rows = Array.isArray(payload) ? payload : (payload?.results ?? payload?.data ?? payload?.items ?? []);
                setAllApprovals(Array.isArray(rows) ? rows : []);
            } catch (error) {
                console.error('Error fetching approvals:', error);
            }
        };
        fetchAllData();
    }, [refreshTrigger]);

    const getStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            pending: 'Chờ duyệt',
            approved: 'Đã duyệt',
            rejected: 'Từ chối'
        };
        return statusMap[status] || status;
    };

    // Excel columns configuration
    const excelColumns: ExcelColumn[] = [
        {
            title: 'Nhân viên',
            dataIndex: ['user', 'fullName'],
            width: 25,
            render: (_: any, record: any) => {
                const user = record.user || {};
                return user.fullName || record.user_fullName || '';
            }
        },
        {
            title: 'Phòng ban',
            dataIndex: ['user', 'department', 'name'],
            width: 25,
            render: (_: any, record: any) => {
                return (
                    record.user?.department?.name ||
                    record.user?.Department?.name ||
                    record.department_name ||
                    ''
                );
            }
        },
        {
            title: 'Ngày làm việc',
            dataIndex: 'date',
            width: 15,
            render: (date: any) => date ? dayjs(date).format('DD/MM/YYYY') : ''
        },
        {
            title: 'Ca làm việc',
            dataIndex: 'shift_name',
            width: 25,
            render: (name: any, record: any) => {
                if (!name) return '';
                const startTime = record.start_time ? record.start_time.substring(0, 5) : '';
                const endTime = record.end_time ? record.end_time.substring(0, 5) : '';
                return `${name}${startTime && endTime ? ` (${startTime} - ${endTime})` : ''}`;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 15,
            render: (status: any) => getStatusText(status)
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            width: 35
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            width: 20,
            render: (date: any) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : ''
        }
    ];

    const handleApprove = async (id: number) => {
        try {
            await shiftService.approveShiftRegistration(id);
            message.success('Duyệt đơn đăng ký thành công');
            setRefreshTrigger(prev => prev + 1);
            // Notify other components (e.g., the user's calendar/list) to refresh
            try { window.dispatchEvent(new CustomEvent('shifts:updated', { detail: { ids: [id] } })); } catch (e) {}
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Duyệt đơn thất bại');
        }
    };

    const handleReject = async (id: number) => {
        try {
            // pass empty notes when none provided
            await shiftService.rejectShiftRegistration(id, '');
            message.success('Từ chối đơn đăng ký thành công');
            setRefreshTrigger(prev => prev + 1);
            try { window.dispatchEvent(new CustomEvent('shifts:updated', { detail: { ids: [id] } })); } catch (e) {}
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Từ chối đơn thất bại');
        }
    };

    const handleBulkApprove = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một đơn đăng ký');
            return;
        }

        try {
            await shiftService.bulkApproveSchedules(selectedRowKeys as number[]);
            message.success(`Đã duyệt ${selectedRowKeys.length} đơn đăng ký`);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            setRefreshTrigger(prev => prev + 1);
            try { window.dispatchEvent(new CustomEvent('shifts:updated', { detail: { ids: selectedRowKeys } })); } catch (e) {}
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Duyệt hàng loạt thất bại');
        }
    };

    const handleBulkReject = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Vui lòng chọn ít nhất một đơn đăng ký');
            return;
        }

            try {
                // backend exposes bulkApproveSchedules with action flag
                await shiftService.bulkApproveSchedules(selectedRowKeys as number[], 'reject');
                message.success(`Đã từ chối ${selectedRowKeys.length} đơn đăng ký`);
            setSelectedRowKeys([]);
            setSelectedRows([]);
            setRefreshTrigger(prev => prev + 1);
            try { window.dispatchEvent(new CustomEvent('shifts:updated', { detail: { ids: selectedRowKeys } })); } catch (e) {}
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Từ chối hàng loạt thất bại');
        }
    };

    // Define columns
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
            dataIndex: ['user', 'fullName'],
            key: 'user.fullName',
            searchField: 'searchEmployee',  // Backend expects searchEmployee
            sortable: true,
            filterType: 'text',
            render: (_: any, record: any) => {
                const user = record.user || {};
                return user.fullName || record.user_fullName || '-';
            }
        },
        {
            title: 'Phòng ban',
            dataIndex: ['user', 'Department', 'name'],
            key: 'department_name',
            searchField: 'searchDepartment',  // Backend expects searchDepartment
            filterType: 'text',
            render: (_: any, record: any) => {
                // API may return department under user.department (lowercase) or user.Department (legacy)
                return (
                    record.user?.department?.name ||
                    record.user?.Department?.name ||
                    record.department_name ||
                    '-'
                );
            }
        },
        {
            title: 'Ngày làm việc',
            dataIndex: 'date',
            key: 'date',
            searchField: 'date',  // Maps to dateStart/dateEnd
            sortable: true,
            filterType: 'dateRange',
            width: 150,
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
        },
        {
            title: 'Ca làm việc',
            dataIndex: 'shift_name',
            key: 'shift_name',
            searchField: 'searchShiftName',  // Backend expects searchShiftName
            sortable: true,
            filterType: 'text',
            render: (name: string, record: any) => {
                if (!name) return '-';
                const startTime = record.start_time ? record.start_time.substring(0, 5) : '';
                const endTime = record.end_time ? record.end_time.substring(0, 5) : '';
                return (
                    <div>
                        <Text strong>{name}</Text>
                        {startTime && endTime && (
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {startTime} - {endTime}
                                </Text>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            sortable: true,
            filterType: 'select',
            filterOptions: STATUS_OPTIONS,
            width: 120,
            render: (status: string) => {
                const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
                    pending: { color: 'orange', icon: <ClockCircleOutlined />, label: 'Chờ duyệt' },
                    approved: { color: 'green', icon: <CheckCircleOutlined />, label: 'Đã duyệt' },
                    rejected: { color: 'red', icon: <CloseCircleOutlined />, label: 'Từ chối' }
                };
                const config = statusConfig[status] || statusConfig.pending;
                return (
                    <Tag color={config.color} icon={config.icon}>
                        {config.label}
                    </Tag>
                );
            }
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
            searchField: 'searchNotes',  // Backend expects searchNotes
            filterType: 'text',
            ellipsis: true,
            render: (notes: string) => notes || '-'
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            key: 'created_at',
            searchField: 'createdAt',  // Maps to createdAtStart/createdAtEnd
            sortable: true,
            filterType: 'dateRange',
            width: 150,
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
        },
        {
            title: 'Thao tác',
            key: 'actions',
            fixed: 'right' as const,
            width: 120,
            searchable: false,
            render: (_: any, record: any) => (
                <Space size="small">
                    {record.status === 'pending' && (
                        <>
                            <Popconfirm
                                title="Xác nhận duyệt đơn đăng ký?"
                                onConfirm={() => handleApprove(record.id)}
                                okText="Duyệt"
                                cancelText="Hủy"
                            >
                                <Tooltip title="Duyệt">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CheckOutlined />}
                                        style={{ color: '#52c41a' }}
                                    />
                                </Tooltip>
                            </Popconfirm>
                            <Popconfirm
                                title="Xác nhận từ chối đơn đăng ký?"
                                onConfirm={() => handleReject(record.id)}
                                okText="Từ chối"
                                cancelText="Hủy"
                            >
                                <Tooltip title="Từ chối">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined />}
                                        danger
                                    />
                                </Tooltip>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            )
        }
    ], []);

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            setSelectedRowKeys(selectedRowKeys);
            setSelectedRows(selectedRows);
        },
        getCheckboxProps: (record: any) => ({
            disabled: record.status !== 'pending',
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
                                onClick={handleBulkApprove}
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
                                onClick={handleBulkReject}
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
                    {allApprovals.length > 0 && (
                        <ExcelExportButton
                            data={allApprovals}
                            columns={excelColumns}
                            fileName="Duyet_dang_ky_ca"
                            title="DUYỆT ĐĂNG KÝ CA"
                            description={`Tổng số: ${allApprovals.length} đăng ký | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
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
{/* Table */}
            <ServerSideTable
                columns={columns}
                fetchData={shiftService.getSchedulesForApproval}
                rowKey="id"
                // enable selection behavior by providing callbacks/props
                onSelectionChange={(keys, rows) => {
                    setSelectedRowKeys(keys);
                    setSelectedRows(rows as any[]);
                }}
                getCheckboxProps={(record: any) => ({ disabled: record.status !== 'pending', name: record.id })}
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
                                        Không có đơn đăng ký ca nào cần duyệt
                                    </Title>
                                    <Text type="secondary">Các đơn đăng ký chờ duyệt sẽ hiển thị ở đây</Text>
                                </div>
                            }
                        />
                    )
                }}
            />
        </div>
    );
};

export default ShiftApprovalManagement;

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button, Space, Typography, Empty, message, Tooltip, Tag, Modal, Form, Select, DatePicker, Input, Tabs, Grid } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DownloadOutlined, CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './shift-calendar-custom.css';
import shiftService from '@/service/shiftService';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

const ShiftRegistrationManagement = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.lg;
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [configurations, setConfigurations] = useState<any[]>([]);
    const [editForm] = Form.useForm();
    const [bulkForm] = Form.useForm();
    const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('list');
    const [calendarRegistrations, setCalendarRegistrations] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // Load shift configurations
    React.useEffect(() => {
        loadConfigurations();
    }, []);

    // Fetch all data for Excel export
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const response: any = await shiftService.getMyShiftRegistrationsPaginated({ page: 1, limit: 10000 });
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
                setAllRegistrations(Array.isArray(rows) ? rows : []);
            } catch (error) {
                console.error('Error fetching shift registrations:', error);
            }
        };
        fetchAllData();
    }, [refreshTrigger]);

    // Load calendar data when switching to calendar tab
    useEffect(() => {
        const loadCalendarData = async () => {
            if (activeTab === 'calendar') {
                try {
                    // Load all registrations (all statuses) for calendar view
                    const response: any = await shiftService.getMyShiftRegistrationsPaginated({ 
                        page: 1, 
                        limit: 10000
                    });
                    console.debug('[ShiftRegistration] loadCalendarData - raw response:', response);
                    
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
                    console.debug('[ShiftRegistration] loadCalendarData - extracted rows count:', Array.isArray(rows) ? rows.length : 0, 'sample:', Array.isArray(rows) && rows.length ? rows.slice(0,3) : rows);
                    setCalendarRegistrations(Array.isArray(rows) ? rows : []);
                } catch (error) {
                    console.error('Error loading calendar data:', error);
                }
            }
        };
        loadCalendarData();
    }, [activeTab, refreshTrigger]);

    // Listen for global updates (e.g., approvals made by managers) and refresh local data
    useEffect(() => {
        const onShiftsUpdated = (e: any) => {
            console.debug('[ShiftRegistration] received shifts:updated event', e && e.detail);
            setRefreshTrigger(prev => prev + 1);
        };

        try {
            window.addEventListener('shifts:updated', onShiftsUpdated as EventListener);
        } catch (e) {
            // ignore in non-browser environments
        }

        return () => {
            try {
                window.removeEventListener('shifts:updated', onShiftsUpdated as EventListener);
            } catch (e) {}
        };
    }, []);

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
            title: 'STT',
            dataIndex: 'id',
            width: 10,
            render: (_: any, __: any, index: number) => index + 1
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

    const loadConfigurations = async () => {
        try {
            const response = await shiftService.getAllShiftConfigurations();
            if (response.data?.success) {
                setConfigurations(response.data.data);
            }
        } catch (error) {
            message.error('Không thể tải danh sách ca');
        }
    };

    const STATUS_OPTIONS = [
        { value: 'pending', label: 'Chờ duyệt' },
        { value: 'approved', label: 'Đã duyệt' },
        { value: 'rejected', label: 'Từ chối' }
    ];

    const handleEdit = (record: any) => {
        setEditingRecord(record);
        editForm.setFieldsValue({
            date: record.date ? dayjs(record.date) : null,
            shift_id: record.shift_id,
            notes: record.notes
        });
        setEditModalVisible(true);
    };

    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            const payload = {
                date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : undefined,
                shift_id: values.shift_id,
                notes: values.notes
            };
            await shiftService.updateShiftRegistration(editingRecord.id, payload);
            message.success('Cập nhật đăng ký thành công');
            setEditModalVisible(false);
            setEditingRecord(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Cập nhật thất bại');
        }
    };

    const handleDelete = (record: any) => {
        Modal.confirm({
            title: 'Xác nhận hủy đăng ký',
            content: 'Bạn có chắc chắn muốn hủy đăng ký ca này?',
            okText: 'Hủy đăng ký',
            okType: 'danger',
            cancelText: 'Đóng',
            onOk: async () => {
                try {
                    await shiftService.cancelShiftRegistration(record.id);
                    message.success('Hủy đăng ký thành công');
                    setRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Hủy đăng ký thất bại');
                }
            }
        });
    };

    const handleBulkRegister = () => {
        setBulkModalVisible(true);
        bulkForm.resetFields();
        bulkForm.setFieldsValue({ scheduleItems: [] });
    };

    const handleBulkRegisterSubmit = async () => {
        try {
            const values = await bulkForm.validateFields();
            const items = values.scheduleItems || [];
            
            if (items.length === 0) {
                message.error('Vui lòng thêm ít nhất một ngày để đăng ký');
                return;
            }

            // Send each item individually (date + shift_id + notes)
            let successCount = 0;
            let failedCount = 0;
            
            for (const item of items) {
                try {
                    await shiftService.createShiftRegistration({
                        shift_id: item.shift_id,
                        date: dayjs(item.date).format('YYYY-MM-DD'),
                        notes: item.notes || ''
                    });
                    successCount++;
                } catch (err: any) {
                    failedCount++;
                    console.error('Failed to register shift:', err);
                }
            }

            if (successCount > 0) {
                message.success(`Đăng ký thành công ${successCount} ca${failedCount > 0 ? `, thất bại ${failedCount} ca` : ''}`);
            } else {
                message.error('Đăng ký ca thất bại');
            }
            
            setBulkModalVisible(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Đăng ký ca thất bại');
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
                            <Tooltip title="Chỉnh sửa">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEdit(record)}
                                />
                            </Tooltip>
                            <Tooltip title="Hủy đăng ký">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(record)}
                                    danger
                                />
                            </Tooltip>
                        </>
                    )}
                </Space>
            )
        }
    ], [configurations]);

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

    // Handle date click to show details
    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setDetailModalVisible(true);
    };

    // Create a map for quick lookup
    const registrationMap = useMemo(() => {
        const map = new Map<string, any[]>();
        calendarRegistrations.forEach(reg => {
            const dateStr = dayjs(reg.date).format('YYYY-MM-DD');
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)!.push(reg);
        });
        return map;
    }, [calendarRegistrations]);

    return (
        <div style={{ padding: '0px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleBulkRegister}
                        style={{
                            borderRadius: '8px',
                            height: '48px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontSize: '16px',
                            fontWeight: '500'
                        }}
                    >
                        Đăng ký ca mới
                    </Button>
                    {allRegistrations.length > 0 && (
                        <ExcelExportButton
                            data={allRegistrations}
                            columns={excelColumns}
                            fileName="Dang_ky_ca_cua_toi"
                            title="ĐĂNG KÝ CA CỦA TÔI"
                            description={`Tổng số: ${allRegistrations.length} đăng ký | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
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

            {/* Tabs with Table and Calendar */}
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <Tabs.TabPane
                    tab={
                        <span>
                            <UnorderedListOutlined />
                            Danh sách đăng ký
                        </span>
                    }
                    key="list"
                >
                    <ServerSideTable
                        columns={columns}
                        fetchData={shiftService.getMyShiftRegistrationsPaginated}
                        rowKey="id"
                        rowSelection={rowSelection}
                        defaultPageSize={10}
                        scroll={{ x: 'auto' }}
                        bordered
                        refreshTrigger={refreshTrigger}
                    />
                </Tabs.TabPane>

                <Tabs.TabPane
                    tab={
                        <span>
                            <CalendarOutlined />
                            Lịch ca làm việc
                        </span>
                    }
                    key="calendar"
                >
                    <div style={{ background: '#fff', padding: isMobile ? '12px' : '24px', borderRadius: '8px' }}>
                        <Calendar
                            value={currentDate}
                            onChange={(date: any) => setCurrentDate(date)}
                            locale="vi-VN"
                            tileClassName={({ date, view }) => {
                                if (view !== 'month') return '';
                                
                                const dateStr = dayjs(date).format('YYYY-MM-DD');
                                const registrations = registrationMap.get(dateStr) || [];
                                
                                if (registrations.length === 0) return '';
                                
                                // Ưu tiên trạng thái: approved > pending > rejected
                                const hasApproved = registrations.some(r => r.status === 'approved');
                                const hasPending = registrations.some(r => r.status === 'pending');
                                const hasRejected = registrations.some(r => r.status === 'rejected');
                                
                                if (hasApproved) return 'shift-status-approved';
                                if (hasPending) return 'shift-status-pending';
                                if (hasRejected) return 'shift-status-rejected';
                                
                                return '';
                            }}
                            tileContent={({ date, view }) => {
                                if (view !== 'month') return null;
                                
                                const dateStr = dayjs(date).format('YYYY-MM-DD');
                                const registrations = registrationMap.get(dateStr) || [];
                                
                                if (registrations.length === 0) return null;
                                
                                return (
                                    <div className="shift-calendar-cell-content" onClick={() => handleDateClick(date)}>
                                        {registrations.map((reg, index) => (
                                            <div key={reg.id} className="shift-calendar-cell-info">
                                                <div style={{
                                                    fontSize: isMobile ? 9 : 11,
                                                    color: reg.status === 'approved' ? '#52c41a' : 
                                                           reg.status === 'pending' ? '#faad14' : '#ff4d4f',
                                                    fontWeight: 600,
                                                    marginBottom: 2
                                                }}>
                                                    {reg.shift_name}
                                                </div>
                                                <div style={{
                                                    fontSize: isMobile ? 8 : 10,
                                                    color: '#666'
                                                }}>
                                                    {reg.start_time?.substring(0, 5)} - {reg.end_time?.substring(0, 5)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }}
                        />
                        
                        {/* Legend */}
                        <div style={{
                            marginTop: 16,
                            padding: isMobile ? 12 : 16,
                            background: '#fafafa',
                            borderRadius: 8,
                            border: '1px solid #d9d9d9'
                        }}>
                            <div style={{ marginBottom: 8 }}>
                                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>Chú thích:</Text>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        width: 16,
                                        height: 16,
                                        background: '#f6ffed',
                                        border: '1px solid #b7eb8f',
                                        borderRadius: 4,
                                        marginRight: 8
                                    }} />
                                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Đã duyệt</Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        width: 16,
                                        height: 16,
                                        background: '#fffbe6',
                                        border: '1px solid #ffe58f',
                                        borderRadius: 4,
                                        marginRight: 8
                                    }} />
                                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Chờ duyệt</Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        width: 16,
                                        height: 16,
                                        background: '#fff1f0',
                                        border: '1px solid #ffccc7',
                                        borderRadius: 4,
                                        marginRight: 8
                                    }} />
                                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Từ chối</Text>
                                </div>
                            </div>
                        </div>
                    </div>
                </Tabs.TabPane>
            </Tabs>

            {/* Edit Modal */}
            <Modal
                title="Chỉnh sửa đăng ký ca"
                open={editModalVisible}
                onOk={handleEditSubmit}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingRecord(null);
                }}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item
                        label="Ngày làm việc"
                        name="date"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                    >
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item
                        label="Ca làm việc"
                        name="shift_id"
                        rules={[{ required: true, message: 'Vui lòng chọn ca' }]}
                    >
                        <Select placeholder="Chọn ca làm việc">
                            {configurations.map(config => (
                                <Select.Option key={config.id} value={config.id}>
                                    {config.name} ({config.start_time?.substring(0, 5)} - {config.end_time?.substring(0, 5)})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Ghi chú" name="notes">
                        <Input.TextArea rows={3} placeholder="Nhập ghi chú..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Bulk Register Modal */}
            <Modal
                title="Đăng ký ca hàng loạt"
                open={bulkModalVisible}
                onOk={handleBulkRegisterSubmit}
                onCancel={() => setBulkModalVisible(false)}
                okText="Đăng ký"
                cancelText="Hủy"
                width={800}
            >
                <Form form={bulkForm} layout="vertical">
                    <Form.List name="scheduleItems">
                        {(fields, { add, remove }) => (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ date: null, shift_id: null, notes: '' })}
                                        block
                                        icon={<PlusOutlined />}
                                    >
                                        Thêm ngày và ca làm việc
                                    </Button>
                                </div>

                                {fields.map((field, index) => (
                                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8, alignItems: 'flex-start' }} align="baseline">
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'date']}
                                            rules={[
                                                { required: true, message: 'Chọn ngày' },
                                                {
                                                    validator: async (_, value) => {
                                                        if (!value) return;
                                                        const allDates = bulkForm.getFieldValue('scheduleItems') || [];
                                                        const formatted = dayjs(value).format('YYYY-MM-DD');
                                                        const duplicates = allDates.filter((item: any, idx: number) => 
                                                            idx !== index && item?.date && dayjs(item.date).format('YYYY-MM-DD') === formatted
                                                        );
                                                        if (duplicates.length > 0) {
                                                            throw new Error('Ngày này đã được chọn ở dòng khác');
                                                        }
                                                    }
                                                }
                                            ]}
                                            style={{ marginBottom: 0, width: 180 }}
                                        >
                                            <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày" style={{ width: '100%' }} />
                                        </Form.Item>

                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'shift_id']}
                                            rules={[{ required: true, message: 'Chọn ca' }]}
                                            style={{ marginBottom: 0, width: 220 }}
                                        >
                                            <Select placeholder="Chọn ca làm việc" style={{ width: '100%' }}>
                                                {configurations.map(config => (
                                                    <Select.Option key={config.id} value={config.id}>
                                                        {config.name} ({config.start_time?.substring(0, 5)} - {config.end_time?.substring(0, 5)})
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>

                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'notes']}
                                            style={{ marginBottom: 0, flex: 1 }}
                                        >
                                            <Input placeholder="Ghi chú (tùy chọn)" />
                                        </Form.Item>

                                        <Button
                                            type="link"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => remove(field.name)}
                                        />
                                    </Space>
                                ))}

                                {fields.length === 0 && (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="Chưa có dòng nào. Nhấn nút trên để thêm."
                                        style={{ margin: '20px 0' }}
                                    />
                                )}
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>

            {/* Detail Modal - Chi tiết ca trong ngày */}
            <Modal
                title={`Chi tiết ngày ${selectedDate ? dayjs(selectedDate).format('DD/MM/YYYY') : ''}`}
                open={detailModalVisible}
                onCancel={() => {
                    setDetailModalVisible(false);
                    setSelectedDate(null);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setDetailModalVisible(false);
                        setSelectedDate(null);
                    }}>
                        Đóng
                    </Button>
                ]}
                width={600}
            >
                {selectedDate && (() => {
                    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
                    const dayRegistrations = registrationMap.get(dateStr) || [];
                    
                    if (dayRegistrations.length === 0) {
                        return (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Không có ca đăng ký trong ngày này"
                            />
                        );
                    }
                    
                    return (
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            {dayRegistrations.map(reg => (
                                <div key={reg.id} style={{
                                    padding: '16px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '8px',
                                    background: '#fafafa'
                                }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <Space>
                                            <Text strong style={{ fontSize: 16 }}>{reg.shift_name}</Text>
                                            <Tag color={
                                                reg.status === 'approved' ? 'green' : 
                                                reg.status === 'pending' ? 'orange' : 'red'
                                            }>
                                                {reg.status === 'approved' ? 'Đã duyệt' : 
                                                 reg.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                                            </Tag>
                                        </Space>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                        <Text>Giờ làm: {reg.start_time?.substring(0, 5)} - {reg.end_time?.substring(0, 5)}</Text>
                                    </div>
                                    {reg.notes && (
                                        <div style={{ marginBottom: 8 }}>
                                            <Text type="secondary">Ghi chú: {reg.notes}</Text>
                                        </div>
                                    )}
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Đăng ký lúc: {dayjs(reg.created_at).format('DD/MM/YYYY HH:mm')}
                                        </Text>
                                    </div>
                                    {reg.status === 'pending' && (
                                        <div style={{ marginTop: 12 }}>
                                            <Space>
                                                <Button
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => {
                                                        setDetailModalVisible(false);
                                                        handleEdit(reg);
                                                    }}
                                                >
                                                    Sửa
                                                </Button>
                                                <Button
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => {
                                                        setDetailModalVisible(false);
                                                        handleDelete(reg);
                                                    }}
                                                >
                                                    Xóa
                                                </Button>
                                            </Space>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </Space>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default ShiftRegistrationManagement;

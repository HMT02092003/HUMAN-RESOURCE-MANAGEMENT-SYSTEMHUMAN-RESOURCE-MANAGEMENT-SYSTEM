"use client";

import React, { useState, useMemo } from 'react';
import { Button, Space, Typography, Empty, message, Tooltip, Tag, Modal, Form, Select, DatePicker, Input } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ShiftRegistrationManagement = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [configurations, setConfigurations] = useState<any[]>([]);
    const [editForm] = Form.useForm();
    const [bulkForm] = Form.useForm();

    // Load shift configurations
    React.useEffect(() => {
        loadConfigurations();
    }, []);

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
                </Space>
            </div>

            {/* Table */}
            <ServerSideTable
                columns={columns}
                fetchData={shiftService.getMyShiftRegistrationsPaginated}
                rowKey="id"
                rowSelection={rowSelection}
                defaultPageSize={10}
                scroll={{ x: 'auto' }}
                bordered
                refreshTrigger={refreshTrigger}
                emptyText={
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: '60px', marginBottom: '16px' }}>📅</div>
                                <Title level={4} type="secondary" style={{ marginBottom: '8px' }}>
                                    Bạn chưa đăng ký ca nào
                                </Title>
                                <Text type="secondary">Đăng ký ca làm việc để quản lý thời gian</Text>
                            </div>
                        }
                    />
                }
            />

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
        </div>
    );
};

export default ShiftRegistrationManagement;

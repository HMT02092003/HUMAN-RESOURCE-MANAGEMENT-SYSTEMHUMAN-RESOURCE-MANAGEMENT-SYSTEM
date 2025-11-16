'use client';

import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    TimePicker,
    InputNumber,
    Space,
    Tag,
    message,
    Popconfirm,
    Card
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import dayjs from 'dayjs';

const { TextArea } = Input;

const ShiftConfigurationManagement = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [configurations, setConfigurations] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    useEffect(() => {
        loadConfigurations();
    }, []);

    // Convert time string like 'HH:mm' or 'HH:mm:ss' into a Dayjs object.
    const parseTimeStringToDayjs = (val?: string) => {
        if (!val || typeof val !== 'string') return undefined;
        // match HH:MM or HH:MM:SS
        const m = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!m) return undefined;
        const h = Number(m[1]);
        const mm = Number(m[2]);
        const ss = m[3] ? Number(m[3]) : 0;
        if (Number.isNaN(h) || Number.isNaN(mm) || Number.isNaN(ss)) return undefined;
        return dayjs().hour(h).minute(mm).second(ss).millisecond(0);
    };

    const loadConfigurations = async () => {
        try {
            setLoading(true);
            const response = await shiftService.getAllShiftConfigurations();
            if (response.data?.success) {
                setConfigurations(response.data.data);
            }
        } catch (error: any) {
            message.error('Không thể tải danh sách cấu hình ca');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async (config?: any) => {
        if (config) {
            try {
                setLoading(true);
                // Fetch fresh single configuration from backend by id to avoid client-side looping
                const resp = await shiftService.getShiftConfigurationById(Number(config.id));
                const cfg = resp.data?.data || config;
                setEditingConfig(cfg);
                form.setFieldsValue({
                    ...cfg,
                    // Use robust parser for time-only strings to avoid Invalid Date
                    start_time: parseTimeStringToDayjs(cfg.start_time),
                    end_time: parseTimeStringToDayjs(cfg.end_time),
                    working_unit: cfg.working_unit !== undefined && cfg.working_unit !== null
                        ? parseFloat(cfg.working_unit)
                        : 1.0
                });
            } catch (error: any) {
                message.error(error.response?.data?.message || 'Không thể tải thông tin ca');
                // fallback to provided config; also use robust parser
                setEditingConfig(config);
                form.setFieldsValue({
                    ...config,
                    start_time: parseTimeStringToDayjs(config.start_time),
                    end_time: parseTimeStringToDayjs(config.end_time),
                    working_unit: config.working_unit !== undefined && config.working_unit !== null
                        ? parseFloat(config.working_unit)
                        : 1.0
                });
            } finally {
                setLoading(false);
                setModalVisible(true);
            }
        } else {
            setEditingConfig(null);
            form.resetFields();
            form.setFieldsValue({ working_unit: 1.0 });
            setModalVisible(true);
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setEditingConfig(null);
        form.resetFields();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            const data = {
                ...values,
                start_time: values.start_time.format('HH:mm:ss'),
                end_time: values.end_time.format('HH:mm:ss'),
                working_unit: parseFloat(values.working_unit) || 1.0
            };

            setLoading(true);

            if (editingConfig) {
                await shiftService.updateShiftConfiguration(editingConfig.id, data);
                message.success('Cập nhật cấu hình ca thành công');
            } else {
                await shiftService.createShiftConfiguration(data);
                message.success('Tạo cấu hình ca thành công');
            }

            handleCloseModal();
            loadConfigurations();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            setLoading(true);
            await shiftService.deleteShiftConfiguration(id);
            message.success('Xóa cấu hình ca thành công');
            loadConfigurations();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa cấu hình ca');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedRowKeys || selectedRowKeys.length === 0) return;

        try {
            setLoading(true);
            const ids = selectedRowKeys.map(k => Number(k));
            await shiftService.bulkDeleteShiftConfigurations(ids);
            message.success('Xóa các cấu hình ca thành công');
            setSelectedRowKeys([]);
            loadConfigurations();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa các cấu hình đã chọn');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Tên ca',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <strong>{text}</strong>
        },
        {
            title: 'Thời gian',
            key: 'time',
            render: (_: any, record: any) => (
                <span>
                    {record.start_time?.substring(0, 5)} - {record.end_time?.substring(0, 5)}
                </span>
            )
        },
        {
            title: 'Hệ số làm việc',
            dataIndex: 'working_unit',
            key: 'working_unit',
            render: (unit: any) => <Tag color={parseFloat(unit) > 1 ? 'gold' : 'default'}>{unit}</Tag>,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true
        },
        {
            title: 'Tạo lúc',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (val: string) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '-'
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 140,
            render: (_: any, record: any) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}></Button>
                    <Popconfirm
                        title="Xóa ca?"
                        description="Bạn có chắc chắn muốn xóa ca này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />}></Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <div style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenModal()}
                >
                    Thêm ca mới
                </Button>
                {selectedRowKeys.length > 0 && (
                <Popconfirm
                    title="Xóa các cấu hình được chọn?"
                    description="Bạn có chắc chắn muốn xóa các ca đã chọn?"
                    onConfirm={() => handleBulkDelete()}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button
                        type="primary"
                        danger
                        style={{ marginLeft: 8 }}
                        icon={<DeleteOutlined />}
                    >
                        Xóa đã chọn
                    </Button>
                </Popconfirm>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={configurations}
                rowKey="id"
                loading={loading}
                rowSelection={{
                    selectedRowKeys,
                    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
                }}
                scroll={{ x: "max-content" }}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng ${total} ca`
                }}
            />

            <Modal
                title={editingConfig ? 'Chỉnh sửa cấu hình ca' : 'Thêm ca mới'}
                open={modalVisible}
                onCancel={handleCloseModal}
                onOk={handleSubmit}
                confirmLoading={loading}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Tên ca"
                        rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}
                    >
                        <Input placeholder="VD: Ca sáng" />
                    </Form.Item>

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item
                            name="start_time"
                            label="Giờ bắt đầu"
                            rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}
                        >
                            <TimePicker format="HH:mm" style={{ width: 200 }} />
                        </Form.Item>

                        <Form.Item
                            name="end_time"
                            label="Giờ kết thúc"
                            rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}
                        >
                            <TimePicker format="HH:mm" style={{ width: 200 }} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="working_unit" label="Hệ số làm việc">
                        <InputNumber min={0} step={0.1} style={{ width: 150 }} />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <TextArea rows={3} placeholder="Mô tả chi tiết về ca làm việc" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ShiftConfigurationManagement;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Button,
    Modal,
    Form,
    Input,
    TimePicker,
    InputNumber,
    Space,
    Tag,
    message,
    Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import dayjs from 'dayjs';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';

const { TextArea } = Input;

const ShiftConfigurationManagement = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [configurations, setConfigurations] = useState<any[]>([]);
    const [allConfigurations, setAllConfigurations] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch all data for Excel export
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const response = await shiftService.getAllShiftConfigurations();
                if (response.data?.success) {
                    setAllConfigurations(response.data.data || []);
                }
            } catch (error) {
                console.error('Error fetching all configurations:', error);
            }
        };
        fetchAllData();
    }, [refreshTrigger]);

    // Fetch data callback for ServerSideTable
    const fetchData = useCallback(async (params: any) => {
        console.log('[ShiftConfigurationManagement] Fetching data with params:', params);
        try {
            const response = await shiftService.getAllShiftConfigurationsPaginated(params);
            return response.data || { data: [], total: 0 };
        } catch (error: any) {
            console.error('Error fetching shift configurations:', error);
            message.error('Đội tải dữ liệu thất bại');
            return { data: [], total: 0 };
        }
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
            setRefreshTrigger(prev => prev + 1);
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
            setRefreshTrigger(prev => prev + 1);
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
            setSelectedRows([]);
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa các cấu hình đã chọn');
        } finally {
            setLoading(false);
        }
    };

    const columns: ServerSideColumnType<any>[] = [
        {
            title: 'Tên ca',
            dataIndex: 'name',
            key: 'name',
            searchField: 'name',
            sortable: true,
            filterType: 'text',
            width: 150,
            render: (text: string) => <strong>{text}</strong>
        },
        {
            title: 'Giờ bắt đầu',
            dataIndex: 'start_time',
            key: 'start_time',
            searchField: 'start_time',
            sortable: true,
            filterType: 'text',
            width: 120,
            render: (time: string) => time?.substring(0, 5) || '-'
        },
        {
            title: 'Giờ kết thúc',
            dataIndex: 'end_time',
            key: 'end_time',
            searchField: 'end_time',
            sortable: true,
            filterType: 'text',
            width: 120,
            render: (time: string) => time?.substring(0, 5) || '-'
        },
        {
            title: 'Hệ số làm việc',
            dataIndex: 'working_unit',
            key: 'working_unit',
            searchField: 'working_unit',
            sortable: true,
            filterType: 'number',
            width: 140,
            render: (unit: any) => <Tag color={parseFloat(unit) > 1 ? 'gold' : 'default'}>{unit}</Tag>,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            searchField: 'description',
            sortable: true,
            filterType: 'text',
            width: 200,
            ellipsis: true
        },
        {
            title: 'Tạo lúc',
            dataIndex: 'created_at',
            key: 'created_at',
            searchField: 'created_at',
            sortable: true,
            filterType: 'date',
            width: 160,
            render: (val: string) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '-'
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 140,
            fixed: 'right',
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

    const excelColumns: ExcelColumn[] = [
        { title: 'Tên ca', dataIndex: 'shift_name', width: 25 },
        { title: 'Giờ bắt đầu', dataIndex: 'start_time', width: 15 },
        { title: 'Giờ kết thúc', dataIndex: 'end_time', width: 15 },
        { title: 'Thời gian nghỉ (phút)', dataIndex: 'break_minutes', width: 20 },
        { title: 'Mô tả', dataIndex: 'description', width: 30 }
    ];

    return (
        <>
            <div style={{ marginBottom: 16 }}>
                <Space>
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
                            icon={<DeleteOutlined />}
                        >
                            Xóa đã chọn
                        </Button>
                    </Popconfirm>
                    )}
                    <ExcelExportButton
                        data={allConfigurations}
                        columns={excelColumns}
                        fileName={`cau-hinh-ca-${dayjs().format('YYYY-MM-DD')}`}
                        title="DANH SÁCH CẤU HÌNH CA"
                        description={`Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
                    />
                </Space>
            </div>

            <ServerSideTable
                columns={columns}
                fetchData={fetchData}
                rowKey="id"
                defaultSortField="created_at"
                defaultSortOrder="desc"
                defaultPageSize={10}
                refreshTrigger={refreshTrigger}
                scroll={{ x: "max-content" }}
                bordered
                onSelectionChange={(keys, rows) => {
                    setSelectedRowKeys(keys);
                    setSelectedRows(rows);
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

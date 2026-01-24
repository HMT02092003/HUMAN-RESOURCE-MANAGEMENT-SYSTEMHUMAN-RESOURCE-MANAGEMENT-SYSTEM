'use client';

import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Space,
    Modal,
    Form,
    Input,
    DatePicker,
    InputNumber,
    message,
    Popconfirm,
    Tag,
    Typography,
    Row,
    Col
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CalendarOutlined,
    SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { attendanceService } from '@/service/attendanceService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const HolidayManagement = () => {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<any>(null);
    const [form] = Form.useForm();
    const [currentYear, setCurrentYear] = useState(dayjs().year());

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const data = await attendanceService.getHolidays(currentYear);
            setHolidays(data);
        } catch (error: any) {
            message.error(error.message || 'Không thể tải danh sách ngày nghỉ lễ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, [currentYear]);

    const handleAdd = () => {
        setEditingHoliday(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingHoliday(record);
        form.setFieldsValue({
            name: record.name,
            dates: [dayjs(record.start_date), dayjs(record.end_date)],
            description: record.description,
            importance: record.importance
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await attendanceService.deleteHoliday(id);
            message.success('Xóa ngày nghỉ lễ thành công');
            fetchHolidays();
        } catch (error: any) {
            message.error(error.message || 'Không thể xóa ngày nghỉ lễ');
        }
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                name: values.name,
                start_date: values.dates[0].format('YYYY-MM-DD'),
                end_date: values.dates[1].format('YYYY-MM-DD'),
                description: values.description,
                importance: values.importance
            };

            if (editingHoliday) {
                await attendanceService.updateHoliday(editingHoliday.id, payload);
                message.success('Cập nhật ngày nghỉ lễ thành công');
            } else {
                await attendanceService.createHoliday(payload);
                message.success('Thêm ngày nghỉ lễ thành công');
            }

            setIsModalVisible(false);
            fetchHolidays();
        } catch (error: any) {
            if (error.errorFields) return; // Form validation error
            message.error(error.message || 'Có lỗi xảy ra');
        }
    };

    const columns = [
        {
            title: 'Tên ngày lễ',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Ngày bắt đầu',
            dataIndex: 'start_date',
            key: 'start_date',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY')
        },
        {
            title: 'Ngày kết thúc',
            dataIndex: 'end_date',
            key: 'end_date',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY')
        },
        {
            title: 'Độ quan trọng',
            dataIndex: 'importance',
            key: 'importance',
            render: (val: number) => (
                <Tag color={val >= 5 ? 'volcano' : 'blue'}>
                    {val >= 5 ? 'Quan trọng' : 'Thường'}
                </Tag>
            )
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        ghost
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Xác nhận xóa ngày nghỉ lễ này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger icon={<DeleteOutlined />} Resource-management-system />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Space size="middle">
                        <CalendarOutlined style={{ color: '#1890ff', fontSize: 24 }} />
                        <Title level={4} style={{ margin: 0 }}>Quản lý ngày nghỉ lễ</Title>
                    </Space>
                </Col>
                <Col>
                    <Space size="middle">
                        <DatePicker
                            picker="year"
                            value={dayjs().year(currentYear)}
                            onChange={(date) => date && setCurrentYear(date.year())}
                            allowClear={false}
                        />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAdd}
                        >
                            Thêm ngày lễ
                        </Button>
                    </Space>
                </Col>
            </Row>

            <div style={{ marginBottom: 24 }}>
                <Text type="secondary">
                    Cấu hình các ngày nghỉ lễ quốc gia và của công ty. Các ngày này sẽ được đánh dấu trên bảng chấm công
                    và tính lương làm thêm giờ theo hệ số ngày lễ (thường là 300%).
                </Text>
            </div>

            <Table
                columns={columns}
                dataSource={holidays}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 12 }}
            />

            <Modal
                title={editingHoliday ? 'Chỉnh sửa ngày lễ' : 'Thêm ngày lễ mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ importance: 5 }}
                >
                    <Form.Item
                        name="name"
                        label="Tên ngày lễ"
                        rules={[{ required: true, message: 'Vui lòng nhập tên ngày lễ' }]}
                    >
                        <Input placeholder="Ví dụ: Tết Nguyên Đán, Giải phóng miền Nam..." />
                    </Form.Item>

                    <Form.Item
                        name="dates"
                        label="Khoảng thời gian nghỉ"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ' }]}
                    >
                        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="importance"
                                label="Mức độ quan trọng (1-10)"
                            >
                                <InputNumber min={1} max={10} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="description"
                        label="Mô tả / Ghi chú"
                    >
                        <Input.TextArea rows={3} placeholder="Ghi chú thêm về ngày lễ..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default HolidayManagement;

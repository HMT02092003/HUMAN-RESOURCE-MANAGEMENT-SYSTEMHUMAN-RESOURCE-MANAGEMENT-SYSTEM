"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, DatePicker, Row, Col, Typography, Tag, List, Modal, Descriptions, Image, Button, message, Space, Input, TimePicker } from 'antd';
import { ReloadOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, ApartmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { aiService, AttendanceLog } from '@/service/aiService';
import { useAuth } from '@/hooks/useAuth';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const AttendanceHistory: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs(), dayjs()]);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [searchDept, setSearchDept] = useState('');
    const [searchTime, setSearchTime] = useState<dayjs.Dayjs | null>(null);

    // Modal state
    const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await aiService.getAttendanceLogs({
                page,
                page_size: pageSize,
                start_date: dateRange[0]?.format('YYYY-MM-DD'),
                end_date: dateRange[1]?.format('YYYY-MM-DD'),
                user_id: user?.roleId === 2 ? user.id : undefined,
                search_name: searchName || undefined,
                search_dept: searchDept || undefined,
                search_time: searchTime ? searchTime.format('HH:mm:ss') : undefined
            });
            if (res.success) {
                setLogs(res.data);
                setTotal(res.total);
            }
        } catch (error) {
            console.error(error);
            message.error("Không thể tải lịch sử chấm công");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, dateRange, user, searchName, searchDept, searchTime]);

    useEffect(() => {
        // Fetch logs when user is available.
        if (user) {
            fetchLogs();
        }
    }, [fetchLogs, user]);

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'recognized':
            case 'success':
            case 'confirmed':
                return <Tag color="success" icon={<CheckCircleOutlined />}>Thành công</Tag>;
            case 'unrecognized':
            case 'validation_failed':
            case 'unknown_face':
                return <Tag color="error" icon={<CloseCircleOutlined />}>Thất bại</Tag>;
            case 'spoof':
                return <Tag color="warning">Giả mạo</Tag>;
            default:
                return <Tag color="default">{status}</Tag>;
        }
    };

    const getImageUrl = (url: string) => {
        if (!url) return '';
        return `${API_BASE_URL}/api/ai${url}`;
    };

    const handleCardClick = (log: AttendanceLog) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    return (
        <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
            <div style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Lịch sử chấm công (AI)</Title>
                    </Col>
                    <Col>
                        <Space wrap>
                            <Input
                                placeholder="Tìm theo tên..."
                                prefix={<UserOutlined />}
                                value={searchName}
                                onChange={e => setSearchName(e.target.value)}
                                onPressEnter={fetchLogs}
                                style={{ width: 150 }}
                            />
                            <Input
                                placeholder="Tìm phòng ban..."
                                prefix={<ApartmentOutlined />}
                                value={searchDept}
                                onChange={e => setSearchDept(e.target.value)}
                                onPressEnter={fetchLogs}
                                style={{ width: 150 }}
                            />
                            <TimePicker
                                placeholder="Giờ check..."
                                value={searchTime}
                                onChange={setSearchTime}
                                style={{ width: 120 }}
                            />
                            <RangePicker
                                value={dateRange}
                                onChange={(dates) => {
                                    if (dates) {
                                        setDateRange([dates[0]!, dates[1]!]);
                                        setPage(1);
                                    }
                                }}
                                format="DD/MM/YYYY"
                                style={{ width: 240 }}
                            />
                            <Button type="primary" icon={<SearchOutlined />} onClick={fetchLogs}>Tìm</Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>Làm mới</Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <List
                grid={{
                    gutter: 16,
                    xs: 1,
                    sm: 2,
                    md: 3,
                    lg: 4,
                    xl: 5,
                    xxl: 6,
                }}
                dataSource={logs}
                loading={loading}
                pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: total,
                    onChange: (p, ps) => {
                        setPage(p);
                        setPageSize(ps);
                    },
                    showSizeChanger: true
                }}
                renderItem={(item) => {
                    const deptName = item.department?.name || '---';

                    return (
                        <List.Item>
                            <Card
                                hoverable
                                onClick={() => handleCardClick(item)}
                                cover={
                                    <div style={{ height: 200, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
                                        {item.image_snapshot_url ? (
                                            <Image
                                                alt="snapshot"
                                                src={getImageUrl(item.image_snapshot_url)}
                                                style={{ objectFit: 'cover', height: '100%', width: '100%' }}
                                                preview={false}
                                            />
                                        ) : (
                                            <UserOutlined style={{ fontSize: 48, color: '#ccc' }} />
                                        )}
                                    </div>
                                }
                                bodyStyle={{ padding: 12 }}
                            >
                                <Card.Meta
                                    title={
                                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 14 }}>
                                            <span style={{ fontWeight: 600 }}>{item.username}</span>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                <ApartmentOutlined /> {deptName}
                                            </Text>
                                        </div>
                                    }
                                    description={
                                        <Space direction="vertical" size={2} style={{ width: '100%', marginTop: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <Space><ClockCircleOutlined /> <Text strong>{dayjs(item.checkin_time).format('HH:mm:ss')}</Text></Space>
                                                <span>{dayjs(item.checkin_time).format('DD/MM')}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                {getStatusTag(item.status)}
                                                <Tag color="cyan">Check Time</Tag>
                                            </div>
                                        </Space>
                                    }
                                />
                            </Card>
                        </List.Item>
                    );
                }}
            />

            <Modal
                title="Chi tiết lượt chấm công"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>
                ]}
                width={700}
            >
                {selectedLog && (
                    <Row gutter={24}>
                        <Col span={10}>
                            <Image
                                src={getImageUrl(selectedLog.image_snapshot_url)}
                                alt="Full Snapshot"
                                style={{ borderRadius: 8, width: '100%' }}
                            />
                        </Col>
                        <Col span={14}>
                            <Descriptions column={1} bordered>
                                <Descriptions.Item label="Nhân viên">
                                    <b>{selectedLog.username}</b>
                                </Descriptions.Item>
                                <Descriptions.Item label="Mã nhân viên">
                                    {selectedLog.user_id}
                                </Descriptions.Item>
                                <Descriptions.Item label="Phòng ban">
                                    {selectedLog.department?.name || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Thời gian check">
                                    {dayjs(selectedLog.checkin_time).format('DD/MM/YYYY HH:mm:ss')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Loại ghi nhận">
                                    Check Time
                                </Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    {getStatusTag(selectedLog.status)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Độ tương đồng">
                                    {(selectedLog.similarity_score * 100).toFixed(2)}%
                                </Descriptions.Item>
                                <Descriptions.Item label="Loại khớp">
                                    {selectedLog.matched_by_type}
                                </Descriptions.Item>
                                {selectedLog.notes && (
                                    <Descriptions.Item label="Ghi chú">
                                        {selectedLog.notes}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};

export default AttendanceHistory;

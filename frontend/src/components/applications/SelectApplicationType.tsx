'use client';

import React from 'react';
import { Row, Col, Button, Typography, Space } from 'antd';
import { ArrowLeftOutlined, FormOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { applicationTypes } from './utils';

const { Title, Text } = Typography;

const SelectApplicationType = () => {
    const router = useRouter();

    const handleSelectType = (type: string) => {
        const typeMap: { [key: string]: string } = {
            'leave': 'leave',
            'shift_registration': 'shift',
            'forgot_checkin': 'forgot-checkin',
            'overtime': 'overtime',
            'business_trip': 'business-trip',
            'resignation': 'resignation'
        };

        const routeType = typeMap[type] || type;
        router.push(`/applications/${routeType}`);
    };

    return (
        <div style={{ padding: '24px' }}>
            <Row gutter={[0, 24]}>
                {/* Header */}
                <Col span={24}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => router.push('/applications')}
                                type="text"
                                size="large"
                            >
                                Quay lại danh sách
                            </Button>
                        </Col>
                    </Row>
                </Col>

                {/* Application Types Grid */}
                <Col span={24}>
                    <Row gutter={[24, 24]} justify="center">
                        {applicationTypes.map((appType) => (
                            <Col xs={24} sm={12} md={8} lg={8} xl={8} key={appType.type}>
                                <div
                                    onClick={() => handleSelectType(appType.type)}
                                    style={{
                                        height: '100%',
                                        minHeight: '200px',
                                        borderRadius: '12px',
                                        border: '2px solid #f0f0f0',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        padding: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        backgroundColor: 'white'
                                    }}
                                    className="application-type-card"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#1890ff';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(24, 144, 255, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#f0f0f0';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                        <div style={{ fontSize: '40px' }}>{appType.icon}</div>
                                        <Title level={4} style={{ margin: 0, color: '#262626' }}>
                                            {appType.name}
                                        </Title>
                                        <Text type="secondary" style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                            {appType.description}
                                        </Text>
                                    </Space>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Col>

                {/* Info Section */}
                <Col span={24}>
                    <Row justify="center">
                        <Col xs={24} md={24} lg={24}>
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                                    border: '1px solid #91d5ff',
                                    borderRadius: '12px',
                                    padding: '24px',
                                }}
                            >
                                <Row gutter={16} align="top">
                                    <Col flex="auto">
                                        <Title level={5} style={{ margin: '0 0 16px 0', color: '#003a8c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                fontSize: '20px',
                                                background: '#1890ff',
                                                color: 'white',
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                💡
                                            </div>Hướng dẫn sử dụng
                                        </Title>
                                        <Row gutter={[16, 8]}>
                                            <Col span={24}>
                                                <Text style={{ color: '#1890ff', fontSize: '14px' }}>
                                                    • Chọn loại đơn từ phù hợp với nhu cầu của bạn
                                                </Text>
                                            </Col>
                                            <Col span={24}>
                                                <Text style={{ color: '#1890ff', fontSize: '14px' }}>
                                                    • Điền đầy đủ thông tin theo biểu mẫu
                                                </Text>
                                            </Col>
                                            <Col span={24}>
                                                <Text style={{ color: '#1890ff', fontSize: '14px' }}>
                                                    • Kiểm tra kỹ thông tin trước khi gửi
                                                </Text>
                                            </Col>
                                            <Col span={24}>
                                                <Text style={{ color: '#1890ff', fontSize: '14px' }}>
                                                    • Theo dõi trạng thái đơn từ tại trang danh sách
                                                </Text>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                            </div>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
};

export default SelectApplicationType;

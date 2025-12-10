'use client';

import React from 'react';
import { Row, Col, Button, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import styles from './SelectApplicationType.module.css';
// Material icons (installed)
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlightIcon from '@mui/icons-material/Flight';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const { Title, Text } = Typography;

// Define application type interface
interface ApplicationType {
    type: string;
    name: string;
    description: string;
    icon: React.ReactNode;
}

// Application types data
const applicationTypes: ApplicationType[] = [
    {
        type: 'leave',
        name: 'Xin nghỉ phép',
        description: 'Đăng ký nghỉ phép có lý do',
        icon: <BeachAccessIcon />
    },
    {
        type: 'forgot-check',
        name: 'Quên check in/out',
        description: 'Báo cáo quên chấm công vào/ra',
        icon: <EditNoteIcon />
    },
    {
        type: 'overtime',
        name: 'Làm thêm giờ',
        description: 'Đăng ký làm ngoài giờ',
        icon: <AccessTimeIcon />
    },
    {
        type: 'business-trip',
        name: 'Công tác',
        description: 'Đăng ký đi công tác',
        icon: <FlightIcon />
    },
    {
        type: 'resignation',
        name: 'Thôi việc',
        description: 'Đơn xin thôi việc',
        icon: <ExitToAppIcon />
    }
];

const SelectApplicationType: React.FC = () => {
    const router = useRouter();

    const handleSelectType = (type: string) => {
        const typeMap: { [key: string]: string } = {
            'leave': 'leave',
            'shift_registration': 'shift',
            'forgot_check': 'forgot-check',
            'overtime': 'overtime',
            'business_trip': 'business-trip',
            'resignation': 'resignation'
        };

        const routeType = typeMap[type] || type;
        router.push(`/applications/${routeType}`);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, type: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelectType(type);
        }
    };

    return (
        <div className={styles.container}>
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
                    <div className={styles.grid} role="list">
                        {applicationTypes.map((appType: ApplicationType) => (
                            <div key={appType.type} role="listitem" className={styles.cardWrapper}>
                                <div
                                    className={styles.card}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelectType(appType.type)}
                                    onKeyDown={(e) => onKeyDown(e as unknown as React.KeyboardEvent<HTMLButtonElement>, appType.type)}
                                    aria-label={`Chọn ${appType.name}`}
                                >
                                    <div className={styles.icon} aria-hidden>
                                        {appType.icon}
                                    </div>
                                    <div className={styles.cardBody}>
                                        <Title level={4} className={styles.cardTitle}>
                                            {appType.name}
                                        </Title>
                                        <Text type="secondary" className={styles.cardDesc}>
                                            {appType.description}
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Col>

                {/* Info Section */}
                <Col span={24}>
                    <Row justify="center">
                        <Col xs={24} md={24} lg={24}>
                            <div className={styles.infoBox}>
                                <Row gutter={16} align="top">
                                    <Col flex="auto">
                                        <Title level={5} className={styles.infoTitle}>
                                            <div className={styles.infoBadge}>💡</div>
                                            Hướng dẫn sử dụng
                                        </Title>
                                        <Row gutter={[16, 8]}>
                                            <Col span={24}>
                                                <Text className={styles.infoText}>
                                                    • Chọn loại đơn từ phù hợp với nhu cầu của bạn
                                                </Text>
                                            </Col>
                                            <Col span={24}>
                                                <Text className={styles.infoText}>
                                                    • Điền đầy đủ thông tin theo biểu mẫu
                                                </Text>
                                            </Col>
                                            <Col span={24}>
                                                <Text className={styles.infoText}>
                                                    • Kiểm tra kỹ thông tin trước khi gửi
                                                </Text>
                                            </Col>
                                            <Col span={24}>
                                                <Text className={styles.infoText}>
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
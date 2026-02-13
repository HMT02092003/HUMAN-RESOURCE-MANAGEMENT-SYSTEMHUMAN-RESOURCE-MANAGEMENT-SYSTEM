import React, { useEffect, useState } from 'react';
import { Modal, Row, Col, Descriptions, Tag, Typography, Divider, Image, Space, Spin, Card, Button } from 'antd';
import {
    FileTextOutlined,
    CalendarOutlined,
    UserOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    DollarOutlined,
    FileImageOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    PushpinOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import applicationService from '@/service/applicationService';
import { APPLICATION_STATUS_LABELS, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_COLORS, FORGOT_CHECK_TYPE_LABELS } from '@/config/constant';

// Extend dayjs với plugin customParseFormat
dayjs.extend(customParseFormat);

const { Title, Text, Paragraph } = Typography;

// Helper function để parse thời gian từ nhiều định dạng
const parseTime = (timeValue: any): string => {
    if (!timeValue) return '--:--';

    // Nếu là string chỉ có giờ:phút (VD: "17:00" hoặc "17:00:00")
    if (typeof timeValue === 'string') {
        // Kiểm tra format HH:mm hoặc HH:mm:ss
        const timeOnlyMatch = timeValue.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
        if (timeOnlyMatch) {
            return `${timeOnlyMatch[1].padStart(2, '0')}:${timeOnlyMatch[2]}`;
        }
    }

    // Nếu là ISO string hoặc Date object, parse bằng dayjs
    const parsed = dayjs(timeValue);
    if (parsed.isValid()) {
        return parsed.format('HH:mm');
    }

    return '--:--';
};

// Helper function để parse ngày từ nhiều định dạng, đảm bảo hiển thị đúng theo múi giờ địa phương
const parseDate = (dateValue: any): string => {
    if (!dateValue) return '--/--/----';

    // Thử parse với dayjs - dayjs(dateValue) sẽ parse ISO string và chuyển về local time
    const parsed = dayjs(dateValue);
    if (parsed.isValid()) {
        // Nếu chuỗi chứa 'T', nó có khả năng là ISO/UTC, dayjs sẽ tự chuyển về local
        // Nếu là "YYYY-MM-DD", nó sẽ được coi là đầu ngày ở local
        return parsed.format('DD/MM/YYYY');
    }

    // Fallback cho format YYYY-MM-DD thủ công nếu dayjs fail (hiếm gặp)
    if (typeof dateValue === 'string') {
        const dateOnlyMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
        }
    }

    return '--/--/----';
};

interface ApplicationDetailModalProps {
    applicationId: number | null;
    visible: boolean;
    onClose: () => void;
}

const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
    applicationId,
    visible,
    onClose
}) => {
    const [loading, setLoading] = useState(false);
    const [application, setApplication] = useState<any>(null);

    useEffect(() => {
        if (visible && applicationId) {
            fetchApplicationDetail();
        }
    }, [visible, applicationId]);

    const fetchApplicationDetail = async () => {
        if (!applicationId) return;

        try {
            setLoading(true);
            const response = await applicationService.getApplicationById(applicationId);
            console.log('Application Detail Response:', response.data);
            console.log('Application Type:', response.data.type);
            console.log('Application Data:', response.data.data);
            setApplication(response.data);
        } catch (error: any) {
            console.error('Error fetching application detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderApplicationContent = () => {
        if (!application) return null;

        const { type, data } = application;

        switch (type) {
            case 'leave':
                return renderLeaveApplication(data);
            case 'overtime':
                return renderOvertimeApplication(data);
            case 'business-trip':
            case 'business_trip':
                return renderBusinessTripApplication(data);
            case 'forgot-check':
                return renderForgotCheckApplication(data);
            case 'resignation':
                return renderResignationApplication(data);
            case 'shift-registration':
                return renderShiftRegistrationApplication(data);
            default:
                return <Paragraph>Không có thông tin chi tiết</Paragraph>;
        }
    };

    const renderLeaveApplication = (data: any) => (
        <>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={<Text><CalendarOutlined /> Ngày bắt đầu</Text>}>
                    <Text strong>{parseDate(data.startDate)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><CalendarOutlined /> Ngày kết thúc</Text>}>
                    <Text strong>{parseDate(data.endDate)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><ClockCircleOutlined /> Loại đơn</Text>}>
                    <Tag icon={<PushpinOutlined />} color={data.applicationCategory === 'leave' || data.applicationCategory === 'paid' ? 'blue' : 'orange'}>
                        {data.applicationCategory === 'leave' || data.applicationCategory === 'paid' ? 'Nghỉ phép (Lương)' : 'Nghỉ thường (K.Lương)'}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<Text>Số ngày nghỉ</Text>}>
                    <Text strong>
                        {data.startDate && data.endDate
                            ? dayjs(data.endDate).diff(dayjs(data.startDate), 'day') + 1
                            : 0} ngày
                    </Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><FileTextOutlined /> Lý do</Text>}>
                    <Paragraph style={{ marginBottom: 0 }}>{data.reason || '-'}</Paragraph>
                </Descriptions.Item>
            </Descriptions>
        </>
    );

    const renderOvertimeApplication = (data: any) => (
        <>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={<Text><CalendarOutlined /> Ngày tăng ca</Text>}>
                    <Text strong>{parseDate(data.overtimeDate || data.date)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><ClockCircleOutlined /> Giờ bắt đầu tăng ca</Text>}>
                    <Text strong>{parseTime(data.startTime)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><ClockCircleOutlined /> Số giờ tăng ca</Text>}>
                    <Text strong>{data.overtimeHours} giờ</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><FileTextOutlined /> Lý do</Text>}>
                    <Paragraph style={{ marginBottom: 0 }}>{data.reason || '-'}</Paragraph>
                </Descriptions.Item>
            </Descriptions>
        </>
    );

    const renderBusinessTripApplication = (data: any) => (
        <>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={<Text><CalendarOutlined /> Ngày bắt đầu</Text>}>
                    <Text strong>{parseDate(data.startDate)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><CalendarOutlined /> Ngày kết thúc</Text>}>
                    <Text strong>{parseDate(data.endDate)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><EnvironmentOutlined /> Địa điểm</Text>}>
                    <Text strong>{data.destination}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><DollarOutlined /> Chi phí dự kiến</Text>}>
                    <Text strong type="danger">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.estimatedCost || 0)}
                    </Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><FileTextOutlined /> Mục đích</Text>}>
                    <Paragraph style={{ marginBottom: 0 }}>{data.purpose || '-'}</Paragraph>
                </Descriptions.Item>
            </Descriptions>

            {data.evidence && data.evidence.length > 0 && (
                <>
                    <Divider orientation="left">
                        <Text strong><FileImageOutlined /> Bằng chứng đính kèm</Text>
                    </Divider>
                    <Space wrap size="middle">
                        {data.evidence.map((file: any, index: number) => (
                            <Card
                                key={index}
                                hoverable
                                size="small"
                                style={{ width: 150 }}
                                cover={
                                    file.mimetype?.startsWith('image/') ? (
                                        <Image
                                            src={`${process.env.NEXT_PUBLIC_API_GATEWAY_URL || ''}${file.path}`}
                                            alt={file.originalName}
                                            style={{ height: 100, objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                                            <FileTextOutlined style={{ fontSize: 32, color: '#999' }} />
                                        </div>
                                    )
                                }
                            >
                                <Card.Meta
                                    description={
                                        <Text ellipsis style={{ fontSize: 11 }}>
                                            {file.originalName}
                                        </Text>
                                    }
                                />
                            </Card>
                        ))}
                    </Space>
                </>
            )}
        </>
    );

    const renderForgotCheckApplication = (data: any) => {
        console.log('Rendering Forgot Check-In with data:', data);

        return (
            <>
                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label={<Text><CalendarOutlined /> Ngày quên check</Text>}>
                        <Text strong>{data.forgotDate ? dayjs(data.forgotDate).format('DD/MM/YYYY') : 'N/A'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text><ClockCircleOutlined /> Giờ quên check</Text>}>
                        <Text strong>{data.forgotTime || 'N/A'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text><CheckCircleOutlined /> Loại quên check</Text>}>
                        <Tag color={data.forgotType === 'check-in' ? 'blue' : 'orange'}>
                            {FORGOT_CHECK_TYPE_LABELS[data.forgotType as keyof typeof FORGOT_CHECK_TYPE_LABELS] || data.forgotType || 'N/A'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text><FileTextOutlined /> Lý do</Text>}>
                        <Paragraph style={{ marginBottom: 0 }}>{data.reason || '-'}</Paragraph>
                    </Descriptions.Item>
                </Descriptions>

                {data.evidence && data.evidence.length > 0 && (
                    <>
                        <Divider orientation="left">
                            <Text strong><FileImageOutlined /> Bằng chứng đính kèm</Text>
                        </Divider>
                        <Space wrap size="middle">
                            {data.evidence.map((file: any, index: number) => (
                                <Card
                                    key={index}
                                    hoverable
                                    size="small"
                                    style={{ width: 150 }}
                                    cover={
                                        file.mimetype?.startsWith('image/') ? (
                                            <Image
                                                src={`${process.env.NEXT_PUBLIC_API_GATEWAY_URL || ''}${file.path}`}
                                                alt={file.originalName}
                                                style={{ height: 100, objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                                                <FileTextOutlined style={{ fontSize: 32, color: '#999' }} />
                                            </div>
                                        )
                                    }
                                >
                                    <Card.Meta
                                        description={
                                            <Text ellipsis style={{ fontSize: 11 }}>
                                                {file.originalName}
                                            </Text>
                                        }
                                    />
                                </Card>
                            ))}
                        </Space>
                    </>
                )}
            </>
        );
    };

    const renderResignationApplication = (data: any) => (
        <>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={<Text><CalendarOutlined /> Ngày làm việc cuối</Text>}>
                    <Text strong type="danger">{parseDate(data.lastWorkingDate)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text><FileTextOutlined /> Lý do thôi việc</Text>}>
                    <Text>{data.resignationReason || '-'}</Text>
                </Descriptions.Item>
                {data.additionalDetails && (
                    <Descriptions.Item label={<Text>Chi tiết bổ sung</Text>}>
                        <Paragraph style={{ marginBottom: 0 }}>{data.additionalDetails}</Paragraph>
                    </Descriptions.Item>
                )}
            </Descriptions>

            <Divider orientation="left">
                <Text strong><UserOutlined /> Thông tin bàn giao</Text>
            </Divider>

            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={<Text>Bàn giao cho</Text>}>
                    <Text strong>{data.handoverTo || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text>Trạng thái</Text>}>
                    {data.handoverCompleted ? (
                        <Tag color="success" icon={<CheckCircleOutlined />}>Đã hoàn thành</Tag>
                    ) : (
                        <Tag color="warning" icon={<CloseCircleOutlined />}>Chưa hoàn thành</Tag>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label={<Text>Nội dung bàn giao</Text>}>
                    <Paragraph style={{ marginBottom: 0 }}>{data.handoverNotes || '-'}</Paragraph>
                </Descriptions.Item>
            </Descriptions>
        </>
    );

    const renderShiftRegistrationApplication = (data: any) => (
        <>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={<Text><CalendarOutlined /> Danh sách ca đăng ký</Text>}>
                    {data.requestedDates && data.requestedDates.length > 0 ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {data.requestedDates.map((item: any, index: number) => (
                                <Card key={index} size="small" style={{ background: '#f9f9f9' }}>
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Text strong>{parseDate(item.date)}</Text>
                                        </Col>
                                        <Col span={16}>
                                            <Space wrap>
                                                {item.shifts.map((shift: string, idx: number) => (
                                                    <Tag key={idx} color="blue">{shift}</Tag>
                                                ))}
                                            </Space>
                                        </Col>
                                    </Row>
                                    {item.note && (
                                        <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                                            <Text type="secondary">Ghi chú: {item.note}</Text>
                                        </Paragraph>
                                    )}
                                </Card>
                            ))}
                        </Space>
                    ) : (
                        <Text type="secondary">Không có thông tin</Text>
                    )}
                </Descriptions.Item>
            </Descriptions>
        </>
    );

    return (
        <Modal
            title={
                <div style={{ textAlign: 'center', borderBottom: '2px solid #1890ff', paddingBottom: 16 }}>
                    <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                        CHI TIẾT ĐỀ NGHỊ
                    </Title>
                    <Text type="secondary">
                        ----- {application && APPLICATION_TYPE_LABELS[application.type as keyof typeof APPLICATION_TYPE_LABELS]} -----
                    </Text>
                </div>
            }
            open={visible}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="close" onClick={onClose}>
                    Đóng
                </Button>
            ]}
            style={{ top: 20 }}
        >
            <Spin spinning={loading}>
                {application && (
                    <div style={{ padding: '16px 0' }}>
                        {/* Header Info */}
                        <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary">Người tạo đơn</Text>
                                        <Text strong style={{ fontSize: 16 }}>
                                            {application.userInfo?.fullName || 'N/A'}
                                        </Text>
                                    </Space>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary">Trạng thái</Text>
                                        <Tag
                                            color={APPLICATION_STATUS_COLORS[application.status as keyof typeof APPLICATION_STATUS_COLORS]}
                                            style={{ fontSize: 14, padding: '4px 12px' }}
                                        >
                                            {APPLICATION_STATUS_LABELS[application.status as keyof typeof APPLICATION_STATUS_LABELS]}
                                        </Tag>
                                    </Space>
                                </Col>
                                {application.approvedDate && (
                                    <>
                                        <Col xs={24} sm={12}>
                                            <Space direction="vertical" size={0}>
                                                <Text type="secondary">Người duyệt</Text>
                                                <Text>{application.approvedByInfo?.fullName?.trim() || 'N/A'}</Text>
                                            </Space>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Space direction="vertical" size={0}>
                                                <Text type="secondary">Ngày duyệt</Text>
                                                <Text>{dayjs(application.approvedDate).format('DD/MM/YYYY HH:mm')}</Text>
                                            </Space>
                                        </Col>
                                    </>
                                )}
                                <Col xs={24} sm={12}>
                                    <Space direction="vertical" size={0}>
                                        <Text type="secondary">Ngày tạo</Text>
                                        <Text>{dayjs(application.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>

                        <Divider orientation="left">
                            <Text strong style={{ fontSize: 16 }}>
                                <FileTextOutlined /> Nội dung đơn
                            </Text>
                        </Divider>

                        {/* Application Content */}
                        {renderApplicationContent()}

                    </div>
                )}
            </Spin>
        </Modal>
    );
};

export default ApplicationDetailModal;

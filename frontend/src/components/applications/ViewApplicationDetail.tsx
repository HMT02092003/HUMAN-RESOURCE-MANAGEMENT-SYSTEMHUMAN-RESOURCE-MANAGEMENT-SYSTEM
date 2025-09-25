'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Divider,
  message,
  Row,
  Col,
  Badge,
  Alert,
  Spin,
  Timeline,
  Tag,
  Typography,
  Image,
  Steps,
  Table
} from 'antd';
import { 
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { mockApplicationService as applicationService } from '@/service/mockApplicationService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface ViewApplicationDetailProps {
  applicationId: string;
}

const ViewApplicationDetail: React.FC<ViewApplicationDetailProps> = ({ applicationId }) => {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const router = useRouter();

  const applicationTypeOptions = [
    { value: 'leave', label: 'Đơn xin nghỉ', icon: '🏠', color: '#52c41a' },
    { value: 'shift_registration', label: 'Đơn đăng ký ca', icon: '📅', color: '#1890ff' },
    { value: 'checkout', label: 'Đơn check-out sớm', icon: '🚪', color: '#fa541c' },
    { value: 'shift_change', label: 'Đơn đổi ca', icon: '🔄', color: '#722ed1' },
    { value: 'increased_hours', label: 'Đơn tăng ca', icon: '⏰', color: '#eb2f96' },
    { value: 'business_trip', label: 'Đơn công tác', icon: '✈️', color: '#13c2c2' },
    { value: 'resignation', label: 'Đơn thôi việc', icon: '📋', color: '#fa8c16' },
  ];

  const leaveTypeLabels: Record<string, string> = {
    'sick': 'Nghỉ ốm',
    'personal': 'Nghỉ cá nhân',
    'vacation': 'Nghỉ phép',
    'maternity': 'Nghỉ thai sản',
    'emergency': 'Nghỉ khẩn cấp',
  };

  const transportationLabels: Record<string, string> = {
    'flight': 'Máy bay',
    'car': 'Ô tô',
    'train': 'Tàu hỏa',
    'other': 'Khác',
  };

  // Fetch application data
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setLoading(true);
        const data = await applicationService.getApplicationById(parseInt(applicationId));
        setApplication(data);
      } catch (error) {
        message.error('Không thể tải thông tin đơn từ');
        router.push('/applications');
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId, router]);

  const handleBack = () => {
    router.push('/applications');
  };

  const handleEdit = () => {
    router.push(`/applications/edit/${applicationId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge status="success" text="Đã duyệt" />;
      case 'rejected':
        return <Badge status="error" text="Từ chối" />;
      default:
        return <Badge status="processing" text="Chờ duyệt" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#52c41a';
      case 'rejected':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  const getApplicationTypeInfo = (type: string) => {
    return applicationTypeOptions.find(option => option.value === type) || 
           { label: type, icon: '📄', color: '#666' };
  };

  const getCurrentStep = (status: string) => {
    switch (status) {
      case 'approved':
        return 2;
      case 'rejected':
        return 2;
      default:
        return 1;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const renderDetailContent = () => {
    if (!application) return null;

    switch (application.applicationType) {
      case 'leave':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={<><TagOutlined /> Loại nghỉ</>}>
              <Tag color="blue">{leaveTypeLabels[application.leaveType] || application.leaveType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined /> Thời gian nghỉ</>}>
              {dayjs(application.startDate).format('DD/MM/YYYY')} - {dayjs(application.endDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng số ngày nghỉ">
              <Text strong>{application.totalDays} ngày</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tệp đính kèm">
              {application.attachments ? (
                <Button size="small" type="link" icon={<FileTextOutlined />}>
                  Xem tệp đính kèm
                </Button>
              ) : (
                <Text type="secondary">Không có</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        );

      case 'shift_registration':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={<><CalendarOutlined /> Ngày đăng ký</>}>
              {dayjs(application.requestedDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Ca làm việc ưu tiên">
              <Tag color="green">{application.preferredShift}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="ID ca làm việc">
              <Text code>{application.shiftId}</Text>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'checkout':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={<><CalendarOutlined /> Ngày check-out</>}>
              {dayjs(application.checkoutDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Giờ check-out">
              <Tag color="orange">{application.checkoutTime}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Giờ dự kiến quay lại">
              {application.plannedReturnTime ? (
                <Tag color="blue">{application.plannedReturnTime}</Tag>
              ) : (
                <Text type="secondary">Không xác định</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Lý do check-out sớm">
              <Paragraph ellipsis={{ rows: 2, expandable: true }}>
                {application.earlyCheckoutReason}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'shift_change':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Ca hiện tại">
              <Text code>ID: {application.currentShiftId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ca muốn đổi">
              <Text code>ID: {application.requestedShiftId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined /> Ngày đổi ca</>}>
              {dayjs(application.changeDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Đổi ca với nhân viên">
              {application.exchangeWithEmployee ? (
                <Text code>ID: {application.exchangeWithEmployee}</Text>
              ) : (
                <Text type="secondary">Không xác định</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        );

      case 'increased_hours':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={<><CalendarOutlined /> Ngày áp dụng</>}>
              {dayjs(application.effectiveDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian áp dụng">
              <Tag color="purple">{application.duration} tháng</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Giờ làm hiện tại">
              <Text strong>{application.currentWorkingHours} giờ/ngày</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Giờ làm mong muốn">
              <Text strong color="red">{application.requestedWorkingHours} giờ/ngày</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tăng thêm" span={2}>
              <Tag color="red">+{application.requestedWorkingHours - application.currentWorkingHours} giờ/ngày</Tag>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'business_trip':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={<><EnvironmentOutlined /> Địa điểm</>}>
              <Tag color="geekblue">{application.destination}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined /> Thời gian</>}>
              {dayjs(application.startDate).format('DD/MM/YYYY')} - {dayjs(application.endDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Mục đích" span={2}>
              <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                {application.purpose}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label={<><DollarOutlined /> Chi phí ước tính</>}>
              {application.estimatedCost ? (
                <Text strong>{formatCurrency(application.estimatedCost)}</Text>
              ) : (
                <Text type="secondary">Chưa ước tính</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={<><CarOutlined /> Phương tiện</>}>
              <Tag color="cyan">{transportationLabels[application.transportationMode] || application.transportationMode}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Cần chỗ ở">
              <Tag color={application.accommodationNeeded ? 'green' : 'default'}>
                {application.accommodationNeeded ? 'Có' : 'Không'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'resignation':
        return (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={<><CalendarOutlined /> Ngày làm việc cuối</>}>
              {dayjs(application.lastWorkingDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian báo trước">
              <Tag color="orange">{application.noticePeriod} ngày</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Lý do thôi việc" span={2}>
              <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                {application.resignationReason}
              </Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú bàn giao" span={2}>
              {application.handoverNotes ? (
                <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                  {application.handoverNotes}
                </Paragraph>
              ) : (
                <Text type="secondary">Không có ghi chú</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Phỏng vấn thôi việc">
              <Tag color={application.exitInterviewScheduled ? 'green' : 'default'}>
                {application.exitInterviewScheduled ? 'Đã lên lịch' : 'Chưa lên lịch'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        );

      default:
        return null;
    }
  };

  const renderTimeline = () => {
    const timelineItems = [
      {
        color: '#1890ff',
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong>Đơn từ được tạo</Text>
            <br />
            <Text type="secondary">{dayjs(application.applicationDate).format('DD/MM/YYYY HH:mm')}</Text>
            <br />
            <Text>Bởi: {application.employeeName}</Text>
          </div>
        ),
      },
    ];

    if (application.status === 'approved') {
      timelineItems.push({
        color: '#52c41a',
        dot: <CheckCircleOutlined />,
        children: (
          <div>
            <Text strong>Đơn từ được duyệt</Text>
            <br />
            <Text type="secondary">
              {application.approvedDate ? dayjs(application.approvedDate).format('DD/MM/YYYY HH:mm') : 'Chưa xác định'}
            </Text>
            <br />
            <Text>Bởi: {application.approvedBy || 'Quản lý'}</Text>
          </div>
        ),
      });
    } else if (application.status === 'rejected') {
      timelineItems.push({
        color: '#ff4d4f',
        dot: <CloseCircleOutlined />,
        children: (
          <div>
            <Text strong>Đơn từ bị từ chối</Text>
            <br />
            <Text type="secondary">
              {application.rejectedDate ? dayjs(application.rejectedDate).format('DD/MM/YYYY HH:mm') : 'Chưa xác định'}
            </Text>
            <br />
            <Text>Bởi: {application.rejectedBy || 'Quản lý'}</Text>
            {application.rejectedReason && (
              <>
                <br />
                <Text type="danger">Lý do: {application.rejectedReason}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    return <Timeline items={timelineItems} />;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Đang tải thông tin đơn từ..." />
      </div>
    );
  }

  if (!application) {
    return (
      <Alert
        message="Không tìm thấy đơn từ"
        description="Đơn từ bạn đang tìm không tồn tại hoặc đã bị xóa."
        type="error"
        showIcon
        action={
          <Button size="small" onClick={handleBack}>
            Quay lại danh sách
          </Button>
        }
      />
    );
  }

  const typeInfo = getApplicationTypeInfo(application.applicationType);

  return (
    <div className="view-application-detail">
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleBack}
        style={{ marginBottom: 16 }}
      >
        Quay lại danh sách
      </Button>

      {/* Header Card */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="large">
              <div style={{ fontSize: '24px' }}>{typeInfo.icon}</div>
              <div>
                <Title level={4} style={{ margin: 0, color: typeInfo.color }}>
                  {typeInfo.label}
                </Title>
                <Text type="secondary">Mã đơn: #{application.id.toString().padStart(6, '0')}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              {getStatusBadge(application.status)}
              {application.status === 'pending' && (
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  Chỉnh sửa
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* Main Content */}
        <Col span={16}>
          <Card title="Thông tin nhân viên" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label={<><UserOutlined /> Tên nhân viên</>}>
                <Text strong>{application.employeeName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phòng ban">
                <Tag color="blue">{application.employeeDepartment}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Mã nhân viên">
                <Text code>{application.employeeId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo đơn">
                {dayjs(application.applicationDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Lý do đơn từ" style={{ marginBottom: 16 }}>
            <Paragraph ellipsis={{ rows: 4, expandable: true }}>
              {application.reason}
            </Paragraph>
          </Card>

          <Card title="Chi tiết đơn từ">
            {renderDetailContent()}
          </Card>
        </Col>

        {/* Sidebar */}
        <Col span={8}>
          <Card title="Trạng thái xử lý" style={{ marginBottom: 16 }}>
            <Steps
              current={getCurrentStep(application.status)}
              direction="vertical"
              size="small"
            >
              <Step 
                title="Đã tạo đơn" 
                description={dayjs(application.applicationDate).format('DD/MM/YYYY HH:mm')}
                icon={<FileTextOutlined />}
              />
              <Step 
                title="Đang xử lý" 
                description="Chờ phê duyệt từ quản lý"
                icon={<ClockCircleOutlined />}
              />
              <Step 
                title={application.status === 'approved' ? 'Đã duyệt' : application.status === 'rejected' ? 'Từ chối' : 'Hoàn thành'} 
                description={
                  application.status === 'approved' 
                    ? `Duyệt lúc ${application.approvedDate ? dayjs(application.approvedDate).format('DD/MM/YYYY') : 'N/A'}`
                    : application.status === 'rejected'
                    ? `Từ chối lúc ${application.rejectedDate ? dayjs(application.rejectedDate).format('DD/MM/YYYY') : 'N/A'}`
                    : 'Chờ xử lý'
                }
                icon={
                  application.status === 'approved' ? <CheckCircleOutlined /> : 
                  application.status === 'rejected' ? <CloseCircleOutlined /> : 
                  <ClockCircleOutlined />
                }
              />
            </Steps>
          </Card>

          <Card title="Lịch sử xử lý">
            {renderTimeline()}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ViewApplicationDetail;

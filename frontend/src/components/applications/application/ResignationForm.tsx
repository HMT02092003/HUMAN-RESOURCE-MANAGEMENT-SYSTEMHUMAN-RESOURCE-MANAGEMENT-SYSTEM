import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Checkbox,
  Select,
  Divider,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  RollbackOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ResignationApplication } from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ResignationFormProps {
  onSubmit: (
    data: Omit<ResignationApplication, 'id' | 'status' | 'applicationDate'>
  ) => void;
  onCancel: () => void;
}

const ResignationForm: React.FC<ResignationFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [lastWorkingDate, setLastWorkingDate] = useState<dayjs.Dayjs | null>(
    null
  );

  const handleSubmit = (values: any) => {
    onSubmit({
      applicationType: 'resignation',
      lastWorkingDate: values.lastWorkingDate.format('YYYY-MM-DD'),
      resignationReason: values.resignationReason,
      handoverTo: values.handoverTo,
      handoverNotes: values.handoverNotes,
      handoverCompleted: values.handoverCompleted || false,
    } as Omit<ResignationApplication, 'id' | 'status' | 'applicationDate'>);
  };

  const calculateNoticeDays = () => {
    if (!lastWorkingDate) return 0;
    return lastWorkingDate.diff(dayjs(), 'day');
  };

  const resignationReasons = [
    'Cơ hội phát triển nghề nghiệp tốt hơn',
    'Mức lương không phù hợp',
    'Môi trường làm việc không phù hợp',
    'Lý do cá nhân/gia đình',
    'Chuyển đổi ngành nghề',
    'Học tập/nâng cao trình độ',
    'Sức khỏe',
    'Khác',
  ];

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      {/* Hướng dẫn */}
      <ApplicationGuide type="resignation" />
      
      <Alert
        message="Cảnh báo quan trọng"
        description="Đơn thôi việc là quyết định quan trọng ảnh hưởng đến sự nghiệp. Vui lòng cân nhắc kỹ trước khi gửi."
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          handoverCompleted: false,
        }}
      >
        <Row gutter={24}>
          {/* Last Working Date */}
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <CalendarOutlined style={{ marginRight: 8, color: '#dc2626' }} />
                  Ngày làm việc cuối cùng
                </Text>
              }
              name="lastWorkingDate"
              rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ việc!' }]}
            >
              <DatePicker
                size="large"
                placeholder="Chọn ngày"
                disabledDate={(current) =>
                  current && current < dayjs().add(7, 'day')
                }
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                onChange={(date) => setLastWorkingDate(date as dayjs.Dayjs)}
              />
            </Form.Item>
          </Col>

          {/* Notice Period */}
          <Col xs={24} md={12}>
            <Form.Item label={<Text strong>Thời gian báo trước</Text>}>
              <Input
                size="large"
                value={
                  calculateNoticeDays() > 0
                    ? `${calculateNoticeDays()} ngày`
                    : 'Chưa đủ thời gian báo trước'
                }
                readOnly
                prefix={<CalendarOutlined />}
                style={{
                  border:
                    calculateNoticeDays() < 30 && calculateNoticeDays() > 0
                      ? '1px solid #f97316'
                      : '1px solid #22c55e',
                  backgroundColor:
                    calculateNoticeDays() < 30 && calculateNoticeDays() > 0
                      ? '#fff7ed'
                      : '#f0fdf4',
                }}
              />
              {calculateNoticeDays() < 30 && calculateNoticeDays() > 0 && (
                <Text type="warning" style={{ fontSize: 12 }}>
                  ⚠️ Khuyến khích báo trước ít nhất 30 ngày
                </Text>
              )}
            </Form.Item>
          </Col>
        </Row>

        {/* Reason */}
        <Form.Item
          label={
            <Text strong>
              <FileTextOutlined style={{ marginRight: 8, color: '#2563eb' }} />
              Lý do thôi việc
            </Text>
          }
          name="resignationReason"
          rules={[{ required: true, message: 'Vui lòng chọn lý do thôi việc!' }]}
        >
          <Select size="large" placeholder="Chọn lý do chính" allowClear>
            {resignationReasons.map((reason) => (
              <Option key={reason} value={reason}>
                {reason}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Additional Details */}
        <Form.Item
          label={<Text strong>📝 Chi tiết bổ sung (tùy chọn)</Text>}
          name="additionalDetails"
        >
          <TextArea
            placeholder="Mô tả thêm về lý do thôi việc, góp ý cải thiện..."
            rows={3}
            showCount
            maxLength={300}
            size="large"
          />
        </Form.Item>

        {/* Handover Section */}
        <Divider orientation="left">
          <Text strong style={{ color: '#374151' }}>
            <TeamOutlined style={{ marginRight: 8, color: '#16a34a' }} />
            Thông tin bàn giao
          </Text>
        </Divider>

        <Row gutter={24}>
          {/* Handover To */}
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <UserOutlined style={{ marginRight: 8, color: '#9333ea' }} />
                  Bàn giao cho ai
                </Text>
              }
              name="handoverTo"
              rules={[
                { required: true, message: 'Vui lòng nhập người nhận bàn giao!' },
                { min: 2, message: 'Tên người nhận phải có ít nhất 2 ký tự!' },
              ]}
            >
              <Input
                size="large"
                placeholder="Tên đồng nghiệp hoặc người thay thế"
                prefix={<UserOutlined />}
              />
            </Form.Item>
          </Col>

          {/* Handover Status */}
          <Col xs={24} md={12}>
            <Form.Item
              label={<Text strong>Trạng thái bàn giao</Text>}
              name="handoverCompleted"
              valuePropName="checked"
            >
              <Checkbox>Đã hoàn thành bàn giao công việc</Checkbox>
            </Form.Item>
          </Col>
        </Row>

        {/* Handover Notes */}
        <Form.Item
          label={<Text strong>📋 Nội dung bàn giao chi tiết</Text>}
          name="handoverNotes"
          rules={[
            { required: true, message: 'Vui lòng mô tả nội dung bàn giao!' },
            { min: 50, message: 'Nội dung bàn giao phải có ít nhất 50 ký tự!' },
          ]}
        >
          <TextArea
            placeholder="Mô tả chi tiết các dự án, tài liệu cần bàn giao..."
            rows={5}
            showCount
            maxLength={800}
            size="large"
          />
        </Form.Item>

        {/* Reminders */}
        <Alert
          message="Checklist trước khi thôi việc"
          description={
            <ul style={{ marginTop: 8, paddingLeft: 20, color: '#374151' }}>
              <li>✅ Hoàn thành tất cả dự án/nhiệm vụ đang thực hiện</li>
              <li>✅ Bàn giao đầy đủ tài liệu, thông tin công việc</li>
              <li>✅ Trả lại tất cả tài sản công ty (laptop, chìa khóa, thẻ...)</li>
              <li>✅ Cập nhật thông tin liên hệ với đồng nghiệp quan trọng</li>
              <li>✅ Xóa dữ liệu cá nhân khỏi thiết bị công ty</li>
              <li>✅ Hoàn thành thủ tục hành chính với phòng nhân sự</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />

        {/* Final Warning */}
        <Alert
          message="Lưu ý cuối cùng"
          description="Sau khi gửi đơn, bạn sẽ không thể hủy bỏ. Hãy chắc chắn về quyết định của mình và đã thảo luận với gia đình/người thân."
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />

        {/* Actions */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              size="large"
              onClick={onCancel}
              icon={<RollbackOutlined />}
              style={{
                borderRadius: 8,
              }}
            >
              Trở lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
              danger
              style={{
                borderRadius: 8,
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
              }}
            >
              Lưu
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ResignationForm;

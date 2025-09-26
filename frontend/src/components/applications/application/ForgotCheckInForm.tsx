import React from 'react';
import { Card, Form, Input, DatePicker, TimePicker, Button, Space, Typography, Alert, Row, Col } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, CheckOutlined, CloseOutlined, ExclamationCircleOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ForgotCheckInApplication } from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

const { Text } = Typography;
const { TextArea } = Input;

interface ForgotCheckInFormProps {
  onSubmit: (data: Omit<ForgotCheckInApplication, 'id' | 'status' | 'applicationDate'>) => void;
  onCancel: () => void;
}

const ForgotCheckInForm: React.FC<ForgotCheckInFormProps> = ({ onSubmit, onCancel }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSubmit({
      applicationType: 'forgot_checkin',
      forgotDate: values.forgotDate.format('YYYY-MM-DD'),
      forgotTime: values.forgotTime.format('HH:mm'),
      reason: values.reason,
    } as Omit<ForgotCheckInApplication, 'id' | 'status' | 'applicationDate'>);
  };

  return (
    <div
      title="Đơn giải trình quên chấm công"
      style={{ maxWidth: 900, margin: '0 auto' }}
    >
      {/* Hướng dẫn */}
      <ApplicationGuide type="forgot-checkin" />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          {/* Forgot Date */}
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  Ngày quên check
                </Text>
              }
              name="forgotDate"
              rules={[{ required: true, message: 'Vui lòng chọn ngày quên check!' }]}
            >
              <DatePicker
                placeholder="Chọn ngày"
                disabledDate={(current) => current && current > dayjs().startOf('day')}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          {/* Forgot Time */}
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <ClockCircleOutlined style={{ marginRight: 6 }} />
                  Thời gian quên check
                </Text>
              }
              name="forgotTime"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}
            >
              <TimePicker
                placeholder="Chọn giờ"
                format="HH:mm"
                showSecond={false}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Reason */}
        <Form.Item
          label={<Text strong>📝 Lý do quên check và giải trình</Text>}
          name="reason"
          rules={[
            { required: true, message: 'Vui lòng nhập lý do quên check!' },
            { min: 20, message: 'Lý do phải có ít nhất 20 ký tự để giải trình rõ ràng!' }
          ]}
        >
          <TextArea
            placeholder="Ví dụ: Quên check do phải xử lý tình huống khẩn cấp, họp gấp hoặc sự cố kỹ thuật..."
            rows={4}
            showCount
            maxLength={500}
            size="large"
          />
        </Form.Item>

        {/* Alert policies */}
        <Alert
          message="Chính sách quên chấm công"
          description={
            <div style={{ marginTop: 8 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>Chỉ được phép quên chấm công tối đa 2 lần/tháng</li>
                <li>Đơn phải được gửi trong vòng 3 ngày kể từ ngày quên check</li>
                <li>Cần có bằng chứng minh họa (email, tin nhắn, ảnh...) nếu có thể</li>
              </ul>
            </div>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Alert
          message="Mẹo nhỏ để không quên chấm công"
          description="Đặt nhắc nhở trên điện thoại, dán sticker trên bàn làm việc, hoặc tạo thói quen check ngay khi vào/ra văn phòng."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Buttons */}
        <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
          <Space size="middle">
            <Button
              size="large"
              onClick={onCancel}
              icon={<RollbackOutlined />}
            >
              Trở lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
            >
              Lưu
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ForgotCheckInForm;

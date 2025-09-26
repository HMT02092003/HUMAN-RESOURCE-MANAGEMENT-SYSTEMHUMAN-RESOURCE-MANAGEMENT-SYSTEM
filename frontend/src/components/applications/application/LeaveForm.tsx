import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Statistic,
  Divider,
} from 'antd';
import { RollbackOutlined, SaveOutlined } from '@ant-design/icons';
import type { GetProps, DatePickerProps } from 'antd';
import dayjs from 'dayjs';
import { LeaveApplication } from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;
type DatePickerValue = DatePickerProps['value'];

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface LeaveApplicationFormProps {
  onSubmit: (data: Omit<LeaveApplication, 'id' | 'status' | 'applicationDate'>) => void;
  onCancel: () => void;
  totalLeaveDays?: number; // tổng số ngày phép ban đầu (lấy từ API)
}

const LeaveForm: React.FC<LeaveApplicationFormProps> = ({
  onSubmit,
  onCancel,
  totalLeaveDays = 12,
}) => {
  const [form] = Form.useForm();
  const [startDate, setStartDate] = useState<DatePickerValue>(null);
  const [endDate, setEndDate] = useState<DatePickerValue>(null);

  const calculateDays = () => {
    if (startDate && endDate) {
      return endDate.diff(startDate, 'day') + 1;
    }
    return 0;
  };

  const usedDays = calculateDays();
  const remainingDays = Math.max(totalLeaveDays - usedDays, 0);

  const handleSubmit = (values: any) => {
    const [start, end] = values.dateRange;
    onSubmit({
      applicationType: values.applicationCategory,
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      leaveType: values.leaveType,
      reason: values.reason,
    });
  };

  const disabledDate: RangePickerProps['disabledDate'] = (current) => {
    return current && current < dayjs().startOf('day'); // không cho chọn ngày quá khứ
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hướng dẫn */}
      <ApplicationGuide type="leave" />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        {/* Loại đơn + Số phép còn lại */}
        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="applicationCategory"
              label={<Text strong>Loại đơn</Text>}
              rules={[{ required: true, message: 'Vui lòng chọn loại đơn!' }]}
            >
              <Select
                placeholder="Chọn loại đơn"
                options={[
                  { value: 'leave', label: '📝 Nghỉ phép' },
                  { value: 'regular', label: '📌 Nghỉ thường' },
                  { value: 'maternity', label: '👶 Nghỉ thai sản' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Card
              style={{
                borderRadius: 8,
                background: '#f6f9ff',
                textAlign: 'center',
              }}
            >
              <Statistic
                title="Số ngày phép còn lại"
                value={remainingDays}
                suffix={`/ ${totalLeaveDays}`}
                valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: '#1677ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Hình thức nghỉ + Thời gian nghỉ */}
        <Row gutter={24}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="leaveType"
              label={<Text strong>Hình thức nghỉ</Text>}
              rules={[{ required: true, message: 'Vui lòng chọn hình thức nghỉ!' }]}
            >
              <Select
                placeholder="Chọn hình thức nghỉ"
                options={[
                  { value: 'personal', label: '🏠 Nghỉ cá nhân' },
                  { value: 'sick', label: '🤒 Nghỉ ốm' },
                  { value: 'vacation', label: '🎉 Nghỉ lễ/tết' },
                  { value: 'other', label: '🔖 Khác' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="dateRange"
              label={<Text strong>Thời gian nghỉ</Text>}
              rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian nghỉ!' }]}
            >
              <RangePicker
                disabledDate={disabledDate}
                onChange={(dates) => {
                  setStartDate(dates ? dates[0] : null);
                  setEndDate(dates ? dates[1] : null);
                }}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Tổng số ngày nghỉ đã chọn */}
        {usedDays > 0 && (
          <Row style={{ marginBottom: '24px' }}>
            <Col span={24}>
              <Alert
                message={`Tổng số ngày nghỉ đã chọn: ${usedDays} ngày`}
                type="info"
                showIcon
                style={{ borderRadius: 8 }}
              />
            </Col>
          </Row>
        )}

        {/* Lý do nghỉ */}
        <Form.Item
          name="reason"
          label={<Text strong>Lý do nghỉ</Text>}
          rules={[
            { required: true, message: 'Vui lòng nhập lý do nghỉ!' },
            { min: 10, message: 'Lý do phải có ít nhất 10 ký tự!' },
          ]}
        >
          <TextArea
            placeholder="Mô tả chi tiết lý do nghỉ..."
            showCount
            maxLength={500}
            autoSize={{ minRows: 4, maxRows: 6 }}
            style={{ borderRadius: 8, fontSize: 16 }}
          />
        </Form.Item>

        <Divider />

        {/* Nút hành động */}
        <Row justify="center">
          <Space size="large">
            <Button
              size="large"
              onClick={onCancel}
              style={{
                height: 48,
                paddingLeft: 32,
                paddingRight: 32,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              <RollbackOutlined /> Trở lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              style={{
                height: 48,
                paddingLeft: 32,
                paddingRight: 32,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              <SaveOutlined /> Lưu
            </Button>
          </Space>
        </Row>
      </Form>
    </div>
  );
};

export default LeaveForm;

import React, { useState } from 'react';
import { Card, Form, Input, Select, DatePicker, TimePicker, Button, Space, Typography, Alert, Row, Col, Divider } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined, FileTextOutlined, HourglassOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { OvertimeApplication } from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface OvertimeFormProps {
  onSubmit: (data: Omit<OvertimeApplication, 'id' | 'status' | 'applicationDate'>) => void;
  onCancel: () => void;
}

const OvertimeForm: React.FC<OvertimeFormProps> = ({ onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [overtimeHours, setOvertimeHours] = useState<number>(2);

  const handleSubmit = (values: any) => {
    const [startDate, endDate] = values.dateRange || [values.overtimeDate, values.overtimeDate];
    
    onSubmit({
      applicationType: 'overtime',
      overtimeDate: startDate.format('YYYY-MM-DD'),
      overtimeHours: values.overtimeHours,
      startTime: values.startTime.format('HH:mm'),
      reason: values.reason,
    } as Omit<OvertimeApplication, 'id' | 'status' | 'applicationDate'>);
  };

  const calculateEndTime = (start: dayjs.Dayjs | null, hours: number) => {
    if (!start) return '';
    return start.add(hours, 'hour').format('HH:mm');
  };

  const watchStartTime = Form.useWatch('startTime', form);
  const watchOvertimeHours = Form.useWatch('overtimeHours', form);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Hướng dẫn */}
        <ApplicationGuide type="overtime" />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          initialValues={{
            overtimeHours: 2
          }}
        >
          <Row gutter={[24, 16]}>
            {/* Thời gian tăng ca */}
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <Space>
                    <CalendarOutlined />
                    <Text strong>Ngày tăng ca</Text>
                  </Space>
                }
                name="dateRange"
                rules={[{ required: true, message: 'Vui lòng chọn ngày tăng ca!' }]}
              >
                <RangePicker 
                  style={{ width: '100%' }}
                  placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            {/* Giờ bắt đầu tăng ca */}
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <Space>
                    <ClockCircleOutlined />
                    <Text strong>Giờ bắt đầu</Text>
                  </Space>
                }
                name="startTime"
                rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu!' }]}
              >
                <TimePicker 
                  style={{ width: '100%' }}
                  format="HH:mm"
                  placeholder="Chọn giờ bắt đầu"
                  minuteStep={15}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
            {/* Số giờ tăng ca */}
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <Space>
                    <HourglassOutlined />
                    <Text strong>Số giờ tăng ca</Text>
                  </Space>
                }
                name="overtimeHours"
                rules={[
                  { required: true, message: 'Vui lòng chọn số giờ tăng ca!' },
                  { type: 'number', min: 0.5, message: 'Tối thiểu 0.5 giờ!' },
                  { type: 'number', max: 12, message: 'Tối đa 12 giờ!' }
                ]}
              >
                <Select
                  placeholder="Chọn số giờ"
                  onChange={setOvertimeHours}
                  options={[
                    { value: 0.5, label: '0.5 giờ' },
                    { value: 1, label: '1 giờ' },
                    { value: 1.5, label: '1.5 giờ' },
                    { value: 2, label: '2 giờ' },
                    { value: 2.5, label: '2.5 giờ' },
                    { value: 3, label: '3 giờ' },
                    { value: 4, label: '4 giờ' },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* Giờ kết thúc (tự động tính) */}
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <Space>
                    <ClockCircleOutlined />
                    <Text strong>Giờ kết thúc</Text>
                  </Space>
                }
              >
                <Input
                  readOnly
                  value={calculateEndTime(watchStartTime, watchOvertimeHours || 2)}
                  placeholder="Tự động tính toán"
                  style={{ 
                    backgroundColor: '#f5f5f5',
                    color: '#1890ff',
                    fontWeight: 'bold'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Thông tin tóm tắt */}
          {watchStartTime && watchOvertimeHours && (
            <Row style={{ marginBottom: '24px' }}>
              <Col span={24}>
                <Alert
                  message={
                    <Space>
                      <ClockCircleOutlined />
                      <Text>
                        Thời gian: <Text strong style={{ color: '#1890ff' }}>
                          {watchStartTime.format('HH:mm')} - {calculateEndTime(watchStartTime, watchOvertimeHours)}
                        </Text> ({watchOvertimeHours} giờ)
                      </Text>
                    </Space>
                  }
                  type="info"
                  showIcon
                  style={{ borderRadius: '8px' }}
                />
              </Col>
            </Row>
          )}

          <Row gutter={[24, 16]}>
            {/* Lý do tăng ca */}
            <Col span={24}>
              <Form.Item
                label={
                  <Space>
                    <FileTextOutlined />
                    <Text strong>Lý do tăng ca</Text>
                  </Space>
                }
                name="reason"
                rules={[
                  { required: true, message: 'Vui lòng nhập lý do tăng ca!' },
                  { min: 10, message: 'Lý do phải có ít nhất 10 ký tự!' }
                ]}
              >
                <TextArea
                  placeholder="Mô tả chi tiết lý do cần tăng ca, công việc cần hoàn thành..."
                  showCount
                  maxLength={500}
                  autoSize={{ minRows: 4, maxRows: 6 }}
                  style={{
                    borderRadius: '8px',
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* Action buttons */}
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Col>
              <Space size="large">
                <Button
                  size="large"
                  onClick={onCancel}
                  icon={<RollbackOutlined />}
                  style={{
                    height: '48px',
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    borderRadius: '8px',
                  }}
                >
                  Trở lại
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<SaveOutlined />}
                  style={{
                    height: '48px',
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    borderRadius: '8px',
                  }}
                >
                  Lưu
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
    </div>
  );
};

export default OvertimeForm;

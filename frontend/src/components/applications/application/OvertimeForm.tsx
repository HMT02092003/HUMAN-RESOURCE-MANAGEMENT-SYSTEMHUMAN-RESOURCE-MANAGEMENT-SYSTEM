import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, DatePicker, TimePicker, Button, Space, Typography, Alert, Row, Col, Divider, message } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined, FileTextOutlined, HourglassOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ApplicationGuide from '../ApplicationGuide';
import ApplicationService from '@/service/applicationService';
import SettingsService from '@/service/settingsService';
import isBetween from 'dayjs/plugin/isBetween';
import {useRouter} from 'next/navigation';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface OvertimeFormProps {
  onCancel: () => void;
}

const OvertimeForm: React.FC<OvertimeFormProps> = ({ onCancel }) => {
  const [form] = Form.useForm();
  const [overtimeHours, setOvertimeHours] = useState<number>(2);
  const [workingDays, setWorkingDays] = useState<any>(null);
  const [workingHours, setWorkingHours] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchWorkingDays = async () => {
      try {
        const workingDays = await SettingsService.getWorkingDays("WorkingDays");
        const workingHours = await SettingsService.getWorkingDays("WorkingHours");
        setWorkingDays(workingDays.value);
        setWorkingHours(workingHours.value);
      } catch (error) {
        console.error('Error fetching working days:', error);
      }
    };

    fetchWorkingDays();
  }, [form]);

const handleSubmit = async (values: any) => {
    try{
      const dayOfWeek = values.overtimeDate.format('dddd').toLowerCase();
      const startTime = (values.startTime).format('HH:mm');

      const isWorkingDay = workingDays && workingDays[dayOfWeek] === true;

      console.log('isWorkingDay:', isWorkingDay);
      console.log('startTime:', startTime);
      console.log('workingHourStart:', workingHours?.start );
      console.log('workingHourEnd:', workingHours?.end );

      if (isWorkingDay && workingHours?.start && workingHours?.end) {
        const startTime = values.startTime.format('HH:mm');
        const workStart = workingHours.start; 
        const workEnd = workingHours.end; 
        
        if (startTime >= workStart && startTime < workEnd) {
          message.error("Giờ bạn chọn nằm trong giờ hành chính của ngày làm việc. Vui lòng chọn lại giờ ngoài hành chính!");
          return;
        }
      }
      
      await ApplicationService.createApplication({
        type: 'overtime',
        data: { 
          ...values,
        },
      });
      message.success('Gửi đơn tăng ca thành công!');
      router.push('/applications/me');

    }catch(error:any){  
      message.error('Đã có lỗi xảy ra khi gửi đơn. Lỗi: ' + error.message);
    }
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
                name="overtimeDate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày tăng ca!' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
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
                    { value: 2, label: '2 giờ' },
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
                ]}
              >
                <TextArea
                  placeholder="Mô tả chi tiết lý do cần tăng ca, công việc cần hoàn thành..."
                  showCount
                  rows={4}
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

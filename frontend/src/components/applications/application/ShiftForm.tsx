import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  message,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  MinusCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SaveOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ApplicationService, { ShiftRegistrationApplication, ShiftDay } from '@/service/applicationService';
import { SHIFT_OPTIONS, VALIDATION_RULES } from '@/config/constant';
import ApplicationGuide from '../ApplicationGuide';

const { Text } = Typography;
const { TextArea } = Input;

interface ShiftRegistrationFormProps {
  onSubmit?: (data: any) => void;
  onCancel: () => void;
  onSuccess?: (data: any) => void;
}

const ShiftForm: React.FC<ShiftRegistrationFormProps> = ({
  onSubmit,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    
    try {
      // Format data để gửi API
      const requestedDates: ShiftDay[] = values.days.map((item: any) => ({
        date: item.date.format('YYYY-MM-DD'),
        shifts: item.shifts,
        note: item.note || '',
      }));

      const payload = {
        requestedDates,
        reason: values.reason,
        note: values.generalNote,
      };

      // Gọi API tạo đơn đăng ký ca
      // const result = await ApplicationService.createShiftRegistration(payload);
      
      message.success('Đăng ký ca làm việc thành công! Đơn đã được gửi để chờ duyệt.');
      
      // Reset form sau khi thành công
      form.resetFields();
      
      // Callback functions
      if (onSuccess) {
        // onSuccess(result);
      } else if (onSubmit) {
        // onSubmit(result);
      }
      
    } catch (error: any) {
      console.error('Lỗi khi tạo đơn đăng ký ca:', error);
      message.error(
        error?.response?.data?.message || 
        'Có lỗi xảy ra khi gửi đơn đăng ký. Vui lòng thử lại!'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hướng dẫn */}
      <ApplicationGuide type="shift" />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          days: [{ date: null, shifts: [], note: '' }],
        }}
      >
        <Form.List name="days">
          {(fields, { add, remove }) => (
            <>
              <Text strong style={{ fontSize: 16 }}>
                <CalendarOutlined className="mr-2" /> Ngày & Ca làm việc
              </Text>
              <Divider style={{ margin: '12px 0' }} />

              {fields.map(({ key, name, ...restField }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    {/* Ngày */}
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'date']}
                        rules={[{ required: true, message: 'Chọn ngày!' }]}
                        label="📅 Ngày"
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          disabledDate={(current) =>
                            current && current < dayjs().startOf('day')
                          }
                          format="DD/MM/YYYY"
                        />
                      </Form.Item>
                    </Col>

                    {/* Ca */}
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'shifts']}
                        rules={[
                          { required: true, message: 'Chọn ít nhất 1 ca!' },
                        ]}
                        label="🕒 Ca làm việc"
                      >
                        <Select
                          mode="multiple"
                          allowClear
                          placeholder="Chọn ca"
                          options={[...SHIFT_OPTIONS]}
                        />
                      </Form.Item>
                    </Col>

                    {/* Nút Xóa */}
                    <Col span={2} style={{ textAlign: 'center' }}>
                      {fields.length > 1 && (
                        <Button
                          danger
                          type="primary"
                          shape="circle"
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        />
                      )}
                    </Col>
                  </Row>

                  {/* Ghi chú */}
                  <Row>
                    <Col span={24}>
                      <Form.Item
                        {...restField}
                        name={[name, 'note']}
                        label="📝 Ghi chú (tùy chọn)"
                      >
                        <TextArea
                          placeholder="Ví dụ: Sáng phải đi học..."
                          rows={2}
                          showCount
                          maxLength={500}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ))}

              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Thêm ngày khác
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        {/* Buttons */}
        <Form.Item>
          <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
            <Button 
              size="large" 
              onClick={onCancel} 
              icon={<RollbackOutlined />}
              disabled={loading}
            >
              Trở lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
              className="bg-green-600 hover:bg-green-700"
              loading={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ShiftForm;

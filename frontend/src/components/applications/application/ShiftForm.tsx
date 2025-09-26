import React from 'react';
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
import { ShiftRegistrationApplication } from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

const { Text } = Typography;
const { TextArea } = Input;

interface ShiftRegistrationFormProps {
  onSubmit: (
    data: Omit<
      ShiftRegistrationApplication,
      'id' | 'status' | 'applicationDate'
    >
  ) => void;
  onCancel: () => void;
}

const shiftOptions = [
  { value: 'morning', label: '🌅 Ca sáng (6:00 - 14:00)' },
  { value: 'afternoon', label: '🌇 Ca chiều (14:00 - 22:00)' },
  { value: 'night', label: '🌙 Ca đêm (22:00 - 6:00)' },
  { value: 'overtime', label: '⏰ Ca tăng ca' },
];

const ShiftForm: React.FC<ShiftRegistrationFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    const formatted = values.days.map((item: any) => ({
      date: item.date.format('YYYY-MM-DD'),
      shifts: item.shifts,
      note: item.note || '',
    }));

    // onSubmit({
    //   applicationType: 'shift_registration',
    //   requestedDates: formatted,
    //   reason: values.reason,
    // } as Omit<ShiftRegistrationApplication, 'id' | 'status' | 'applicationDate'>);
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
                          options={shiftOptions}
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
                          placeholder="Ví dụ: Sáng phải đi học..."
                          rows={2}
                          maxLength={200}
                          showCount
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

        <Divider />

        {/* Buttons */}
        <Form.Item>
          <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
            <Button size="large" onClick={onCancel} icon={<RollbackOutlined />}>
              Trở lại
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
              className="bg-green-600 hover:bg-green-700"
            >
              Lưu
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ShiftForm;

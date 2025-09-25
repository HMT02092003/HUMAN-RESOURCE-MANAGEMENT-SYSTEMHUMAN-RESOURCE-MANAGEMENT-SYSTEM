'use client';

import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  DatePicker,
  TimePicker,
  InputNumber,
  Upload,
  Button,
  Space,
  Divider,
  message,
  Row,
  Col,
  Switch,
  Steps,
  Badge
} from 'antd';
import { UploadOutlined, PlusOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { mockApplicationService as applicationService } from '@/service/mockApplicationService';
import { ApplicationTypes } from '@/service/applicationService';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Step } = Steps;

interface CreateApplicationFormProps {}

const CreateApplicationForm: React.FC<CreateApplicationFormProps> = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [applicationType, setApplicationType] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const applicationTypeOptions = [
    { value: 'leave', label: 'Đơn xin nghỉ', icon: '🏠', description: 'Xin nghỉ phép, ốm, cá nhân...' },
    { value: 'shift_registration', label: 'Đơn đăng ký ca', icon: '📅', description: 'Đăng ký ca làm việc' },
    { value: 'checkout', label: 'Đơn check-out sớm', icon: '🚪', description: 'Xin phép về sớm' },
    { value: 'shift_change', label: 'Đơn đổi ca', icon: '🔄', description: 'Đổi ca làm việc với đồng nghiệp' },
    { value: 'increased_hours', label: 'Đơn tăng ca', icon: '⏰', description: 'Xin tăng giờ làm việc' },
    { value: 'business_trip', label: 'Đơn công tác', icon: '✈️', description: 'Đi công tác, làm việc tại chi nhánh khác' },
    { value: 'resignation', label: 'Đơn thôi việc', icon: '📋', description: 'Xin thôi việc, nghỉ việc' },
  ];

  const leaveTypeOptions = [
    { value: 'sick', label: 'Nghỉ ốm' },
    { value: 'personal', label: 'Nghỉ cá nhân' },
    { value: 'vacation', label: 'Nghỉ phép' },
    { value: 'maternity', label: 'Nghỉ thai sản' },
    { value: 'emergency', label: 'Nghỉ khẩn cấp' },
  ];

  const transportationOptions = [
    { value: 'flight', label: 'Máy bay' },
    { value: 'car', label: 'Ô tô' },
    { value: 'train', label: 'Tàu hỏa' },
    { value: 'other', label: 'Khác' },
  ];

  const steps = [
    {
      title: 'Chọn loại đơn',
      description: 'Chọn loại đơn từ bạn muốn tạo'
    },
    {
      title: 'Thông tin chung',
      description: 'Điền thông tin cơ bản'
    },
    {
      title: 'Chi tiết đơn từ',
      description: 'Điền thông tin chi tiết'
    },
    {
      title: 'Xác nhận',
      description: 'Xem lại và gửi đơn từ'
    }
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format dates
      const formattedValues = {
        ...values,
        applicationDate: dayjs().format('YYYY-MM-DD'),
        status: 'pending',
        applicationType,
      };

      // Format specific fields based on application type
      if (applicationType === 'leave') {
        if (values.dateRange) {
          formattedValues.startDate = values.dateRange[0].format('YYYY-MM-DD');
          formattedValues.endDate = values.dateRange[1].format('YYYY-MM-DD');
          formattedValues.totalDays = values.dateRange[1].diff(values.dateRange[0], 'day') + 1;
          delete formattedValues.dateRange;
        }
      }

      if (applicationType === 'business_trip') {
        if (values.tripDateRange) {
          formattedValues.startDate = values.tripDateRange[0].format('YYYY-MM-DD');
          formattedValues.endDate = values.tripDateRange[1].format('YYYY-MM-DD');
          delete formattedValues.tripDateRange;
        }
      }

      // Format time fields
      if (values.checkoutTime) {
        formattedValues.checkoutTime = values.checkoutTime.format('HH:mm');
      }
      if (values.startTime) {
        formattedValues.startTime = values.startTime.format('HH:mm');
      }
      if (values.endTime) {
        formattedValues.endTime = values.endTime.format('HH:mm');
      }
      if (values.plannedReturnTime) {
        formattedValues.plannedReturnTime = values.plannedReturnTime.format('HH:mm');
      }

      // Format date fields
      if (values.requestedDate) {
        formattedValues.requestedDate = values.requestedDate.format('YYYY-MM-DD');
      }
      if (values.changeDate) {
        formattedValues.changeDate = values.changeDate.format('YYYY-MM-DD');
      }
      if (values.effectiveDate) {
        formattedValues.effectiveDate = values.effectiveDate.format('YYYY-MM-DD');
      }
      if (values.lastWorkingDate) {
        formattedValues.lastWorkingDate = values.lastWorkingDate.format('YYYY-MM-DD');
      }
      if (values.checkoutDate) {
        formattedValues.checkoutDate = values.checkoutDate.format('YYYY-MM-DD');
      }

      await applicationService.createApplication(formattedValues);
      message.success('Tạo đơn từ thành công');
      router.push('/applications');
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi tạo đơn từ');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        if (!applicationType) {
          message.error('Vui lòng chọn loại đơn từ');
          return;
        }
      } else if (currentStep === 1) {
        await form.validateFields(['reason']);
      } else if (currentStep === 2) {
        await form.validateFields();
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleBack = () => {
    router.push('/applications');
  };

  const renderTypeSelection = () => (
    <Row gutter={[16, 16]}>
      {applicationTypeOptions.map(option => (
        <Col xs={24} sm={12} md={8} lg={6} key={option.value}>
          <Card
            hoverable
            className={`type-card ${applicationType === option.value ? 'selected' : ''}`}
            onClick={() => setApplicationType(option.value)}
            style={{
              border: applicationType === option.value ? '2px solid #1890ff' : '1px solid #d9d9d9',
              borderRadius: 8,
              textAlign: 'center',
              height: 120
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{option.icon}</div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{option.label}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{option.description}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderBasicInfo = () => (
    <Form form={form} layout="vertical" preserve={false}>
      <Form.Item
        name="reason"
        label="Lý do chung"
        rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
      >
        <TextArea rows={3} placeholder="Nhập lý do tạo đơn từ" />
      </Form.Item>
    </Form>
  );

  const renderDetailForm = () => {
    if (!applicationType) return null;

    const selectedType = applicationTypeOptions.find(opt => opt.value === applicationType);

    return (
      <Form form={form} layout="vertical" preserve={false}>
        <Divider orientation="left">
          <Space>
            <span>{selectedType?.icon}</span>
            {selectedType?.label}
          </Space>
        </Divider>
        
        {renderFormFields()}
      </Form>
    );
  };

  const renderFormFields = () => {
    switch (applicationType) {
      case 'leave':
        return (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="leaveType"
                  label="Loại nghỉ"
                  rules={[{ required: true, message: 'Vui lòng chọn loại nghỉ' }]}
                >
                  <Select placeholder="Chọn loại nghỉ">
                    {leaveTypeOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="dateRange"
                  label="Thời gian nghỉ"
                  rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ' }]}
                >
                  <RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="attachments" label="Tệp đính kèm (nếu có)">
              <Upload>
                <Button icon={<UploadOutlined />}>Tải lên tệp</Button>
              </Upload>
            </Form.Item>
          </>
        );

      case 'shift_registration':
        return (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="requestedDate"
                  label="Ngày đăng ký"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="preferredShift"
                  label="Ca làm việc ưu tiên"
                  rules={[{ required: true, message: 'Vui lòng nhập ca làm việc' }]}
                >
                  <Input placeholder="Ví dụ: Ca sáng (7:00-15:00)" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="shiftId" label="ID ca làm việc" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập ID ca làm việc" />
            </Form.Item>
          </>
        );

      case 'checkout':
        return (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="checkoutDate"
                  label="Ngày check-out"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="checkoutTime"
                  label="Giờ check-out"
                  rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="plannedReturnTime" label="Giờ dự kiến quay lại">
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="earlyCheckoutReason"
                  label="Lý do check-out sớm"
                  rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
                >
                  <Input placeholder="Lý do check-out sớm" />
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 'shift_change':
        return (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="currentShiftId"
                  label="Ca hiện tại"
                  rules={[{ required: true, message: 'Vui lòng nhập ID ca hiện tại' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="ID ca hiện tại" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="requestedShiftId"
                  label="Ca muốn đổi"
                  rules={[{ required: true, message: 'Vui lòng nhập ID ca muốn đổi' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="ID ca muốn đổi" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="changeDate"
                  label="Ngày đổi ca"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="exchangeWithEmployee" label="Đổi ca với nhân viên (ID)">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="ID nhân viên (tùy chọn)" />
            </Form.Item>
          </>
        );

      case 'increased_hours':
        return (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="effectiveDate"
                  label="Ngày áp dụng"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="currentWorkingHours"
                  label="Giờ làm hiện tại"
                  rules={[{ required: true, message: 'Vui lòng nhập giờ làm hiện tại' }]}
                >
                  <InputNumber min={1} max={24} style={{ width: '100%' }} placeholder="Giờ/ngày" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="requestedWorkingHours"
                  label="Giờ làm mong muốn"
                  rules={[{ required: true, message: 'Vui lòng nhập giờ làm mong muốn' }]}
                >
                  <InputNumber min={1} max={24} style={{ width: '100%' }} placeholder="Giờ/ngày" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="duration"
              label="Thời gian áp dụng (tháng)"
              rules={[{ required: true, message: 'Vui lòng nhập thời gian áp dụng' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Số tháng" />
            </Form.Item>
          </>
        );

      case 'business_trip':
        return (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="destination"
                  label="Địa điểm công tác"
                  rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}
                >
                  <Input placeholder="Địa điểm công tác" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="tripDateRange"
                  label="Thời gian công tác"
                  rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
                >
                  <RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="purpose"
              label="Mục đích công tác"
              rules={[{ required: true, message: 'Vui lòng nhập mục đích' }]}
            >
              <TextArea rows={3} placeholder="Mục đích công tác" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="estimatedCost" label="Chi phí ước tính (VND)">
                  <InputNumber
                    min={0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    style={{ width: '100%' }}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="transportationMode"
                  label="Phương tiện di chuyển"
                  rules={[{ required: true, message: 'Vui lòng chọn phương tiện' }]}
                >
                  <Select placeholder="Chọn phương tiện">
                    {transportationOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="accommodationNeeded" label="Cần chỗ ở" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 'resignation':
        return (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="lastWorkingDate"
                  label="Ngày làm việc cuối"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="noticePeriod"
                  label="Thời gian báo trước (ngày)"
                  rules={[{ required: true, message: 'Vui lòng nhập thời gian báo trước' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="Số ngày" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="resignationReason"
              label="Lý do thôi việc"
              rules={[{ required: true, message: 'Vui lòng nhập lý do thôi việc' }]}
            >
              <TextArea rows={3} placeholder="Lý do thôi việc" />
            </Form.Item>
            <Form.Item name="handoverNotes" label="Ghi chú bàn giao">
              <TextArea rows={3} placeholder="Ghi chú về việc bàn giao công việc" />
            </Form.Item>
            <Form.Item name="exitInterviewScheduled" label="Đã lên lịch phỏng vấn thôi việc" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  const renderConfirmation = () => {
    const selectedType = applicationTypeOptions.find(opt => opt.value === applicationType);
    
    return (
      <div>
        <Card title="Xem lại thông tin đơn từ" size="small">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <strong>Loại đơn từ:</strong><br />
              <Space>
                <span>{selectedType?.icon}</span>
                {selectedType?.label}
              </Space>
            </Col>
            <Col span={8}>
              <strong>Ngày tạo:</strong><br />
              {dayjs().format('DD/MM/YYYY')}
            </Col>
            <Col span={8}>
              <strong>Trạng thái:</strong><br />
              <Badge status="processing" text="Chờ duyệt" />
            </Col>
          </Row>
          
          <Divider />
          
          <div>
            <strong>Lý do:</strong><br />
            {form.getFieldValue('reason')}
          </div>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 16, color: '#666' }}>
          Bạn có chắc chắn muốn gửi đơn từ này không?
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderTypeSelection();
      case 1:
        return renderBasicInfo();
      case 2:
        return renderDetailForm();
      case 3:
        return renderConfirmation();
      default:
        return null;
    }
  };

  return (
    <div className="create-application-form">
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            style={{ marginBottom: 16 }}
          >
            Quay lại danh sách
          </Button>
          
          <Steps current={currentStep} items={steps} />
        </div>

        <div style={{ minHeight: 400, margin: '24px 0' }}>
          {renderCurrentStep()}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                Quay lại
              </Button>
            )}
            
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext}>
                Tiếp theo
              </Button>
            )}
            
            {currentStep === steps.length - 1 && (
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                Tạo đơn từ
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default CreateApplicationForm;

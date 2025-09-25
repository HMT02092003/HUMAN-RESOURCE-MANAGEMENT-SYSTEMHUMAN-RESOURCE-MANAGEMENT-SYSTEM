'use client';

import React, { useState, useEffect } from 'react';
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
  Badge,
  Alert,
  Descriptions,
  Spin
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { mockApplicationService as applicationService } from '@/service/mockApplicationService';
import { ApplicationTypes } from '@/service/applicationService';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface EditApplicationFormProps {
  applicationId: string;
}

const EditApplicationForm: React.FC<EditApplicationFormProps> = ({ applicationId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const router = useRouter();

  const applicationTypeOptions = [
    { value: 'leave', label: 'Đơn xin nghỉ', icon: '🏠' },
    { value: 'shift_registration', label: 'Đơn đăng ký ca', icon: '📅' },
    { value: 'checkout', label: 'Đơn check-out sớm', icon: '🚪' },
    { value: 'shift_change', label: 'Đơn đổi ca', icon: '🔄' },
    { value: 'increased_hours', label: 'Đơn tăng ca', icon: '⏰' },
    { value: 'business_trip', label: 'Đơn công tác', icon: '✈️' },
    { value: 'resignation', label: 'Đơn thôi việc', icon: '📋' },
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

  // Fetch application data
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setFetchLoading(true);
        const data = await applicationService.getApplicationById(parseInt(applicationId));
        setApplication(data);
        populateForm(data);
      } catch (error) {
        message.error('Không thể tải thông tin đơn từ');
        router.push('/applications');
      } finally {
        setFetchLoading(false);
      }
    };

    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId, router]);

  const populateForm = (data: any) => {
    const formData: any = { ...data };

    // Format dates for form
    if (data.applicationType === 'leave') {
      if (data.startDate && data.endDate) {
        formData.dateRange = [dayjs(data.startDate), dayjs(data.endDate)];
      }
    }

    if (data.applicationType === 'business_trip') {
      if (data.startDate && data.endDate) {
        formData.tripDateRange = [dayjs(data.startDate), dayjs(data.endDate)];
      }
    }

    // Format time fields
    if (data.checkoutTime) {
      formData.checkoutTime = dayjs(data.checkoutTime, 'HH:mm');
    }
    if (data.startTime) {
      formData.startTime = dayjs(data.startTime, 'HH:mm');
    }
    if (data.endTime) {
      formData.endTime = dayjs(data.endTime, 'HH:mm');
    }
    if (data.plannedReturnTime) {
      formData.plannedReturnTime = dayjs(data.plannedReturnTime, 'HH:mm');
    }

    // Format date fields
    if (data.requestedDate) {
      formData.requestedDate = dayjs(data.requestedDate);
    }
    if (data.changeDate) {
      formData.changeDate = dayjs(data.changeDate);
    }
    if (data.effectiveDate) {
      formData.effectiveDate = dayjs(data.effectiveDate);
    }
    if (data.lastWorkingDate) {
      formData.lastWorkingDate = dayjs(data.lastWorkingDate);
    }
    if (data.checkoutDate) {
      formData.checkoutDate = dayjs(data.checkoutDate);
    }

    form.setFieldsValue(formData);
  };

  const handleSubmit = async () => {
    if (!application) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format dates
      const formattedValues = { ...values };

      // Format specific fields based on application type
      if (application.applicationType === 'leave') {
        if (values.dateRange) {
          formattedValues.startDate = values.dateRange[0].format('YYYY-MM-DD');
          formattedValues.endDate = values.dateRange[1].format('YYYY-MM-DD');
          formattedValues.totalDays = values.dateRange[1].diff(values.dateRange[0], 'day') + 1;
          delete formattedValues.dateRange;
        }
      }

      if (application.applicationType === 'business_trip') {
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

      await applicationService.updateApplication(application.id, formattedValues);
      message.success('Cập nhật đơn từ thành công');
      router.push('/applications');
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi cập nhật đơn từ');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/applications');
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

  const getApplicationTypeInfo = (type: string) => {
    return applicationTypeOptions.find(option => option.value === type) || 
           { label: type, icon: '📄' };
  };

  const renderFormFields = () => {
    if (!application) return null;

    switch (application.applicationType) {
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
            <Form.Item name="attachments" label="Tệp đính kèm">
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
              <InputNumber min={1} style={{ width: '100%' }} />
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
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="requestedShiftId"
                  label="Ca muốn đổi"
                  rules={[{ required: true, message: 'Vui lòng nhập ID ca muốn đổi' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
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
              <InputNumber min={1} style={{ width: '100%' }} />
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
                  <InputNumber min={1} max={24} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="requestedWorkingHours"
                  label="Giờ làm mong muốn"
                  rules={[{ required: true, message: 'Vui lòng nhập giờ làm mong muốn' }]}
                >
                  <InputNumber min={1} max={24} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="duration"
              label="Thời gian áp dụng (tháng)"
              rules={[{ required: true, message: 'Vui lòng nhập thời gian áp dụng' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
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
                <Form.Item name="estimatedCost" label="Chi phí ước tính">
                  <InputNumber
                    min={0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    style={{ width: '100%' }}
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
                  <InputNumber min={1} style={{ width: '100%' }} />
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

  if (fetchLoading) {
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
  const canEdit = application.status === 'pending';

  return (
    <div className="edit-application-form">
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleBack}
        style={{ marginBottom: 16 }}
      >
        Quay lại danh sách
      </Button>

      {application.status !== 'pending' && (
        <Alert
          message={
            application.status === 'approved' 
              ? 'Đơn từ đã được duyệt' 
              : 'Đơn từ đã bị từ chối'
          }
          description={
            application.status === 'approved'
              ? 'Đơn từ này đã được duyệt và không thể chỉnh sửa.'
              : `Lý do từ chối: ${application.rejectedReason || 'Không có lý do cụ thể'}`
          }
          type={application.status === 'approved' ? 'success' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <div style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Descriptions title="Thông tin cơ bản" size="small" column={1}>
                <Descriptions.Item label="Loại đơn từ">
                  <Space>
                    <span>{typeInfo.icon}</span>
                    {typeInfo.label}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {getStatusBadge(application.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Nhân viên">
                  {application.employeeName} ({application.employeeDepartment})
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(application.applicationDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={18}>
              <Form
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  name="reason"
                  label="Lý do chung"
                  rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
                >
                  <TextArea 
                    rows={2} 
                    placeholder="Nhập lý do tạo đơn từ" 
                    disabled={!canEdit}
                  />
                </Form.Item>

                <Divider orientation="left">Thông tin chi tiết</Divider>
                
                <div style={canEdit ? {} : { opacity: 0.6, pointerEvents: 'none' }}>
                  {renderFormFields()}
                </div>
              </Form>
            </Col>
          </Row>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            <Button onClick={handleBack}>
              Hủy
            </Button>
            
            {canEdit && (
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                Cập nhật đơn từ
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default EditApplicationForm;

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, DatePicker, TimePicker, Button, Space, Typography, Alert, Row, Col, message, Upload, Select, Spin } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, CheckOutlined, CloseOutlined, ExclamationCircleOutlined, RollbackOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ApplicationGuide from '../ApplicationGuide';
import ApplicationService from '@/service/applicationService';
import {useRouter, useSearchParams} from 'next/navigation';
import { FORGOT_CHECK_TYPE_LABELS } from '@/config/constant';

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface ForgotCheckInFormProps {
  onCancel: () => void;
}

const ForgotCheckInForm: React.FC<ForgotCheckInFormProps> = ({ onCancel }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load dữ liệu khi edit
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setIsEditMode(true);
      setApplicationId(Number(id));
      loadApplicationData(Number(id));
    }
  }, [searchParams]);

  const loadApplicationData = async (id: number) => {
    try {
      setLoading(true);
      const response = await ApplicationService.getApplicationById(id);
      console.log('📥 Full response:', response);
      
      const applicationData = response.data;
      console.log('📥 Application data:', applicationData);
      
      const data = applicationData.data; // Dữ liệu JSONB trong field 'data'
      console.log('📥 Form data from JSONB:', data);

      // Parse forgotDate với nhiều format
      let parsedDate = null;
      if (data.forgotDate) {
        const dateFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
        for (const format of dateFormats) {
          const temp = dayjs(data.forgotDate, format);
          if (temp.isValid()) {
            parsedDate = temp;
            console.log(`✅ Parsed date with format ${format}:`, parsedDate.format('YYYY-MM-DD'));
            break;
          }
        }
        if (!parsedDate || !parsedDate.isValid()) {
          console.error('❌ Invalid forgotDate:', data.forgotDate);
        }
      }

      // Parse forgotTime với nhiều format
      let parsedTime = null;
      if (data.forgotTime) {
        const timeFormats = ['HH:mm:ss', 'HH:mm', 'hh:mm A', 'hh:mm:ss A'];
        for (const format of timeFormats) {
          const temp = dayjs(data.forgotTime, format);
          if (temp.isValid()) {
            parsedTime = temp;
            console.log(`✅ Parsed time with format ${format}:`, parsedTime.format('HH:mm'));
            break;
          }
        }
        if (!parsedTime || !parsedTime.isValid()) {
          console.error('❌ Invalid forgotTime:', data.forgotTime);
        }
      }

      // Set form values
      const formValues = {
        forgotDate: parsedDate,
        forgotTime: parsedTime,
        reason: data.reason,
        forgotType: data.forgotType,
      };

      console.log('✅ Setting form values:', {
        forgotDate: parsedDate?.format('YYYY-MM-DD'),
        forgotTime: parsedTime?.format('HH:mm'),
        reason: data.reason,
        forgotType: data.forgotType,
      });

      form.setFieldsValue(formValues);

      // Set evidence files if exists
      if (data.evidence && Array.isArray(data.evidence)) {
        const existingFiles: UploadFile[] = data.evidence.map((file: any, index: number) => ({
          uid: `-${index}`,
          name: file.originalName || file.filename,
          status: 'done' as const,
          url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4100'}${file.path}`,
        }));
        setFileList(existingFiles);
      }
    } catch (error: any) {
      console.error('❌ Load application error:', error);
      message.error('Không thể tải thông tin đơn từ: ' + error.message);
      router.push('/applications/me');
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (values: any) => {
  try {
    let threeDaysAgo = dayjs().subtract(3, 'day');

    if (values.forgotDate.isBefore(threeDaysAgo, 'day')) {
      message.error('Đã quá thời hạn làm đơn quên check!');
      return;
    }

    // Chuyển files từ fileList thành File objects (chỉ lấy file mới upload)
    const evidenceFiles = fileList
      .filter(file => file.originFileObj) // Chỉ lấy file mới upload
      .map(file => file.originFileObj)
      .filter(Boolean);

    const applicationData = {
      forgotDate: values.forgotDate.format('YYYY-MM-DD'),
      forgotTime: values.forgotTime.format('HH:mm'),
      reason: values.reason,
      evidence: evidenceFiles, // Gửi files
      forgotType: values.forgotType, // Thêm loại quên check
    };

    console.log('📤 Submitting application data:', {
      ...applicationData,
      evidence: `${evidenceFiles.length} files`,
    });

    if (isEditMode && applicationId) {
      // Update existing application
      await ApplicationService.updateApplication(applicationId, {
        type: 'forgot-check',
        data: applicationData,
      });
      message.success('Cập nhật đơn quên chấm công thành công!');
    } else {
      // Create new application
      await ApplicationService.createApplication({
        type: 'forgot-check',
        data: applicationData,
      });
      message.success('Đơn quên chấm công đã được gửi thành công!');
    }

    router.push('/applications/me');
  } catch (error: any) {
    console.error('❌ Submit error:', error);
  }
};

  const uploadProps: UploadProps = {
    name: 'evidence',
    multiple: true,
    fileList: fileList,
    beforeUpload: (file) => {
      const isValidType =
        file.type === 'image/jpeg' ||
        file.type === 'image/png' ||
        file.type === 'image/jpg' ||
        file.type === 'application/pdf';

      if (!isValidType) {
        message.error('Chỉ được upload file ảnh (JPG, PNG) hoặc PDF!');
        return Upload.LIST_IGNORE;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('File phải nhỏ hơn 5MB!');
        return Upload.LIST_IGNORE;
      }

      setFileList(prev => [...prev, file as UploadFile]);
      return false;
    },
    onRemove: (file) => {
      setFileList(prev => prev.filter(item => item.uid !== file.uid));
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
  };

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu...">
      <div
        style={{ maxWidth: 900, margin: '0 auto' }}
      >
        <Card 
          title={
            <Text strong style={{ fontSize: 18 }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              {isEditMode ? 'Sửa đơn giải trình quên chấm công' : 'Đơn giải trình quên chấm công'}
            </Text>
          }
          bordered={false}
        >
          {/* Hướng dẫn */}
          {!isEditMode && <ApplicationGuide type="forgot-checkin" />}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
        <Row gutter={16}>
          {/* Forgot Date */}
          <Col xs={24} md={8}>
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
          <Col xs={24} md={8}>
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

          {/* Forgot Type */}
          <Col xs={24} md={8}>
            <Form.Item
              label={
                <Text strong>
                  <CheckOutlined style={{ marginRight: 6 }} />
                  Loại quên check
                </Text>
              }
              name="forgotType"
              rules={[{ required: true, message: 'Vui lòng chọn loại quên check!' }]}
            >
              <Select
                placeholder="Chọn loại"
                options={Object.entries(FORGOT_CHECK_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Reason */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label={<Text strong>📝 Lý do quên check và giải trình</Text>}
              name="reason"
              rules={[
                { required: true, message: 'Vui lòng nhập lý do quên check!' },
                { max: 500, message: 'Lý do không được quá 500 ký tự!' }
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
          </Col>
        </Row>

        {/* Evidence Upload */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label={<Text strong>📎 Bằng chứng (Ảnh chụp màn hình, email, tin nhắn...)</Text>}
              extra="Chấp nhận file ảnh (JPG, PNG) hoặc PDF. Tối đa 5MB/file"
            >
              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Click hoặc kéo thả file vào đây để upload
                </p>
                <p className="ant-upload-hint">
                  Hỗ trợ upload nhiều file. File ảnh hoặc PDF, tối đa 5MB
                </p>
              </Dragger>
            </Form.Item>
          </Col>
        </Row>

        {/* Alert policies */}
        <Alert
          message="Chính sách quên chấm công"
          description={
            <div style={{ marginTop: 8 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>Chỉ được phép quên chấm công tối đa 2 lần/tháng</li>
                <li>Đơn phải được gửi trong vòng 3 ngày kể từ ngày quên check</li>
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
              {isEditMode ? 'Cập nhật' : 'Lưu'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
        </Card>
      </div>
    </Spin>
  );
};

export default ForgotCheckInForm;

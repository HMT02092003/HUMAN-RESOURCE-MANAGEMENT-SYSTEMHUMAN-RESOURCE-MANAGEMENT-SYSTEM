import React, { useState, useEffect } from 'react';
import { Card, Form, Input, DatePicker, TimePicker, Button, Space, Typography, Alert, Row, Col, message, Upload, Spin } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, CheckOutlined, CloseOutlined, ExclamationCircleOutlined, RollbackOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ApplicationGuide from '../ApplicationGuide';
import ApplicationService from '@/service/applicationService';
import { useRouter, useSearchParams } from 'next/navigation';

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
      const data = response.data.data;

      // Set form values
      form.setFieldsValue({
        forgotDate: dayjs(data.forgotDate),
        forgotTime: dayjs(data.forgotTime, 'HH:mm'),
        reason: data.reason,
      });

      // Set evidence files if exists
      if (data.evidence && Array.isArray(data.evidence)) {
        const existingFiles: UploadFile[] = data.evidence.map((file: any, index: number) => ({
          uid: `-${index}`,
          name: file.originalName || file.filename,
          status: 'done',
          url: `http://localhost:4000${file.path}`,
        }));
        setFileList(existingFiles);
      }
    } catch (error: any) {
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

    // Chuyển files từ fileList thành File objects (chỉ files mới upload)
    const evidenceFiles = fileList
      .map(file => file.originFileObj)
      .filter(Boolean);

    const requestData = {
      type: 'forgot-check',
      data: {
        forgotDate: values.forgotDate.format('YYYY-MM-DD'),
        forgotTime: values.forgotTime.format('HH:mm'),
        reason: values.reason,
        evidence: evidenceFiles, // Gửi files
      },
    };

    if (isEditMode && applicationId) {
      // Cập nhật đơn từ
      await ApplicationService.updateApplication(applicationId, requestData);
      message.success('Cập nhật đơn quên chấm công thành công!');
    } else {
      // Tạo mới đơn từ
      await ApplicationService.createApplication(requestData);
      message.success('Đơn quên chấm công đã được gửi thành công!');
    }

    router.push('/applications/me');
  } catch (error: any) {
    message.error('Đã có lỗi xảy ra khi gửi đơn. Lỗi: ' + error.message);
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
        file.type === 'application/pdf' ||
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (!isValidType) {
        message.error('Chỉ được upload file ảnh (JPG, PNG), PDF, DOC, DOCX, XLS, XLSX!');
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <div
      title={isEditMode ? "Chỉnh sửa đơn quên chấm công" : "Đơn giải trình quên chấm công"}
      style={{ maxWidth: 900, margin: '0 auto' }}
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
    </div>
  );
};

export default ForgotCheckInForm;

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Typography,
  Alert,
  Upload,
  Row,
  Col,
  InputNumber,
  message,
  Spin,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import ApplicationService from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

interface BusinessTripFormProps {
  onCancel: () => void;
}

const BusinessTripForm: React.FC<BusinessTripFormProps> = ({ onCancel }) => {
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
        dateRange: [dayjs(data.startDate), dayjs(data.endDate)],
        destination: data.destination,
        estimatedCost: data.estimatedCost,
        purpose: data.purpose,
      });

      // Set evidence files if exists
      if (data.evidence && Array.isArray(data.evidence)) {
        const existingFiles: UploadFile[] = data.evidence.map((file: any, index: number) => ({
          uid: `-${index}`,
          name: file.originalName || file.filename,
          status: 'done',
          url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4100'}${file.path}`,
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
      const [startDate, endDate] = values.dateRange;

      // Chuyển files từ fileList thành File objects (chỉ files mới upload)
      const evidenceFiles = fileList
        .map(file => file.originFileObj)
        .filter(Boolean) as File[];

      const requestData = {
        type: 'business-trip',
        data: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          destination: values.destination,
          estimatedCost: values.estimatedCost,
          purpose: values.purpose,
        },
        evidenceFiles, // Gửi files riêng
      };

      if (isEditMode && applicationId) {
        // Cập nhật đơn từ
        await ApplicationService.updateApplication(applicationId, requestData);
        message.success('Cập nhật đơn công tác thành công!');
      } else {
        // Tạo mới đơn từ
        await ApplicationService.createApplication(requestData);
        message.success('Đơn công tác đã được gửi thành công!');
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
    <div title={isEditMode ? "Chỉnh sửa đơn công tác" : "Đơn công tác"} style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hướng dẫn */}
      {!isEditMode && <ApplicationGuide type="business-trip" />}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          {/* Date Range */}
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  Thời gian công tác
                </Text>
              }
              name="dateRange"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian công tác!' }]}
            >
              <RangePicker
                placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                disabledDate={(current) => current && current < dayjs().startOf('day').subtract(7, 'day')}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          {/* Duration Display */}
          <Col xs={24} md={12}>
            <Form.Item label={<Text strong>Thời gian ước tính</Text>}>
              <Form.Item dependencies={['dateRange']} noStyle>
                {({ getFieldValue }) => {
                  const dateRange = getFieldValue('dateRange');
                  let days = 0;
                  if (dateRange && dateRange[0] && dateRange[1]) {
                    let cur = dateRange[0].startOf('day');
                    const end = dateRange[1].startOf('day');
                    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
                      const dow = cur.day(); // 0=CN, 6=T7
                      if (dow !== 0 && dow !== 6) days++;
                      cur = cur.add(1, 'day');
                    }
                  }
                  return (
                    <Input
                      value={days > 0 ? `${days} ngày (không tính T7, CN)` : 'Chưa xác định'}
                      readOnly
                      prefix={<CalendarOutlined />}
                    />
                  );
                }}
              </Form.Item>
            </Form.Item>
          </Col>

          {/* Destination */}
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <EnvironmentOutlined style={{ marginRight: 6 }} />
                  Địa điểm công tác
                </Text>
              }
              name="destination"
              rules={[
                { required: true, message: 'Vui lòng nhập địa điểm công tác!' },
                { min: 3, message: 'Địa điểm phải có ít nhất 3 ký tự!' }
              ]}
            >
              <Input
                placeholder="Ví dụ: Hà Nội, TP.HCM, Đà Nẵng..."
                prefix={<EnvironmentOutlined />}
              />
            </Form.Item>
          </Col>

          {/* Estimated Cost */}
          <Col xs={24} md={12}>
            <Form.Item
              label={<Text strong>Ước tính chi phí công tác (VNĐ)</Text>}
              name="estimatedCost"
              rules={[
                { required: true, message: 'Vui lòng nhập chi phí công tác dự kiến!' },
                { pattern: /^[0-9]+$/, message: 'Chi phí chỉ được chứa số!' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={1000}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') // thêm dấu phẩy
                }
                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')} // bỏ dấu phẩy khi lấy giá trị
                placeholder="Ví dụ: 3,000,000"
              />
            </Form.Item>
          </Col>

          {/* Evidence Images */}
          <Col xs={24}>
            <Form.Item
              label={<Text strong>📎 Bằng chứng công tác (Lịch họp, email, thông báo...)</Text>}
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

          {/* Purpose */}
          <Col xs={24}>
            <Form.Item
              label={
                <Text strong>
                  <FileTextOutlined style={{ marginRight: 6 }} />
                  Mục đích công tác
                </Text>
              }
              name="purpose"
              rules={[
                { required: true, message: 'Vui lòng nhập mục đích công tác!' },
              ]}
            >
              <TextArea
                placeholder="Ví dụ: Gặp gỡ khách hàng ABC để thảo luận dự án XYZ, tham gia hội thảo công nghệ..."
                rows={4}
                showCount
                maxLength={500}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Important Notes */}
        <Alert
          message="Lưu ý quan trọng về công tác"
          description={
            <ul style={{ paddingLeft: 20, margin: 0, marginTop: 8 }}>
              <li>Đơn công tác phải được gửi trước ít nhất 7 ngày</li>
              <li>Cần có sự phê duyệt từ quản lý trực tiếp và phòng nhân sự</li>
              <li>Lưu giữ hóa đơn, biên lai để hoàn ứng chi phí</li>
              <li>Báo cáo công tác phải gửi trong vòng 3 ngày sau khi về</li>
              <li>Tuân thủ quy định an toàn và đại diện hình ảnh công ty</li>
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Buttons */}
        <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
          <Space size="middle">
            <Button size="large" onClick={onCancel} icon={<CloseOutlined />}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" size="large" icon={<CheckOutlined />}>
              {isEditMode ? 'Cập nhật đơn công tác' : 'Gửi đơn công tác'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BusinessTripForm;

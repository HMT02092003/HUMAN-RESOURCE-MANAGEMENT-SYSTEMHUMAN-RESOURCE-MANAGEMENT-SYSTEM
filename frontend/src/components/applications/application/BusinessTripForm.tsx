import React, { useState } from 'react';
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
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleSubmit = async (values: any) => {
    try {
      const [startDate, endDate] = values.dateRange;

      // Chuyển files từ fileList thành File objects
      const evidenceFiles = fileList
        .map(file => file.originFileObj)
        .filter(Boolean) as File[];

      await ApplicationService.createApplication({
        type: 'business-trip',
        data: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          destination: values.destination,
          estimatedCost: values.estimatedCost,
          purpose: values.purpose,
        },
        evidenceFiles, // Gửi files riêng
      });

      message.success('Đơn công tác đã được gửi thành công!');
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
    <div title="Đơn công tác" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Hướng dẫn */}
      <ApplicationGuide type="business-trip" />

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
                disabledDate={(current) => current && current < dayjs().startOf('day')}
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
                  const days =
                    dateRange && dateRange[0] && dateRange[1]
                      ? dateRange[1].diff(dateRange[0], 'day') + 1
                      : 0;
                  return (
                    <Input
                      value={days > 0 ? `${days} ngày` : 'Chưa xác định'}
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
                { min: 20, message: 'Mục đích phải có ít nhất 20 ký tự để mô tả rõ ràng!' }
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
              Gửi đơn công tác
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BusinessTripForm;

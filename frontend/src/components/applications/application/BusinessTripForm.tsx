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
} from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
  PictureOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
// import { BusinessTripApplication } from '@/service/applicationService';
import ApplicationGuide from '../ApplicationGuide';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface BusinessTripFormProps {
  // onSubmit: (
  //   data: Omit<BusinessTripApplication, 'id' | 'status' | 'applicationDate'>
  // ) => void;
  // onCancel: () => void;
}

const BusinessTripForm: React.FC<BusinessTripFormProps> = ({
  // onSubmit,
  // onCancel
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const handleSubmit = (values: any) => {
    const [startDate, endDate] = values.dateRange;

  };

  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const uploadProps = {
    fileList,
    onChange: handleUploadChange,
    beforeUpload: () => false, // Ngăn upload tự động
    listType: 'picture-card' as const,
    multiple: true,
    accept: 'image/*',
    maxCount: 5
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
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <Text strong>
                  <PictureOutlined style={{ marginRight: 6 }} />
                  Bằng chứng công tác (tùy chọn)
                </Text>
              }
              extra="Tải lên vé máy bay, booking khách sạn, lịch họp... (Tối đa 5 ảnh)"
            >
              <Upload {...uploadProps}>
                {fileList.length >= 5 ? null : (
                  <div style={{ textAlign: 'center' }}>
                    <UploadOutlined style={{ fontSize: 18, marginBottom: 4 }} />
                    <div>Tải ảnh lên</div>
                  </div>
                )}
              </Upload>
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
            <Button size="large"  icon={<CloseOutlined />}>
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

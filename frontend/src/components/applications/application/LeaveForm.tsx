import React, { use, useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Statistic,
  Divider,
  message,
  Spin,
} from "antd";
import { RollbackOutlined, SaveOutlined } from "@ant-design/icons";
import type { GetProps, DatePickerProps } from "antd";
import dayjs from "dayjs";
import ApplicationService from "@/service/applicationService";
import ApplicationGuide from "../ApplicationGuide";
import UserService from "@/service/userService";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/utils/decode-token";
import { useRouter, useSearchParams } from 'next/navigation';

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;
type DatePickerValue = DatePickerProps["value"];

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface LeaveApplicationFormProps {
  onCancel: () => void;
}

const LeaveForm: React.FC<LeaveApplicationFormProps> = ({ onCancel }) => {
  const [form] = Form.useForm();
  const [startDate, setStartDate] = useState<DatePickerValue>(null);
  const [endDate, setEndDate] = useState<DatePickerValue>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [totalDaysOff, setTotalDaysOff] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tính số ngày làm việc đã chọn (bỏ Thứ 7, Chủ nhật)
  const calculateDays = () => {
    if (startDate && endDate) {
      let count = 0;
      let current = startDate.startOf('day');
      const end = endDate.startOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dow = current.day(); // 0=CN, 6=T7
        if (dow !== 0 && dow !== 6) {
          count++;
        }
        current = current.add(1, 'day');
      }
      return count;
    }
    return 0;
  };

  const usedDays = calculateDays();
  const remainingDays = totalDaysOff - usedDays;

  // Lấy số ngày phép còn lại từ API
  const getNumberOfDaysOff = async () => {
    try {
      let token = Cookies.get("token") || "";
      let decoded = token ? getDecodedToken(token) : null;
      if (decoded) {
        let daysOff = await UserService.getNumberOfDaysOff(decoded.user.id);
        setTotalDaysOff(daysOff.monthly_leave_balance || 0);
      }
    } catch (error: any) {
      messageApi.error(error.message || "Đã có lỗi xảy ra!");
    }
  };

  // Load dữ liệu khi edit
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setIsEditMode(true);
      setApplicationId(Number(id));
      loadApplicationData(Number(id));
    }
    getNumberOfDaysOff();
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

      // Parse dates
      let parsedStartDate = null;
      let parsedEndDate = null;

      if (data.startDate) {
        parsedStartDate = dayjs(data.startDate);
        if (parsedStartDate.isValid()) {
          setStartDate(parsedStartDate);
        }
      }

      if (data.endDate) {
        parsedEndDate = dayjs(data.endDate);
        if (parsedEndDate.isValid()) {
          setEndDate(parsedEndDate);
        }
      }

      // Set form values
      const formValues = {
        applicationCategory: data.applicationCategory,
        leaveType: data.leaveType,
        reason: data.reason,
        dateRange: parsedStartDate && parsedEndDate ? [parsedStartDate, parsedEndDate] : null,
      };

      console.log('✅ Setting form values:', formValues);
      form.setFieldsValue(formValues);

    } catch (error: any) {
      console.error('❌ Error loading application data:', error);
      messageApi.error(error.response?.data?.message || 'Lỗi khi tải thông tin đơn từ');
    } finally {
      setLoading(false);
    }
  };

  // Submit form
  const handleSubmit = async (values: any) => {
    try {
      if (!startDate || !endDate) {
        messageApi.error("Vui lòng chọn khoảng thời gian nghỉ!");
        return;
      }

      // Tính số ngày làm việc thực tế (bỏ T7, CN)
      let usedDays = 0;
      let cur = startDate.startOf('day');
      const ed = endDate.startOf('day');
      while (cur.isBefore(ed) || cur.isSame(ed, 'day')) {
        const dow = cur.day();
        if (dow !== 0 && dow !== 6) usedDays++;
        cur = cur.add(1, 'day');
      }
      const remaining = totalDaysOff - usedDays;

      if (remaining < 0 && values.applicationCategory === "leave") {
        messageApi.error("Số ngày phép còn lại không đủ!");
        return;
      }

      delete values.dateRange;

      if (isEditMode && applicationId) {
        // Update existing application
        await ApplicationService.updateApplication(applicationId, {
          data: {
            ...values,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        });
        messageApi.success("Cập nhật đơn nghỉ phép thành công!");
      } else {
        // Create new application
        await ApplicationService.createApplication({
          type: "leave",
          data: {
            ...values,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
        });
        messageApi.success("Tạo đơn nghỉ phép thành công!");
      }

      router.push("/applications/me");
    } catch (error: any) {
      messageApi.error(error.message || "Đã có lỗi xảy ra khi tạo/cập nhật đơn!");
    }
  };

  // Không cho chọn ngày trước 3 ngày so với ngày hiện tại
  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    if (!current) return false;
    const minAllowed = dayjs().subtract(3, "day").startOf("day");
    return current < minAllowed;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {contextHolder}
      {/* Hướng dẫn */}
      <ApplicationGuide type="leave" />

      <Spin spinning={loading} tip="Đang tải thông tin đơn từ...">

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          {/* Loại đơn + Số phép còn lại */}
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="applicationCategory"
                label={<Text strong>Loại đơn</Text>}
                rules={[{ required: true, message: "Vui lòng chọn loại đơn!" }]}
                tooltip="Nghỉ phép: Trừ số ngày phép, có lương. Nghỉ không phép: Không trừ phép, không lương"
              >
                <Select
                  placeholder="Chọn loại đơn"
                  options={[
                    { value: "leave", label: "Nghỉ phép (có lương, trừ số ngày phép)" },
                    { value: "regular", label: "Nghỉ thường (không lương)" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Card
                style={{
                  borderRadius: 8,
                  background: "#f6f9ff",
                  textAlign: "center",
                }}
              >
                <Statistic
                  title="Số ngày phép còn lại"
                  value={remainingDays >= 0 ? remainingDays : 0}
                  suffix={`/ ${totalDaysOff}`}
                  valueStyle={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: remainingDays < 0 ? "red" : "#1677ff",
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Hình thức nghỉ + Thời gian nghỉ */}
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="leaveType"
                label={<Text strong>Hình thức nghỉ</Text>}
                rules={[{ required: true, message: "Vui lòng chọn hình thức nghỉ!" }]}
              >
                <Select
                  placeholder="Chọn hình thức nghỉ"
                  options={[
                    { value: "personal", label: "Nghỉ cá nhân" },
                    { value: "sick", label: "Nghỉ ốm" },
                    { value: "other", label: "Khác" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="dateRange"
                label={<Text strong>Thời gian nghỉ</Text>}
                rules={[
                  { required: true, message: "Vui lòng chọn khoảng thời gian nghỉ!" },
                ]}
              >
                <RangePicker
                  disabledDate={disabledDate}
                  onChange={(dates) => {
                    setStartDate(dates ? dates[0] : null);
                    setEndDate(dates ? dates[1] : null);
                  }}
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Tổng số ngày nghỉ đã chọn */}
          {usedDays > 0 && (
            <Row style={{ marginBottom: "24px" }}>
              <Col span={24}>
                <Alert
                  message={`Tổng số ngày nghỉ đã chọn: ${usedDays} ngày (không tính T7, CN)`}
                  type="info"
                  showIcon
                  style={{ borderRadius: 8 }}
                />
              </Col>
            </Row>
          )}

          {/* Lý do nghỉ */}
          <Form.Item
            name="reason"
            label={<Text strong>Lý do nghỉ</Text>}
            rules={[{ required: true, message: "Vui lòng nhập lý do nghỉ!" }]}
          >
            <TextArea
              placeholder="Mô tả chi tiết lý do nghỉ..."
              showCount
              rows={4}
            />
          </Form.Item>

          <Divider />

          {/* Nút hành động */}
          <Row justify="center">
            <Space size="large">
              <Button
                size="large"
                onClick={onCancel}
                style={{
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32,
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                <RollbackOutlined /> Trở lại
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                style={{
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32,
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                <SaveOutlined /> Lưu
              </Button>
            </Space>
          </Row>
        </Form>
      </Spin>
    </div>
  );
};

export default LeaveForm;

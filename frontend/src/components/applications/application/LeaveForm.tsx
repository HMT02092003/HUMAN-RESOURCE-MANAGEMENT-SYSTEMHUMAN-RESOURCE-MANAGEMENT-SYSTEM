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
} from "antd";
import { RollbackOutlined, SaveOutlined } from "@ant-design/icons";
import type { GetProps, DatePickerProps } from "antd";
import dayjs from "dayjs";
import ApplicationService from "@/service/applicationService";
import ApplicationGuide from "../ApplicationGuide";
import UserService from "@/service/userService";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/utils/decode-token";
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Tính số ngày đã chọn
  const calculateDays = () => {
    if (startDate && endDate) {
      return endDate.diff(startDate, "day") + 1;
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

  useEffect(() => {
    getNumberOfDaysOff();
  }, []);

  // Submit form
  const handleSubmit = async (values: any) => {
    try {
      if (!startDate || !endDate) {
        messageApi.error("Vui lòng chọn khoảng thời gian nghỉ!");
        return;
      }

      const usedDays = endDate.diff(startDate, "day") + 1;
      const remaining = totalDaysOff - usedDays;

      if (remaining < 0 && values.applicationCategory === "leave") {
        messageApi.error("Số ngày phép còn lại không đủ!");
        return;
      }

      delete values.dateRange; 

      await ApplicationService.createApplication({
        type: "leave",
        data: {
          ...values,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      });

      messageApi.success("Tạo đơn nghỉ phép thành công!");
      router.push("/applications/me");
    } catch (error: any) {
      messageApi.error(error.message || "Đã có lỗi xảy ra khi tạo đơn!");
    }
  };

  // Không cho chọn ngày trong quá khứ
  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    return current && current < dayjs().startOf("day");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {contextHolder}
      {/* Hướng dẫn */}
      <ApplicationGuide type="leave" />

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
            >
              <Select
                placeholder="Chọn loại đơn"
                options={[
                  { value: "leave", label: "📝 Nghỉ phép" },
                  { value: "regular", label: "📌 Nghỉ thường" },
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
                  { value: "personal", label: "🏠 Nghỉ cá nhân" },
                  { value: "sick", label: "🤒 Nghỉ ốm" },
                  { value: "vacation", label: "🎉 Nghỉ lễ/tết" },
                  { value: "other", label: "🔖 Khác" },
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
                message={`Tổng số ngày nghỉ đã chọn: ${usedDays} ngày`}
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
    </div>
  );
};

export default LeaveForm;

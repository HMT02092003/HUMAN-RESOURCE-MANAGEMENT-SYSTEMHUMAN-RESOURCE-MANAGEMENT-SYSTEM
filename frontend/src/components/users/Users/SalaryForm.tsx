"use client";

import React, { useEffect } from "react";
import { Form, Input, Button, Card, Space, message, InputNumber } from "antd";
import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";

interface SalaryFormProps {
  onFinish: (values: any) => void;
  onBack: () => void;
  loading?: boolean;
  initialValues?: any;
}

const SalaryForm: React.FC<SalaryFormProps> = ({
  onFinish,
  onBack,
  loading = false,
  initialValues,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const handleFinish = (values: any) => {
    // Chuyển đổi các giá trị từ string thành number nếu cần
    const processedValues = {
      ...values,
      salary: values.salary ? Number(values.salary) : 0,
      allowance: values.allowance ? Number(values.allowance) : 0,
    };
    onFinish(processedValues);
  };

  return (
    <Card title="Thông tin lương" bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ salary: 0, allowance: 0 }}
      >
        <Form.Item
          label="Lương cơ bản (VNĐ)"
          name="salary"
          rules={[
            { required: true, message: "Vui lòng nhập lương cơ bản!" },
            { type: "number", min: 0, message: "Lương không được âm!" },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            placeholder="Nhập lương cơ bản"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="Phụ cấp (VNĐ)"
          name="allowance"
          rules={[
            { type: "number", min: 0, message: "Phụ cấp không được âm!" },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            placeholder="Nhập phụ cấp"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
            min={0}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
              disabled={loading}
            >
              Quay lại
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CheckOutlined />}
            >
              Hoàn thành
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SalaryForm;

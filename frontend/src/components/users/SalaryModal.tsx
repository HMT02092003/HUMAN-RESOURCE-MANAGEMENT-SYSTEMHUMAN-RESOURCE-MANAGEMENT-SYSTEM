"use client";

import React, { useEffect } from "react";
import { Modal, Form, InputNumber, Space, Typography } from "antd";

const { Text } = Typography;

interface SalaryModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
  loading: boolean;
  salaryInfo: any;
}

const SalaryModal: React.FC<SalaryModalProps> = ({
  visible,
  onCancel,
  onOk,
  loading,
  salaryInfo,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && salaryInfo) {
      form.setFieldsValue({
        salary: salaryInfo.salary || 0,
        allowance: salaryInfo.allowance || 0,
      });
    }
  }, [visible, salaryInfo, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onOk(values);
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={`Thông tin lương - ${salaryInfo?.fullName || ''}`}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Cập nhật"
      cancelText="Hủy"
      confirmLoading={loading}
      width={500}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Đang tải...
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
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

          <Form.Item label="Tổng lương hiện tại">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                <strong>Lương cơ bản:</strong> {Number(salaryInfo?.salary || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
              <Text>
                <strong>Phụ cấp:</strong> {Number(salaryInfo?.allowance || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
              <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                <strong>Tổng lương:</strong> {(Number(salaryInfo?.salary) + Number(salaryInfo?.allowance) || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default SalaryModal;

"use client";

import React, { useEffect } from "react";
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import 'dayjs/locale/vi';

try { if (!dayjs.prototype.localeData) dayjs.extend(localeData); } catch (e) {}
try { if (!dayjs.prototype.weekday) dayjs.extend(weekday); } catch (e) {}
try { dayjs.locale('vi'); } catch (e) {}
import { Form, Input, Button, Row, Col, Space, InputNumber, DatePicker, Select } from "antd";
import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";

interface SalaryFormProps {
  onFinish: (values: any) => void;
  onBack: () => void;
  loading?: boolean;
  initialValues?: any;
  allowanceTypes?: Array<any>;
}

const SalaryForm: React.FC<SalaryFormProps> = ({
  onFinish,
  onBack,
  loading = false,
  initialValues,
  allowanceTypes = [],
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      // ensure effective_from is a dayjs object (EditSalary prepares it) and allowances exist
      form.setFieldsValue({
        ...initialValues,
        allowances: initialValues.allowances || [],
      });
    }
  }, [initialValues, form]);

  const handleFinish = (values: any) => {
    // transform allowances_map (object with keys by allowance_type_id) into allowances array
    const allowancesMap = values?.allowances_map || {};
    const allowance_type_ids: number[] = values?.allowance_type_ids || [];
    const allowances = allowance_type_ids.map((id) => ({
      allowance_type_id: Number(id),
      amount: Number(allowancesMap?.[String(id)] || 0),
    }));

    const payload = {
      ...values,
      allowances,
    };

    // remove internal helper map before submit
    delete payload.allowances_map;

    onFinish(payload);
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ salary: 0, allowance: 0, tax_code: '', bank_name: '', bank_account: '', effective_from: null }}
      >
        <Row gutter={24} style={{ display: 'flex', justifyContent: "center", margin: '0 15%' }}>
          <Col xs={24} md={12}>
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
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Chọn loại phụ cấp" name="allowance_type_ids">
              <Select
                mode="multiple"
                placeholder="Chọn một hoặc nhiều phụ cấp"
                options={allowanceTypes.map((t: any) => ({ label: t.name, value: t.id }))}
                style={{ width: '100%' }}
                allowClear
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Số tài khoản" name="bank_account">
              <Input placeholder="Số tài khoản" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Ngân hàng" name="bank_name">
              <Input placeholder="Tên ngân hàng" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Mã thuế" name="tax_code">
              <Input placeholder="Nhập mã thuế (nếu có)" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Hiệu lực từ" name="effective_from">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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
    </div>
  );
};

export default SalaryForm;

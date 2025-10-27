"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, InputNumber, Select, Button, message, Space, Row, Col, Checkbox } from 'antd';
import AllowanceDetails from '@/components/salary/allowanceDetails';
import salaryService from '@/service/salaryService';
import { RollbackOutlined, SaveOutlined } from '@ant-design/icons';

const { Option } = Select;

type Props = {
  id?: number | null; // if present -> edit mode
};

const AllowanceForm: React.FC<Props> = ({ id = null }) => {
  const [form] = Form.useForm();
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTypes = async () => {
      try {
  const res = await salaryService.listAllowanceTypes({ page: 1, pageSize: 1000 });
  const list = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
  setTypes(list);
      } catch (err) {
        message.error('Không tải được loại phụ cấp');
      }
    };
    loadTypes();
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await salaryService.getAllowanceType(id as number);
        form.setFieldsValue({
          name: data.name,
          default_amount: data.default_amount ?? 0,
          is_taxable: data.is_taxable ?? false,
          description: data.description ?? '',
        });
      } catch (err) {
        message.error('Không tải được dữ liệu để sửa');
      } finally { setLoading(false); }
    };
    load();
  }, [id, form]);

  const onFinish = async (vals: any) => {
    try {
      setLoading(true);
      const payload = {
        name: vals.name,
        description: vals.description || null,
        is_taxable: !!vals.is_taxable,
        default_amount: Number(vals.amount ?? vals.default_amount ?? 0),
      };

      if (id) {
        await salaryService.updateAllowanceType(id, payload);
        message.success('Cập nhật phụ cấp thành công');
      } else {
        await salaryService.createAllowanceType(payload);
        message.success('Tạo phụ cấp thành công');
      }
      router.push('/salary/allowances');
    } catch (err) {
      message.error('Lỗi khi lưu phụ cấp');
    } finally { setLoading(false); }
  };

  return (
    <Row justify="center" gutter={[16, 16]}>
      <Col xs={24} sm={22} md={20} lg={16} xl={14}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          {/* Use AllowanceDetails as the single, shared set of fields */}
          <AllowanceDetails allowanceTypes={types} />

          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'center' }}>
              <Button style={{ fontSize: '16px' }} type="primary" htmlType="submit" loading={loading}><SaveOutlined />{id ? 'Cập nhật' : 'Tạo mới'}</Button>
              <Button style={{ fontSize: '16px' }} onClick={() => router.push('/salary/allowances')}><RollbackOutlined />Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

export default AllowanceForm;

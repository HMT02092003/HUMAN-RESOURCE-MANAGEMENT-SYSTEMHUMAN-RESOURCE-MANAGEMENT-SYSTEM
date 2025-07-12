import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useRouter } from 'next/navigation';
import { roleService } from '@/src/service/roleService';

interface RoleForm {
  name: string;
  description?: string;
}

const CreateRole: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: RoleForm) => {
    try {
      setLoading(true);
      await roleService.createRole(values);
      message.success('Tạo vai trò thành công!');
      router.push('/roles');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tạo vai trò');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600, margin: '0 auto' }}
      >
        <Form.Item
          name="name"
          label="Tên vai trò"
          rules={[{ required: true, message: 'Vui lòng nhập tên vai trò!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo mới
          </Button>
          <Button
            onClick={() => router.back()}
            style={{ marginLeft: 8 }}
          >
            Quay lại
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateRole;
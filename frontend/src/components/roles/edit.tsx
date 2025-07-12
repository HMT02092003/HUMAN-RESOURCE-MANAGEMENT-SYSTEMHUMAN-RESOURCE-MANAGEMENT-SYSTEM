import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { roleService } from '@/src/service/roleService';

interface RoleForm {
  name: string;
  description?: string;
}

const EditRole: React.FC<{ id: string }> = ({ id }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await roleService.getRoleDetail(id);
      form.setFieldsValue(data);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onFinish = async (values: RoleForm) => {
    try {
      setLoading(true);
      await roleService.updateRole(id, values);
      message.success('Cập nhật vai trò thành công!');
      router.push('/roles');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi cập nhật vai trò');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await roleService.deleteRole(id);
      message.success('Xóa vai trò thành công!');
      router.push('/roles');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi xóa vai trò');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

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
            Cập nhật
          </Button>
          <Button
            type="primary"
            danger
            onClick={onDelete}
            loading={loading}
            style={{ marginLeft: 8 }}
          >
            Xóa
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

export default EditRole;

import React, { useEffect, useState } from 'react'
import { Form, Input, Select } from 'antd';
import { roleService } from '@/service/roleService';

const { Option } = Select;

const DepartmentsForm = () => {
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await roleService.getAllRolesForSelect();
        setRoles(data || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };
    fetchRoles();
  }, []);

  return (
    <>
      <Form.Item
        label="Tên phòng ban"
        name="name"
        rules={[
          { required: true, message: 'Vui lòng nhập tên phòng ban' },
          { whitespace: true, message: 'Vui lòng nhập tên phòng ban' },
        ]}
      >
        <Input placeholder="Nhập tên phòng ban" />
      </Form.Item>

      <Form.Item
        label="Mô tả"
        name="description"
        rules={[
          { max: 255, message: 'Mô tả không được vượt quá 255 ký tự' }
        ]}
      >
        <Input placeholder="Nhập mô tả phòng ban" />
      </Form.Item>

      <Form.Item
        label="Vai trò liên quan"
        name="role_ids"
        rules={[
          { required: true, message: 'Vui lòng chọn ít nhất một vai trò' }
        ]}
      >
        <Select
          mode="multiple"
          placeholder="Chọn vai trò liên quan đến phòng ban này"
          allowClear
          showSearch
        >
          {roles.map((role) => (
            <Option key={role.id} value={role.id}>
              {role.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </>
  )
}

export default DepartmentsForm


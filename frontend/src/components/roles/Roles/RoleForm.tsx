import React from 'react';
import { Form, Input } from 'antd';

const RoleForm = () => {
  return (
    <>
      <Form.Item
        label="Tên vai trò"
        name="name"
        rules={[
          { required: true, message: 'Vui lòng nhập Tên vai trò' },
          { whitespace: true, message: 'Vui lòng nhập Tên vai trò' },
          { max: 255, message: 'Tên vai trò không được vượt quá 255 ký tự' },
        ]}
      >
        <Input placeholder="Nhập tên vai trò" />
      </Form.Item>

      <Form.Item
        label="Mô tả"
        name="description"
        rules={[
          { max: 255, message: 'Mô tả không được vượt quá 255 ký tự' },
        ]}
      >
        <Input placeholder="Nhập mô tả vai trò" />
      </Form.Item>
    </>
  );
};

export default RoleForm;

import React from 'react'
import { Form, Input } from 'antd';

const DepartmentsForm = () => {
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
    </>
  )
}

export default DepartmentsForm

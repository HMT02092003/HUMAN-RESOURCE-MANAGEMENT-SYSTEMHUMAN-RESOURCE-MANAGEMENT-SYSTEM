import React from 'react';
import { Form, Input, InputNumber } from 'antd';

const ChevronsForm = () => {
  return (
    <>
      <Form.Item
        label="Tên chức vụ"
        name="name"
        rules={[
          { required: true, message: 'Vui lòng nhập Tên chức vụ' },
          { whitespace: true, message: 'Vui lòng nhập Tên chức vụ' },
        ]}
      >
        <Input placeholder="Nhập tên chức vụ" />
      </Form.Item>

      <Form.Item
        label="Mô tả"
        name="description"
        rules={[
          { max: 255, message: 'Mô tả không được vượt quá 255 ký tự' }
        ]}
      >
        <Input placeholder="Nhập mô tả" />
      </Form.Item>

      <Form.Item
        label="Hệ số chức vụ"
        name="chevronCoefficient"
        rules={[
          { required: true, message: 'Vui lòng nhập Hệ số chức vụ' },
          { type: 'number', min: 0, message: 'Hệ số chức vụ phải lớn hơn hoặc bằng 0' },
          { type: 'number', max: 5, message: 'Hệ số chức vụ không được vượt quá 5' }
        ]}
      >
        <InputNumber
          placeholder="Nhập hệ số chức vụ"
          style={{ width: '100%' }}
        />
      </Form.Item>
    </>
  );
};

export default ChevronsForm;

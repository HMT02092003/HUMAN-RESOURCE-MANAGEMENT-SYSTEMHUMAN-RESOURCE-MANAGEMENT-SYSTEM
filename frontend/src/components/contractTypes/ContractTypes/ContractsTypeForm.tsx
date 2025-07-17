import React from 'react';
import { Form, Input, InputNumber, Select } from 'antd';

const ContractTypesForm = () => {
    return (
        <>
            <Form.Item
                label="Tên loại hợp đồng"
                name="name"
                rules={[
                    { required: true, message: 'Vui lòng nhập Tên loại hợp đồng' },
                    { whitespace: true, message: 'Vui lòng nhập Tên loại hợp đồng' },
                ]}
            >
                <Input placeholder="Nhập tên loại hợp đồng" />
            </Form.Item>
            <Form.Item
                label="Loại hợp đồng"
                name="type"
                rules={[
                    { required: true, message: 'Vui lòng chọn Loại hợp đồng' },
                ]}
            >
                <Select
                    placeholder="Chọn loại hợp đồng"
                    allowClear
                    showSearch
                >
                    <Select.Option value={1}>Thực tập sinh</Select.Option>
                    <Select.Option value={2}>Nhân viên chính thức</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item
                label="Mô tả"
                name="description"
                rules={[
                    { max: 255, message: 'Mô tả tối đa 255 ký tự' }
                ]}
            >
                <Input.TextArea placeholder="Nhập mô tả" />
            </Form.Item>
            <Form.Item
                label="Thời hạn hợp đồng (tháng)"
                name="contractTerm"
                rules={[
                    { type: 'number', message: 'Thời hạn hợp đồng phải là số' },
                    { required: true, message: 'Thời hạn hợp dồng là bắt buộc' },
                ]}
            >
                <InputNumber
                    placeholder="Nhập thời hạn hợp đồng"
                    style={{ width: '100%' }}
                />
            </Form.Item>
        </>
    );
}

export default ContractTypesForm;

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
                    { max: 20, message: 'Tên loại hợp đồng tối đa 20 ký tự' }
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
                    { type: 'number', message: 'Thời hạn hợp đồng phải là số' }
                ]}
            >
                <InputNumber
                    placeholder="Nhập thời hạn hợp đồng"
                    style={{ width: '100%' }}
                />
            </Form.Item>
            <Form.Item
                label="Bảo hiểm"
                name="insurance"
                rules={[
                    { type: 'number', message: 'Bảo hiểm phải là số' }
                ]}
            >
                <InputNumber
                    addonAfter="VND"
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                />
            </Form.Item>
        </>
    );
}

export default ContractTypesForm;

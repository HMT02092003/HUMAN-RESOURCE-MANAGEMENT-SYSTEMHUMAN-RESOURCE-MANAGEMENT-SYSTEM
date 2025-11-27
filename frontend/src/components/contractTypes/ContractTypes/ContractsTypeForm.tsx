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
                    <Select.Option value={1}>Hợp đồng Thực tập</Select.Option>
                    <Select.Option value={2}>Hợp đồng Thử việc</Select.Option>
                    <Select.Option value={3}>Hợp đồng Lao động (Có thời hạn)</Select.Option>
                    <Select.Option value={4}>Hợp đồng Lao động (Không thời hạn)</Select.Option>
                    <Select.Option value={5}>Hợp đồng Đào tạo nghề</Select.Option>
                    <Select.Option value={6}>Hợp đồng Cộng tác viên (CTV)</Select.Option>
                    <Select.Option value={7}>Hợp đồng Khoán việc</Select.Option>
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
                label="Bảo hiểm (VND)"
                name="insurance"
                rules={[
                    { required: true, message: 'Vui lòng nhập mức bảo hiểm' },
                    { type: 'number', message: 'Bảo hiểm phải là số' },
                    { validator: (_, value) => (value === undefined || value === null || value >= 0) ? Promise.resolve() : Promise.reject(new Error('Bảo hiểm không được âm')) }
                ]}
            >
                <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
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

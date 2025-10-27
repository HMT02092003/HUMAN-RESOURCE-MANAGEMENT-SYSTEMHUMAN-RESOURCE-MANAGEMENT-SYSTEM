import React from 'react';
import { Form, Input, Select, InputNumber, Checkbox, Row, Col } from 'antd';

const { TextArea } = Input;

type AllowanceDetailsProps = {
  allowanceTypes?: any[];
  initialValues?: any;
};

const AllowanceDetails: React.FC<AllowanceDetailsProps> = ({ allowanceTypes = [], initialValues = {} }) => {
  return (
    <>
      <Row gutter={16}>
        <Col xs={24} md={244}>
          <Form.Item
            name="name"
            label="Tên phụ cấp"
            rules={[{ required: true, message: 'Vui lòng nhập tên phụ cấp' }]}
          >
            <Input placeholder="Tên phụ cấp" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="default_amount" label="Số tiền" rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}>
            <InputNumber
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value || '').replace(/,\s*/g, '')}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'center' }}>
          <Form.Item name="is_taxable" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Chịu thuế thu nhập cá nhân</Checkbox>
          </Form.Item>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

export default AllowanceDetails;

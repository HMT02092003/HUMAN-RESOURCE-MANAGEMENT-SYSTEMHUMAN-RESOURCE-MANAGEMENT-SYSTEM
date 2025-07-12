"use client";

import React from 'react';
import { Button, Form, Col, Row } from 'antd';
import { LeftCircleFilled } from '@ant-design/icons';
import ContractInfo from './Users/ContractInfo';

interface ContractInfoProps {
  data: any;
  setActiveTab: (key: string) => void;
}

const ContractInfoWrapper: React.FC<ContractInfoProps> = ({ data, setActiveTab }) => {
  const [form] = Form.useForm();

  if (!data) {
    return null;
  }

  return (
    <Form
      form={form}
      layout="vertical"
      name="editAdmin"
      scrollToFirstError
    >
      <Row>
        <Col md={{ span: 24 }}>
          <ContractInfo data={data} />
          <Form.Item wrapperCol={{ span: 24 }} className="text-center">
            <Button onClick={() => setActiveTab("1")} className="btn-margin-right">
              <LeftCircleFilled /> Quay lại
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default ContractInfoWrapper;
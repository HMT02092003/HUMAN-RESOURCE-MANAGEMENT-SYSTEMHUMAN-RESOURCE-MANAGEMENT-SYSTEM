"use client";

import React, { use, useState } from 'react'

import { Button, Form, message } from "antd";
import { LeftCircleFilled, SaveFilled } from "@ant-design/icons";

import ContractTypesForm from '@/src/components/contractTypes/ContractTypes/ContractsTypeForm';
import { useRouter } from 'next/navigation';
import { contractTypeService } from '@/src/service/contractTypeService';


const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 18 },
  },
};

const Create = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter()

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await contractTypeService.createContractType(values);
      message.success('Tạo mới loại hợp đồng thành công');
      router.push('/contractTypes');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi server không phản hồi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <Form
        {...formItemLayout}
        form={form}
        name="CreateContractType"
        onFinish={onFinish}
        scrollToFirstError
      >
        <ContractTypesForm />
        <Form.Item wrapperCol={{ span: 24 }} className="text-center" style={{ display: "flex", justifyContent: "center" }}>
          <Button onClick={() => router.back()} className="btn-margin-right">
            <LeftCircleFilled /> Trở về
          </Button>
          &nbsp;&nbsp;&nbsp;
          <Button type="primary" htmlType="submit" loading={loading} className="btn-margin-right">
            <SaveFilled /> Lưu
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
};

Create.permissions = {
  contractTypes: "C",
};

export default Create
import React, { useState } from 'react'

import { Button, Form, message } from "antd";
import { LeftCircleFilled, SaveFilled } from "@ant-design/icons";

import DepartmentsForm from '@/components/departments/Departments/DepartmentsForm';
import { useRouter } from "next/navigation";
import { departmentService } from '@/service/departmentService';



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
      await departmentService.createDepartment(values);
      message.success('Tạo mới phòng ban thành công');
      router.push('/departments');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi server không phản hồi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <Form
        {...formItemLayout}
        form={form}
        name="createDepartment"
        onFinish={onFinish}
        scrollToFirstError
      >
        <DepartmentsForm />
        <Form.Item wrapperCol={{ span: 24 }} style={{ justifyContent: "center", display: "flex", }}>
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
}

export default Create

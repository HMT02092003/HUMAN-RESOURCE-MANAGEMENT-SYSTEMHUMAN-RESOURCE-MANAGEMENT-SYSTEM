"use client";

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic';

import { Button, Form, message, Spin, Modal } from 'antd';
import { LeftCircleFilled, SaveFilled, DeleteFilled } from '@ant-design/icons';
import to from 'await-to-js'

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

interface AdminMainLayoutProps {
  id?: string;
}

const Edit: React.FC<AdminMainLayoutProps> = ({ id }) => {
  const [loading, setLoading] = useState(false);
  const [contractType, setContractType]: any[] = useState();
  const [form] = Form.useForm();
  const router = useRouter()

  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;



  const fetchData = async () => {
    if (!id) {
      return message.error(`Bản ghi không tồn tại`);
    }

    setLoading(true);
    try {
      const data = await contractTypeService.getContractTypeDetail(id);
      setContractType(data);
      form.setFieldsValue(data);
    } catch (error: any) {
      console.error('Failed to fetch contract type:', error);
      message.error(`Lỗi:${error.response?.data?.code || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await contractTypeService.updateContractType(id!, values);
      message.success("Cập nhật thành công!");
      router.push("/contractTypes");
    } catch (error: any) {
      console.error("Error updating contract type:", error);
      message.error("Đã xảy ra lỗi khi cập nhật.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      if (!id) {
        return message.error("Lỗi:9996 - missing ID");
      }

      await contractTypeService.deleteContractType(id);
      message.success("Xóa thành công!");
      router.push("/contractTypes");
    } catch (error: any) {
      console.error("Error deleting contract type:", error);
      message.error("Đã xảy ra lỗi khi xóa.");
    } finally {
      setLoading(false);
    }
  };

  if (!contractType) return <div className="content"><Spin /></div>


  return (
    <div className="content">
      <Form
        {...formItemLayout}
        form={form}
        name="editContractTypeGroup"
        initialValues={{
          ...contractType
        }}
        onFinish={onFinish}
        scrollToFirstError
      >
        <ContractTypesForm />
        <Form.Item wrapperCol={{ span: 24 }} className="text-center" style={{ justifyContent: "center", display: "flex" }}>
          <Button onClick={() => router.back()} className="btn-margin-right">
            <LeftCircleFilled /> Trở về
          </Button>
          &nbsp;&nbsp;&nbsp;
          <Button type="primary" htmlType="submit" className="btn-margin-right" loading={loading}>
            <SaveFilled /> Lưu
          </Button>
          &nbsp;&nbsp;&nbsp;
          <Button hidden={!deletePer} danger
            onClick={() => {
              Modal.confirm({
                title: "Bạn xác nhận xóa chức vụ này?",
                content: "Chức vụ này sẽ bị xóa vĩnh viễn",
                onOk: () => onDelete()
              })
            }}
          >
            <DeleteFilled /> Xóa
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default Edit
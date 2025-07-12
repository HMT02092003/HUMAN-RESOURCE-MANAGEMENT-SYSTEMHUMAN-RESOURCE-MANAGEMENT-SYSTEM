import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic';

import { Button, Form, message, Spin, Modal } from 'antd';
import { LeftCircleFilled, SaveFilled, DeleteFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

import ChevronsForm from '@/src/components/chevrons/Chevrons/ChevronsForm';
import { chevronService } from '@/src/service/chevronService';



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
  const [chevron, setChevron]: any[] = useState();
  const [form] = Form.useForm();
  const router = useRouter()

  const fetchData = async () => {
    if (!id) {
      return message.error(`Lỗi:9996 - missing ID`);
    }

    try {
      const data = await chevronService.getChevronDetail(id);
      const formattedChevron = {
        ...data,
        chevronCoefficient: Number(data.chevronCoefficient),
      };

      setChevron(formattedChevron);
      form.setFieldsValue(formattedChevron);
    } catch (error: any) {
      message.error(`Lỗi:${error.response?.data?.code || 'Unknown error'}`);
    }
  };


  useEffect(() => {
    fetchData()
  }, []);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await chevronService.updateChevron(id!, values);
      message.success("Cập nhật thành công!");
      router.push("/chevrons");
    } catch (error: any) {
      console.error("Error updating chevron:", error);
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

      await chevronService.deleteChevron(id);
      message.success("Xóa thành công!");
      router.push("/chevrons");
    } catch (error: any) {
      console.error("Error deleting chevron:", error);
      message.error("Đã xảy ra lỗi khi xóa.");
    } finally {
      setLoading(false);
    }
  };

  if (!chevron) return <div className="content"><Spin /></div>

  return (
    <div className="content">
      <Form
        {...formItemLayout}
        form={form}
        name="editChevronGroup"
        initialValues={{
          ...chevron
        }}
        onFinish={onFinish}
        scrollToFirstError
      >
        <ChevronsForm />
        <Form.Item wrapperCol={{ span: 24 }} className="text-center" style={{ justifyContent: "center", display: "flex", }}>
          <Button onClick={() => router.back()} className="btn-margin-right">
            <LeftCircleFilled /> Trở về
          </Button>
          &nbsp;&nbsp;&nbsp;
          <Button type="primary" htmlType="submit" className="btn-margin-right" loading={loading}>
            <SaveFilled /> Lưu
          </Button>
          &nbsp;&nbsp;&nbsp;
          <Button danger
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
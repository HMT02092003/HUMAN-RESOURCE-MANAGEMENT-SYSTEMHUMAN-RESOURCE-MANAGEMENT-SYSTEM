import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic';

import { Button, Form, message, Spin, Modal } from 'antd';
import { LeftCircleFilled, SaveFilled, DeleteFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

import DepartmentsForm from '@/src/components/departments/Departments/DepartmentsForm';
import { departmentService } from '@/src/service/departmentService';



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
  const [department, setDepartment]: any[] = useState();
  const [form] = Form.useForm();
  const router = useRouter()

  const fetchData = async () => {
    if (!id) {
      return message.error(`Bản ghi không tồn tại`);
    }

    setLoading(true);
    try {
      const data = await departmentService.getDepartmentDetail(id);
      setDepartment(data);
      form.setFieldsValue(data);
    } catch (error: any) {
      console.error('Failed to fetch department:', error);
      message.error(`Lỗi:${error.response?.data?.code || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData()
  }, []);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await departmentService.updateDepartment(id!, values);
      message.success("Cập nhật thành công!");
      router.push("/departments");
    } catch (error: any) {
      console.error("Error updating department:", error);
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

      await departmentService.deleteDepartment(id);
      message.success("Xóa thành công!");
      router.push("/departments");
    } catch (error: any) {
      console.error("Error deleting department:", error);
      message.error("Đã xảy ra lỗi khi xóa.");
    } finally {
      setLoading(false);
    }
  };

  if (!department) return <div className="content"><Spin /></div>

  return (
    <div className="content">
      <Form
        {...formItemLayout}
        form={form}
        name="editDepartmentGroup"
        initialValues={{
          ...department
        }}
        onFinish={onFinish}
        scrollToFirstError
      >
        <DepartmentsForm />
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
                title: "Bạn xác nhận xóa phòng ban này?",
                content: "Phòng ban này sẽ bị xóa vĩnh viễn",
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
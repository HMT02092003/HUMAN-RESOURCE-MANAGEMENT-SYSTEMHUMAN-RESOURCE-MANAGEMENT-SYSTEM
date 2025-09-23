"use client";

import React, { useState, useEffect } from 'react';
import { Col, Row, message } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import UserForm from './Users/UserForm';
import UserService from '@/service/userService';

const Edit = () => {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const id = params.id;
        if (!id) {
          message.error('Không tìm thấy ID người dùng');
          return;
        }

        const response = await UserService.getUserDetail(parseInt(id as string));
        setUserData(response);
      } catch (error: any) {
        message.error(error.message || 'Có lỗi xảy ra khi tải dữ liệu');
      }
    };

    fetchData();
  }, [params.id]);

  const handleFinish = async (values: any) => {
    try {
      setLoading(true);
      await UserService.updateUser(userData.id, values);
      message.success('Cập nhật người dùng thành công');
      router.push('/user');
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await UserService.deleteUser(userData.id);
      message.success('Xóa người dùng thành công');
      router.push('/user');
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi xóa');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return <div className="content">Đang tải...</div>;
  }

  return (
    <div className="content">
      <Row>
        <Col xs={24} md={{ span: 16, offset: 4 }}>
          <UserForm
            isEdit={true}
            onFinish={handleFinish}
            onBack={() => router.push('/user')}
            onDelete={handleDelete}
            deletePer={true}
            initialValues={userData}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Edit;

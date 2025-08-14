"use client";

import React, { useState, useEffect } from 'react';
import { Col, Row, message } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import ContractForm from './Users/ContractForm';
import UserService from '@/src/service/userService';

const CreateContract = () => {
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

        const response = await UserService.getUserById(parseInt(id as string));
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
      await UserService.createContract(userData.id, values);
      message.success('Tạo hợp đồng thành công');
      router.push('/user');
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi tạo hợp đồng');
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
          <ContractForm
            onFinish={handleFinish}
            onBack={() => router.push('/user')}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};

export default CreateContract;
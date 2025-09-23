"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, Form, Row, Col, message } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import ContractInfo from './Users/ContractInfo';
import UserInfo from './userInfo';
import SalaryInfo from './Users/SalaryInfo';
import UserService from '@/service/userService';

const View = () => {
  const [activeTab, setActiveTab] = useState("1");
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const getStatusString = (status: string): string => {
    const statusMap: Record<string, string> = {
      '1': 'Đang làm việc',
      '2': 'Đã nghỉ việc',
      '3': 'Nghỉ thai sản'
    };
    return statusMap[status] || '';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const id = params.id;
        if (!id) {
          message.error('Không tìm thấy ID người dùng');
          return;
        }
        setLoading(true);
        const response = await UserService.getUserDetail(parseInt(id as string));
        const formattedData = {
          ...response,
          status: getStatusString(response.status)
        };
        setUserData(formattedData);
      } catch (error: any) {
        message.error(error.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const items = [
    {
      key: "1",
      label: <div style={{ textAlign: "center" }}>Thông tin người dùng</div>,
      children: (
        <Row>
          <Col xs={24} md={{ span: 24 }}>
            <UserInfo userData={userData} setActiveTab={setActiveTab} />
          </Col>
        </Row>
      ),
    },
    {
      key: "2",
      label: <div style={{ textAlign: "center" }}>Thông tin lương</div>,
      children: userData ? <SalaryInfo userId={parseInt(params.id as string)} userData={userData} /> : null,
    },
    {
      key: "3",
      label: <div style={{ textAlign: "center" }}>Thông tin hợp đồng của người dùng</div>,
      children: <ContractInfo data={userData} />,
    },
  ];

  return (
    <div className="content">
      <Row>
        <Col xs={24} md={{ span: 24 }}>
          <Tabs
            defaultActiveKey="1"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={items}
            style={{ margin: "0 30px" }}
          />
          <Form.Item wrapperCol={{ span: 24 }} className="text-center">
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
};

export default View;
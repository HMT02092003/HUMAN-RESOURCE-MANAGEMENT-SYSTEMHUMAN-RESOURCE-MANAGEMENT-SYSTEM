"use client";

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Button, Form, Col, Row, Descriptions, Spin, theme, Table } from 'antd';
import { LeftOutlined, RightCircleFilled } from '@ant-design/icons';
import type { DescriptionsProps } from 'antd';
import { useRouter } from 'next/navigation';

const Gender = [
  { key: 1, value: "Nam" },
  { key: 2, value: "Nữ" },
  { key: 3, value: "Khác" }
];

const Relationship = [
  { key: 1, value: "Cha", label: "Cha" },
  { key: 2, value: "Mẹ", label: "Mẹ" },
  { key: 3, value: "Vợ/Chồng", label: "Vợ/Chồng" },
  { key: 4, value: "Con", label: "Con" }
];

interface FamilyMember {
  name: string;
  birthday: string;
  relationship: string;
  dependent: boolean;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  birthday: Date;
  email: string;
  phone: string;
  gender: string;
  status: string;
  startDate: Date;
  profileFamily: FamilyMember[];
  role: { name: string };
  department: { name: string };
  chevron: { name: string };
}

interface UserInfoProps {
  userData: User;
  setActiveTab: (key: string) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ userData, setActiveTab }) => {
  const router = useRouter();
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const getRelationshipLabel = (value: number): string => {
    const relationship = Relationship.find((item) => item.key === value);
    return relationship ? relationship.label : ' ';
  };

  const getGenderLabel = (key: string): string => {
    const gender = Gender.find((item) => item.key === parseInt(key));
    return gender ? gender.value : ' ';
  };

  const userItems: DescriptionsProps['items'] = [
    {
      key: '1',
      label: <h4>ID</h4>,
      children: userData?.id || ' ',
    },
    {
      key: '2',
      label: <h4>Họ và tên</h4>,
      children: `${userData?.lastName || ''} ${userData?.firstName || ''}` || ' ',
    },
    {
      key: '3',
      label: <h4>Ngày sinh</h4>,
      children: userData?.birthday ? dayjs(userData.birthday).format('DD/MM/YYYY') : ' ',
    },
    {
      key: '4',
      label: <h4>Số điện thoại</h4>,
      children: userData?.phone || ' ',
    },
    {
      key: '5',
      label: <h4>Giới tính</h4>,
      children: getGenderLabel(userData?.gender || '0') || ' ',
    },
  ];
  
  const jobItems: DescriptionsProps['items'] = [
    {
      key: '1',
      label: <h4>Vai trò</h4>,
      children: userData?.role?.name || ' ',
    },
    {
      key: '2',
      label: <h4>Phòng ban</h4>,
      children: userData?.department?.name || ' ',
    },
    {
      key: '3',
      label: <h4>Chức vụ</h4>,
      children: userData?.chevron?.name || ' ',
    },
    {
      key: '4',
      label: <h4>Email</h4>,
      children: userData?.email || ' ',
    },
    {
      key: '5',
      label: <h4>Trạng thái</h4>,
      children: userData?.status || ' ',
    },
    {
      key: '6',
      label: <h4>Ngày bắt đầu</h4>,
      children: userData?.startDate ? dayjs(userData.startDate).format('DD/MM/YYYY') : ' ',
    },
  ];

  const columns = [
    { title: 'Họ và tên', dataIndex: 'name', key: 'name' },
    { title: 'Quan hệ', dataIndex: 'relationship', key: 'relationship', render: (value: number) => getRelationshipLabel(value) },
    { title: 'Ngày sinh', dataIndex: 'birthday', key: 'birthday', render: (text: string) => dayjs(text).format('DD/MM/YYYY') },
    { title: 'Phụ thuộc', dataIndex: 'dependent', key: 'dependent', render: (text: boolean) => (text ? 'Có' : 'Không') },
  ];

  return (
    <div style={{ padding: token.padding }}>
      <Descriptions
        title="Thông tin cá nhân"
        items={userItems}
        column={3}
        labelStyle={{ fontWeight: 700, color: '#000', width: '100px' }}
        contentStyle={{ backgroundColor: token.colorBgContainer }}
      />

      <Descriptions
        title="Công việc"
        items={jobItems}
        column={3}
        labelStyle={{ fontWeight: 700, color: '#000', width: '100px' }}
        contentStyle={{ backgroundColor: token.colorBgContainer }}
      />
      <Descriptions
        title="Thông tin gia đình"
      />
      <Table
        dataSource={userData?.profileFamily?.map((member, index) => ({ key: index, ...member })) || []}
        columns={columns}
        pagination={false}
        bordered
        style={{ marginBottom: token.margin }}
      />

      <Form form={form} layout="vertical" style={{ marginTop: token.margin }}>
        <Row>
          <Col xs={24} md={{ span: 16, offset: 4 }}>
            <Form.Item style={{ textAlign: 'center' }}>
              <Button
                onClick={() => router.push('/users')}
                style={{ marginRight: token.margin }}
                icon={<LeftOutlined />}
              >
                Quay lại
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="btn-margin-right"
                onClick={() => setActiveTab("2")}
              >
                <RightCircleFilled /> Tiếp tục
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default UserInfo;

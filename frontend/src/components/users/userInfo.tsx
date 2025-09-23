"use client";

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Button, Form, Col, Row, Descriptions, theme, Table, Grid } from 'antd';
import { LeftOutlined, RightCircleFilled } from '@ant-design/icons';
import type { DescriptionsProps } from 'antd';
import { useRouter } from 'next/navigation';
import constantConfig from '@/config/constant';

// Use shared constants to avoid mapping mismatches
const { Gender, Relationship } = constantConfig;

interface FamilyMember {
  fullName?: string;
  birthday?: string;
  relationship?: number;
  dependent?: boolean;
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
  identificationPhoto?: string;
}

interface UserInfoProps {
  userData: User;
  setActiveTab: (key: string) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ userData, setActiveTab }) => {
  const router = useRouter();
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const getRelationshipLabel = (value?: number): string => {
    if (value === undefined || value === null) return '-';
    const relationship = Relationship.find((item: any) => item.value === value);
    return relationship ? relationship.label : '-';
  };

  const getGenderLabel = (val?: string | number): string => {
    if (val === undefined || val === null || val === '') return '-';
    const numeric = typeof val === 'string' ? parseInt(val, 10) : val;
    const gender = Gender.find((item: any) => item.key === numeric);
    return gender ? itemLabel(gender) : '-';
  };

  const itemLabel = (g: any) => g.value ?? g.label ?? '-';

  const userItems: DescriptionsProps['items'] = [
    {
      key: '1',
      label: 'ID',
      children: userData?.id ?? '-',
    },
    {
      key: 'avatar',
      label: 'Ảnh nhận diện',
      children: userData?.identificationPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="avatar"
          src={userData.identificationPhoto.startsWith('/')
            ? userData.identificationPhoto
            : `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}${userData.identificationPhoto}`}
          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
        />
      ) : '-',
    },
    {
      key: '2',
      label: 'Họ và tên',
      children: `${userData?.lastName || ''} ${userData?.firstName || ''}`.trim() || '-',
    },
    {
      key: '3',
      label: 'Ngày sinh',
      children: userData?.birthday ? dayjs(userData.birthday).format('DD/MM/YYYY') : '-',
    },
    {
      key: '4',
      label: 'Số điện thoại',
      children: userData?.phone || '-',
    },
    {
      key: '5',
      label: 'Giới tính',
      children: getGenderLabel(userData?.gender),
    },
  ];
  
  const jobItems: DescriptionsProps['items'] = [
    {
      key: '1',
      label: 'Vai trò',
      children: userData?.role?.name || '-',
    },
    {
      key: '2',
      label: 'Phòng ban',
      children: userData?.department?.name || '-',
    },
    {
      key: '3',
      label: 'Chức vụ',
      children: userData?.chevron?.name || '-',
    },
    {
      key: '4',
      label: 'Email',
      children: userData?.email || '-',
    },
    {
      key: '5',
      label: 'Trạng thái',
      children: userData?.status || '-',
    },
    {
      key: '6',
      label: 'Ngày bắt đầu',
      children: userData?.startDate ? dayjs(userData.startDate).format('DD/MM/YYYY') : '-',
    },
  ];

  const columns = [
    { title: 'Họ và tên', dataIndex: 'name', key: 'name', render: (text: string) => text || '-' },
    { title: 'Quan hệ', dataIndex: 'relationship', key: 'relationship', render: (value?: number) => getRelationshipLabel(value) },
    { title: 'Ngày sinh', dataIndex: 'birthday', key: 'birthday', render: (text?: string) => (text ? dayjs(text).format('DD/MM/YYYY') : '-') },
    { title: 'Phụ thuộc', dataIndex: 'dependent', key: 'dependent', render: (text?: boolean) => (text ? 'Có' : 'Không') },
  ];

  return (
    <div style={{ padding: token.padding }}>
      <Descriptions
        title="Thông tin cá nhân"
        items={userItems}
        column={screens.lg ? 3 : 1}
        labelStyle={{ fontWeight: 700, color: '#000', minWidth: 120 }}
        contentStyle={{ backgroundColor: token.colorBgContainer }}
      />

      <Descriptions
        title="Công việc"
        items={jobItems}
        column={screens.lg ? 3 : 1}
        labelStyle={{ fontWeight: 700, color: '#000', minWidth: 120 }}
        contentStyle={{ backgroundColor: token.colorBgContainer }}
      />
      <Descriptions
        title="Thông tin gia đình"
      />
      <Table
        dataSource={userData?.profileFamily?.map((member: FamilyMember, index: number) => ({ key: index, ...member })) || []}
        columns={columns}
        pagination={false}
        bordered
        style={{ marginBottom: token.margin }}
        locale={{ emptyText: 'Chưa có dữ liệu gia đình' }}
      />

      <Form form={form} layout="vertical" style={{ marginTop: token.margin }}>
        <Row>
          <Col xs={24} md={{ span: 16, offset: 4 }}>
            <Form.Item style={{ textAlign: 'center' }}>
              <Button
                onClick={() => router.push('/user')}
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

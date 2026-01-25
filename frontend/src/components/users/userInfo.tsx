"use client";

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Button, Form, Col, Row, Descriptions, theme, Table, Grid, Space } from 'antd';
import { LeftOutlined, RightCircleFilled } from '@ant-design/icons';
import type { DescriptionsProps } from 'antd';
import { useRouter } from 'next/navigation';
import constantConfig from '@/config/constant';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import { getPhotoUrl } from '@/utils/photo';

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
  fullName: string;
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
          src={getPhotoUrl(userData.identificationPhoto)}
          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
        />
      ) : '-',
    },
    {
      key: '2',
      label: 'Họ và tên',
      children: userData?.fullName || '-',
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
      {/* Top area: avatar on left (~1/3) and details on right (~2/3) */}
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} md={8} style={{ textAlign: screens.lg ? 'left' : 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: screens.lg ? 'flex-start' : 'center' }}>
            {userData?.identificationPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="avatar"
                src={getPhotoUrl(userData.identificationPhoto)}
                style={{ width: '100%', maxWidth: 240, height: 240, objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: '100%', maxWidth: 240, height: 240, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                <span style={{ color: '#999' }}>No image</span>
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: screens.lg ? 'left' : 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                {userData?.fullName || '-'}
              </div>
              <div style={{ color: '#666', marginTop: 6 }}>{userData?.username || '-'}</div>
            </div>
          </div>
        </Col>

        <Col xs={24} md={16}>
          <Descriptions
            title="Thông tin cơ bản"
            items={userItems.filter(i => i.key !== 'avatar' && i.key !== '2')}
            column={screens.lg ? 2 : 1}
            labelStyle={{ fontWeight: 700, color: '#000', minWidth: 120 }}
            contentStyle={{ backgroundColor: token.colorBgContainer }}
          />

          <br />

          <Descriptions
            title="Công việc"
            items={jobItems}
            column={screens.lg ? 2 : 1}
            labelStyle={{ fontWeight: 700, color: '#000', minWidth: 120 }}
            contentStyle={{ backgroundColor: token.colorBgContainer }}
          />
        </Col>
      </Row>
      <br /><br />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Descriptions
          title="Thông tin gia đình"
        />
        <ExcelExportButton
          data={userData?.profileFamily?.map((member: FamilyMember, index: number) => ({
            name: member.fullName,
            relationship: getRelationshipLabel(member.relationship),
            birthday: member.birthday ? dayjs(member.birthday).format('DD/MM/YYYY') : '-',
            dependent: member.dependent ? 'Có' : 'Không'
          })) || []}
          columns={[
            { title: 'Họ và tên', dataIndex: 'name', width: 30 },
            { title: 'Quan hệ', dataIndex: 'relationship', width: 20 },
            { title: 'Ngày sinh', dataIndex: 'birthday', width: 15 },
            { title: 'Phụ thuộc', dataIndex: 'dependent', width: 15 }
          ]}
          fileName={`thong-tin-gia-dinh-${userData?.username || 'user'}-${dayjs().format('YYYY-MM-DD')}`}
          title="THÔNG TIN GIA ĐÌNH"
          description={`Nhân viên: ${userData?.fullName || ''} - Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
          buttonSize="small"
        />
      </div>
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

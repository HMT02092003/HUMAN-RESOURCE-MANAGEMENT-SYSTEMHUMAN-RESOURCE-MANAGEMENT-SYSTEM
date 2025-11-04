'use client';

import React from 'react';
import { Modal, Row, Col, List, Typography, Divider, Button } from 'antd';
import { WarningOutlined, UserOutlined, HourglassOutlined, MoneyCollectOutlined } from '@ant-design/icons';

interface InvalidUser {
  userId: number | string;
  username?: string | null;
  fullName?: string | null;
}

interface InvalidUsersModalProps {
  open: boolean;
  onClose: () => void;
  usersWithoutContracts?: InvalidUser[];
  usersWithoutApprovedAttendance?: InvalidUser[];
  usersWithoutSalaryProfile?: InvalidUser[];
}

const EmptyList: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ padding: 12, textAlign: 'center', color: 'rgba(0,0,0,0.45)' }}>{message}</div>
);

const RenderUserList: React.FC<{ users: InvalidUser[]; title: string }> = ({ users, title }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>
    </div>
    <Divider style={{ margin: '8px 0' }} />
    {users && users.length > 0 ? (
      <List
        dataSource={users}
        renderItem={(user) => (
          <List.Item style={{ padding: '8px 12px' }}>
            <List.Item.Meta
              avatar={<UserOutlined />}
              title={<span style={{ fontWeight: 600 }}>{user.username || `User ${user.userId}`}</span>}
              description={user.fullName && user.fullName.trim() ? user.fullName : `ID: ${user.userId}`}
            />
          </List.Item>
        )}
        style={{ overflowY: 'auto', maxHeight: 360 }}
      />
    ) : (
      <EmptyList message="Không có người dùng nào" />
    )}
    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
      <Typography.Text type="secondary">Tổng: {users?.length ?? 0} người</Typography.Text>
    </div>
  </div>
);

const InvalidUsersModal: React.FC<InvalidUsersModalProps> = ({
  open,
  onClose,
  usersWithoutContracts = [],
  usersWithoutApprovedAttendance = [],
  usersWithoutSalaryProfile = []
}) => {
  const totalIssues = (usersWithoutContracts?.length || 0) + (usersWithoutApprovedAttendance?.length || 0) + (usersWithoutSalaryProfile?.length || 0);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      width={1000}
      title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><WarningOutlined style={{ color: '#faad14' }} /> Danh sách người dùng không hợp lệ ({totalIssues})</span>}
    >
      <Typography.Paragraph>
        Có <strong>{totalIssues}</strong> người dùng không thể tính lương do thiếu thông tin. Vui lòng kiểm tra và cập nhật thông tin trước khi tính lương lại.
      </Typography.Paragraph>

      <Row gutter={16} style={{ marginTop: 8 }}>
        <Col xs={24} md={8}>
          <div style={{ padding: 8, borderRadius: 6, border: '1px solid #f0f0f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>Chưa có hợp đồng</Typography.Title>
            </div>
            <RenderUserList users={usersWithoutContracts || []} title="Chưa có hợp đồng" />
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div style={{ padding: 8, borderRadius: 6, border: '1px solid #f0f0f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HourglassOutlined style={{ color: '#faad14', fontSize: 20 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>Chưa duyệt bảng công</Typography.Title>
            </div>
            <RenderUserList users={usersWithoutApprovedAttendance || []} title="Chưa duyệt bảng công" />
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div style={{ padding: 8, borderRadius: 6, border: '1px solid #f0f0f0', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MoneyCollectOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>Chưa có thông tin lương</Typography.Title>
            </div>
            <RenderUserList users={usersWithoutSalaryProfile || []} title="Chưa có thông tin lương" />
          </div>
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <Typography.Text type="secondary">Lưu ý: Đảm bảo tất cả người dùng có hợp đồng đang hiệu lực, bảng chấm công đã được duyệt và có thông tin lương trước khi tính lương.</Typography.Text>
      </div>
    </Modal>
  );
};

export default InvalidUsersModal;

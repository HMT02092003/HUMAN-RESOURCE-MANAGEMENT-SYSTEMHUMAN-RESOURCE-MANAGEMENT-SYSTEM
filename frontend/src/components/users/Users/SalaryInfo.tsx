"use client";

import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Spin, message, Button, Modal } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import UserService from '@/src/service/userService';
import SalaryModal from '../SalaryModal';

const { Title, Text } = Typography;

interface SalaryInfoProps {
  userId: number;
  userData?: any;
}

const SalaryInfo: React.FC<SalaryInfoProps> = ({ userId, userData }) => {
  const [loading, setLoading] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchSalaryInfo = async () => {
    try {
      setLoading(true);
      const response = await UserService.getSalaryInfo(userId);
      setSalaryInfo(response.data);
    } catch (error: any) {
      message.error("Không thể lấy thông tin lương");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSalaryInfo();
    }
  }, [userId]);

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleUpdateSalary = async (values: any) => {
    setModalLoading(true);
    try {
      await UserService.updateSalaryInfo(userId, values);
      message.success("Cập nhật thông tin lương thành công!");
      handleCloseModal();
      fetchSalaryInfo(); // Refresh data
    } catch (error: any) {
      const data = error?.response?.data;
      message.error(data?.message || "Có lỗi xảy ra khi cập nhật lương");
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              Thông tin lương - {userData?.firstName} {userData?.lastName}
            </Title>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleOpenModal}
            >
              Chỉnh sửa
            </Button>
          </div>
        }
        bordered={false}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">Lương cơ bản</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                {(salaryInfo?.salary || 0).toLocaleString('vi-VN')} VNĐ
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">Phụ cấp</Text>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                {(salaryInfo?.allowance || 0).toLocaleString('vi-VN')} VNĐ
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">Tổng lương</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f5222d' }}>
                {(salaryInfo?.totalSalary || 0).toLocaleString('vi-VN')} VNĐ
              </div>
            </div>
          </Col>
        </Row>

        <Row style={{ marginTop: '24px' }}>
          <Col span={24}>
            <Card 
              size="small" 
              title="Chi tiết lương" 
              style={{ backgroundColor: '#fafafa' }}
            >
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Mã nhân viên:</Text>
                </Col>
                <Col span={12}>
                  <Text>{`NV${userId.toString().padStart(4, '0')}`}</Text>
                </Col>
                
                <Col span={12}>
                  <Text strong>Họ tên:</Text>
                </Col>
                <Col span={12}>
                  <Text>{userData?.firstName} {userData?.lastName}</Text>
                </Col>
                
                <Col span={12}>
                  <Text strong>Phòng ban:</Text>
                </Col>
                <Col span={12}>
                  <Text>{userData?.department?.name || 'N/A'}</Text>
                </Col>
                
                <Col span={12}>
                  <Text strong>Chức vụ:</Text>
                </Col>
                <Col span={12}>
                  <Text>{userData?.chevron?.name || 'N/A'}</Text>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      <SalaryModal
        visible={modalVisible}
        onCancel={handleCloseModal}
        onOk={handleUpdateSalary}
        loading={modalLoading}
        salaryInfo={salaryInfo}
      />
    </div>
  );
};

export default SalaryInfo;

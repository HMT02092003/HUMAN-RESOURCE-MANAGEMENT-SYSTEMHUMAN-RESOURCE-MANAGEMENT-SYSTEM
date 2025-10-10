"use client";

import React, { useState, useEffect } from 'react';
import { Table, Button, message, Tag, Grid, ConfigProvider, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { CheckCircleOutlined, HomeOutlined } from '@ant-design/icons';
import UserService from '@/service/userService';
import constantConfig from '@/config/constant';
import dayjs from 'dayjs';
import { keys } from 'lodash';
import { render } from 'react-dom';

const { statusOptions, Gender } = constantConfig;

// Format date utility
const formatDate = (date: string | Date | null): string => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

// Sort state interface
interface SorterState {
  field: string;
  order: 'ascend' | 'descend' | undefined;
}

const AttendanceApprovalManagement = () => {
  const [userData, setUserData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorter, setSorter] = useState<SorterState>({
    field: 'id',
    order: 'descend'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const router = useRouter();
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, sorter.field, sorter.order]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sortOrderApi = sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : undefined;
      
      const response = await UserService.getAllUsers({
        page: pagination.current - 1,
        pageSize: pagination.pageSize,
        sortField: sorter.field, 
        sortOrder: sortOrderApi
      } as any);

      console.log('API Response:', response); // Debug log

      setUserData(response.results);
      setPagination(prev => ({
        ...prev,
        total: response.total
      }));
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi tải người dùng!');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination: any, filters: any, newSorter: any) => {
    setPagination(newPagination);
    
    // Cập nhật trạng thái sắp xếp
    if (newSorter.field) {
      setSorter({
        field: newSorter.field,
        order: newSorter.order as 'ascend' | 'descend' | undefined,
      });
    } else {
      // Nếu không có sắp xếp, trở về mặc định
      setSorter({ field: 'id', order: 'descend' });
    }
  };

  // Handle navigate to attendance detail
  const handleApproveAttendance = (userId: number) => {
    router.push(`/attendance?userId=${userId}`);
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "",
      keys: "",
      sorter: true,
      defaultSortOrder: sorter.field === 'index' ? sorter.order : undefined,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
      width: 6,
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      sorter: true,
      defaultSortOrder: sorter.field === 'fullName' ? sorter.order : undefined,
      render: (_: any, record: any) => `${record.lastName || ''} ${record.firstName || ''}`.trim()
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: true,
      defaultSortOrder: sorter.field === 'email' ? sorter.order : undefined,
      render: (text: string) => text || '-'
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      sorter: true,
      defaultSortOrder: sorter.field === 'phone' ? sorter.order : undefined,
      render: (text: string) => text || '-'
    },
    {
      title: "Vai trò",
      dataIndex: "role.name",
      key: "role.name",
      sorter: true,
      defaultSortOrder: sorter.field === 'role.name' ? sorter.order : undefined,
      render: (_: any, record: any) => `${record.role?.name || ''}`.trim()
    },
    {
      title: "Phòng ban",
      dataIndex: ["department", "name"],
      key: "department",
      sorter: true,
      defaultSortOrder: sorter.field === 'department' ? sorter.order : undefined,
      render: (text: string) => text || '-'
    },
    {
      title: "Chức vụ",
      dataIndex: ["chevron", "name"],
      key: "chevron",
      sorter: true,
      defaultSortOrder: sorter.field === 'chevron' ? sorter.order : undefined,
      render: (text: string) => text || '-'
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right" as "right",
      render: (_: any, record: any) => (
        <ConfigProvider
          theme={{
            components: {
              Button: {
                colorBgContainer: "transparent",
                colorText: "#1890ff",
                colorBorder: "transparent",
                borderRadius: 4,
                boxShadow: "none",
              },
            },
          }}
        >
          <Tooltip title="Duyệt bảng chấm công">
            <Button
              type="text"
              icon={<CheckCircleOutlined style={{ fontSize: '20px' }} />}
              onClick={() => handleApproveAttendance(record.id)}
            />
          </Tooltip>
        </ConfigProvider>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={userData}
        loading={loading}
        onChange={handleTableChange}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng số ${total} người dùng`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default AttendanceApprovalManagement;

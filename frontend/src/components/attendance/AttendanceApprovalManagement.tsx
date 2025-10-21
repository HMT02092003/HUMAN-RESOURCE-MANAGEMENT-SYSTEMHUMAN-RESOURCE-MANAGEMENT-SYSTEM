"use client";

import React, { useState, useEffect } from 'react';
import { Table, Button, message, Tag, Grid, ConfigProvider, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { CheckCircleOutlined, HomeOutlined } from '@ant-design/icons';
import UserService from '@/service/userService';
import constantConfig from '@/config/constant';
import dayjs from 'dayjs';
import { attendanceService } from '@/service/attendanceService';

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

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, sorter.field, sorter.order]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sortOrderApi = sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : undefined;
      
      const response = await attendanceService.getAllMonthlyAttendance({
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
  const handleApproveAttendance = async (userId: number) => {
    try {
      await attendanceService.approveMonthlyAttendance({ userId });
      const router = useRouter();
      router.push(`/attendance/approval/${userId}`);
    } catch (error) {
      message.error('Có lỗi xảy ra khi chuyển đến trang chi tiết chấm công!');
    }
  };

  const columns = [
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

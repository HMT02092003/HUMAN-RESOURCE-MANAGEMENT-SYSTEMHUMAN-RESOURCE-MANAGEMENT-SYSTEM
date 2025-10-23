"use client";

import React, { useState, useEffect } from 'react';
import { Table, Button, message, Tag, Grid, ConfigProvider, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';
import { CheckCircleOutlined, CheckOutlined, HomeOutlined } from '@ant-design/icons';
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
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

  const router = useRouter();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await attendanceService.getMonthlySummariesByScope({
        permissionKey: 'users',
        page: pagination.current - 1,
        pageSize: pagination.pageSize,
      });

      setUserData(response.results || []);
      setPagination(prev => ({ ...prev, total: response.total || 0 }));
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
  const handleApproveAttendance = async (monthlyAttendanceId: number) => {
    try {
      await attendanceService.approveMonthlyAttendance([monthlyAttendanceId]);
      message.success('Đã duyệt bảng chấm công');
      loadData();
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi duyệt chấm công!');
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: any) => {
        const u = record.user || {};
        return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || '—';
      }
    },
    {
      title: 'Username',
      dataIndex: ['user', 'username'],
      key: 'username'
    },
    {
      title: 'Phòng ban',
      dataIndex: ['user', 'departmentName'],
      key: 'department'
    },
    {
      title: 'Tháng',
      dataIndex: 'month', key: 'month',
      render: (val: string) => {
        if (!val) return '-';
        const parts = val.split('-');
        if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
        return dayjs(val).format('MM/YYYY');
      }
    },
    {
      title: 'Trạng thái duyệt',
      dataIndex: 'isApproved',
      key: 'isApproved',
      render: (v: any) => (
        v ? <Tag color="green">Đã duyệt</Tag> : <Tag color="red">Chưa duyệt</Tag>
      )
    },
    {
      title: 'Tổng ngày dự kiến',
      dataIndex: 'totalScheduledDays',
      key: 'totalScheduledDays'
    },
    {
      title: 'Ngày công',
      dataIndex: 'presentDays',
      key: 'presentDays'
    },
    {
      title: 'Ngày vắng',
      dataIndex: 'absentDays', key: 'absentDays'
    },
    {
      title: 'Ngày nghỉ phép',
      dataIndex: 'approvedLeaveDays',
      key: 'approvedLeaveDays'
    },
    {
      title: 'Ngày nghỉ không lý do',
      dataIndex: 'unauthorizedAbsenceDays',
      key: 'unauthorizedAbsenceDays'
    },
    {
      title: 'Công tác',
      dataIndex: 'businessTripDays',
      key: 'businessTripDays'
    },
    {
      title: 'Tổng giờ làm',
      dataIndex: 'totalWorkHours',
      key: 'totalWorkHours'
    },
    {
      title: 'Trung bình giờ',
      dataIndex: 'averageWorkHours',
      key: 'averageWorkHours'
    },
    {
      title: 'Tổng công',
      dataIndex: 'totalWorkingUnits',
      key: 'totalWorkingUnits'
    },
    {
      title: 'OT giờ',
      dataIndex: 'totalOvertimeHours',
      key: 'totalOvertimeHours'
    },
    {
      title: 'OT lương',
      dataIndex: 'totalOvertimeSalary',
      key: 'totalOvertimeSalary'
    },
    {
      title: 'Phạt đi muộn',
      dataIndex: 'totalLatePenalty',
      key: 'totalLatePenalty'
    },
    {
      title: 'Phạt về sớm',
      dataIndex: 'totalEarlyLeavePenalty',
      key: 'totalEarlyLeavePenalty'
    },
    {
      title: 'Phạt vắng',
      dataIndex: 'totalUnauthorizedAbsencePenalty',
      key: 'totalUnauthorizedAbsencePenalty'
    },
    {
      title: 'Tổng phạt',
      dataIndex: 'totalPenalty',
      key: 'totalPenalty'
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
              icon={<CheckOutlined style={{ color: 'green' }} />}
              onClick={() => handleApproveAttendance(record.id)}
            />
          </Tooltip>
        </ConfigProvider>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newKeys: React.Key[]) => setSelectedRowKeys(newKeys),
  };

  const handleApproveSelected = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.info('Vui lòng chọn ít nhất một bản ghi');
      return;
    }
    try {
      const ids = selectedRowKeys.map(k => Number(k));
      await attendanceService.approveMonthlyAttendance(ids);
      message.success('Đã duyệt bảng chấm công cho các bản ghi đã chọn');
      setSelectedRowKeys([]);
      loadData();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi duyệt các bản ghi đã chọn');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        {selectedRowKeys.length > 0 ? (
          <Button type="primary" onClick={() => handleApproveSelected()} disabled={selectedRowKeys.length === 0}><CheckOutlined />Duyệt bảng chấm công</Button>
        ) : null}
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={userData}
        rowSelection={rowSelection}
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

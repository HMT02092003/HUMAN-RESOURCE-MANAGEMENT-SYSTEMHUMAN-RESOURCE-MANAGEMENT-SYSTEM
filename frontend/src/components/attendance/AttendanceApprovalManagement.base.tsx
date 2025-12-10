"use client";

import React, { useState, useMemo } from 'react';
import { Button, Space, Typography, message, Tooltip, Tag } from 'antd';
import { CheckOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { BaseTableRender } from '@/components/base';
import type { ServerSideColumnType } from '@/components/base';
import { attendanceService } from '@/service/attendanceService';
import dayjs from 'dayjs';

const { Title } = Typography;

const AttendanceApprovalManagement: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleApproveAttendance = async (monthlyAttendanceId: number) => {
    try {
      await attendanceService.approveMonthlyAttendance([monthlyAttendanceId]);
      message.success('Đã duyệt bảng chấm công');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi duyệt chấm công!');
    }
  };

  const handleApproveSelected = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.info('Vui lòng chọn ít nhất một bản ghi');
      return;
    }
    try {
      const toApprove = selectedRows.filter((r: any) => !r.isApproved);
      if (toApprove.length === 0) {
        message.info('Không có bản ghi nào cần duyệt');
        return;
      }
      const ids = toApprove.map((r: any) => Number(r.id));
      await attendanceService.approveMonthlyAttendance(ids);
      message.success('Đã duyệt bảng chấm công cho các bản ghi đã chọn');
      setSelectedRowKeys([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi duyệt các bản ghi đã chọn');
    }
  };

  const columns: ServerSideColumnType<any>[] = useMemo(() => [
    {
      title: 'Người dùng',
      dataIndex: ['user', 'fullName'],
      key: 'fullName',
      searchField: 'fullName',
      sortable: true,
      filterType: 'text',
      render: (_: any, record: any) => {
        const u = record.user || {};
        return u.fullName || u.firstName || u.lastName || u.username || '—';
      }
    },
    {
      title: 'Username',
      dataIndex: ['user', 'username'],
      key: 'username',
      searchField: 'username',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Phòng ban',
      dataIndex: ['user', 'department', 'name'],
      key: 'departmentName',
      searchField: 'departmentName',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      searchField: 'month',
      sortable: true,
      filterType: 'text',
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
      searchField: 'isApproved',
      sortable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Đã duyệt' },
        { value: 'false', label: 'Chưa duyệt' }
      ],
      render: (v: any) => (
        v ? <Tag color="green">Đã duyệt</Tag> : <Tag color="red">Chưa duyệt</Tag>
      )
    },
    {
      title: 'Tổng ngày dự kiến',
      dataIndex: 'totalScheduledDays',
      key: 'totalScheduledDays',
      searchField: 'totalScheduledDays',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Ngày công',
      dataIndex: 'presentDays',
      key: 'presentDays',
      searchField: 'presentDays',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Ngày vắng',
      dataIndex: 'absentDays',
      key: 'absentDays',
      searchField: 'absentDays',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Ngày nghỉ phép',
      dataIndex: 'approvedLeaveDays',
      key: 'approvedLeaveDays',
      searchField: 'approvedLeaveDays',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Ngày nghỉ không lý do',
      dataIndex: 'unauthorizedAbsenceDays',
      key: 'unauthorizedAbsenceDays',
      searchField: 'unauthorizedAbsenceDays',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Công tác',
      dataIndex: 'businessTripDays',
      key: 'businessTripDays',
      searchField: 'businessTripDays',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Tổng giờ làm',
      dataIndex: 'totalWorkHours',
      key: 'totalWorkHours',
      searchField: 'totalWorkHours',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Trung bình giờ',
      dataIndex: 'averageWorkHours',
      key: 'averageWorkHours',
      searchField: 'averageWorkHours',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Tổng công',
      dataIndex: 'totalWorkingUnits',
      key: 'totalWorkingUnits',
      searchField: 'totalWorkingUnits',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'OT giờ',
      dataIndex: 'totalOvertimeHours',
      key: 'totalOvertimeHours',
      searchField: 'totalOvertimeHours',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'OT lương',
      dataIndex: 'totalOvertimeSalary',
      key: 'totalOvertimeSalary',
      searchField: 'totalOvertimeSalary',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Phạt đi muộn',
      dataIndex: 'totalLatePenalty',
      key: 'totalLatePenalty',
      searchField: 'totalLatePenalty',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Phạt về sớm',
      dataIndex: 'totalEarlyLeavePenalty',
      key: 'totalEarlyLeavePenalty',
      searchField: 'totalEarlyLeavePenalty',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Phạt vắng',
      dataIndex: 'totalUnauthorizedAbsencePenalty',
      key: 'totalUnauthorizedAbsencePenalty',
      searchField: 'totalUnauthorizedAbsencePenalty',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Tổng phạt',
      dataIndex: 'totalPenalty',
      key: 'totalPenalty',
      searchField: 'totalPenalty',
      sortable: true,
      filterType: 'text'
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right' as const,
      searchable: false,
      render: (_: any, record: any) => (
        <Space>
          {!record.isApproved ? (
            <Tooltip title="Duyệt bảng chấm công">
              <Button
                type="text"
                icon={<CheckOutlined style={{ color: 'green' }} />}
                onClick={() => handleApproveAttendance(record.id)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Đã duyệt">
              <Button type="text" icon={<CheckCircleOutlined style={{ color: 'gray' }} />} disabled />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], []);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: any[]) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
    getCheckboxProps: (record: any) => ({
      disabled: Boolean(record?.isApproved),
      name: `select-${record?.id}`,
    }),
  };

  // Wrapper to inject permissionKey
  const fetchData = async (params: any) => {
    return attendanceService.getMonthlySummariesByScope({
      ...params,
      permissionKey: 'users',
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        {selectedRowKeys.length > 0 && (
          <Button type="primary" onClick={handleApproveSelected}>
            <CheckOutlined /> Duyệt bảng chấm công ({selectedRowKeys.length})
          </Button>
        )}
      </div>
      
      <BaseTableRender
        columns={columns}
        fetchData={fetchData}
        rowKey="id"
        defaultSortField="month"
        defaultSortOrder="desc"
        defaultPageSize={20}
        showSelection={true}
        rowSelection={rowSelection}
        refreshTrigger={refreshTrigger}
        scroll={{ x: 'max-content' }}
        bordered
      />
    </div>
  );
};

export default AttendanceApprovalManagement;

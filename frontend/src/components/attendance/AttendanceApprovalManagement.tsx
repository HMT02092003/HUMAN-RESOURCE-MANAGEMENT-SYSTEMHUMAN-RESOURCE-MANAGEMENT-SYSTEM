"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button, Space, message, Tooltip, Tag, DatePicker, Modal } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { CheckOutlined, CheckCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { attendanceService } from '@/service/attendanceService';
import dayjs from 'dayjs';

const { MonthPicker } = DatePicker;

const AttendanceApprovalManagement: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [approvingMonth, setApprovingMonth] = useState(false);

  const handleApproveAttendance = async (monthlyAttendanceId: number) => {
    try {
      await attendanceService.approveMonthlyAttendance([monthlyAttendanceId]);
      message.success('Đã duyệt bảng chấm công');
      setRefreshTrigger(prev => prev + 1);
      setSelectedRowKeys([]);
      setSelectedRows([]);
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
      message.success(`Đã duyệt ${ids.length} bảng chấm công`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi duyệt các bản ghi đã chọn');
    }
  };

  const handleApproveAllMonth = async () => {
    const monthStr = selectedMonth.format('YYYY-MM');
    const monthDisplay = selectedMonth.format('MM/YYYY');
    
    Modal.confirm({
      title: 'Xác nhận duyệt tất cả',
      content: `Bạn có chắc chắn muốn duyệt TẤT CẢ bảng chấm công (chưa duyệt) của tháng ${monthDisplay}?`,
      okText: 'Duyệt tất cả',
      cancelText: 'Hủy',
      onOk: async () => {
        setApprovingMonth(true);
        try {
          const result = await attendanceService.approveAllByMonth(monthStr);
          message.success(`Đã duyệt ${result.approved} bảng chấm công cho tháng ${monthDisplay}`);
          setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
          message.error(err.message || 'Lỗi khi duyệt tất cả bảng chấm công');
        } finally {
          setApprovingMonth(false);
        }
      }
    });
  };

  // Wrapper to normalize paging keys for backend
  const fetchData = useCallback(async (params: any) => {
    const normalized = { ...params };
    // Hook sends `limit`; backend accepts both `pageSize` and `limit`
    if (normalized.limit && !normalized.pageSize) normalized.pageSize = normalized.limit;
    // Ensure page is present (frontend uses 1-based page)
    if (normalized.page === undefined && normalized.current !== undefined) normalized.page = normalized.current;

    // Backend determines permissionKey based on route context, not from frontend
    return attendanceService.getMonthlySummariesByScope(normalized);
  }, []);

  const columns: ServerSideColumnType<any>[] = useMemo(() => [
    {
      title: 'Người dùng',
      dataIndex: ['user', 'fullName'],
      key: 'fullName',
      searchField: 'fullName',
      sortable: true,
      filterType: 'text',
      width: 180,
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
      filterType: 'text',
      width: 150
    },
    {
      title: 'Phòng ban',
      dataIndex: ['user', 'department', 'name'],
      key: 'departmentName',
      searchField: 'departmentName',
      sortable: true,
      filterType: 'text',
      width: 180
    },
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      searchField: 'month',
      sortable: true,
      filterType: 'text',
      width: 120,
      render: (val: string) => {
        if (!val) return '-';
        const parts = val.split('-');
        if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
        return dayjs(val).format('MM/YYYY');
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isApproved',
      key: 'isApproved',
      searchField: 'isApproved',
      sortable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Đã duyệt' },
        { value: 'false', label: 'Chưa duyệt' }
      ],
      width: 130,
      render: (v: any) => (
        v ? <Tag color="green">Đã duyệt</Tag> : <Tag color="red">Chưa duyệt</Tag>
      )
    },
    {
      title: 'Tổng ngày',
      dataIndex: 'totalScheduledDays',
      key: 'totalScheduledDays',
      searchField: 'totalScheduledDays',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'Ngày công',
      dataIndex: 'presentDays',
      key: 'presentDays',
      searchField: 'presentDays',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'Vắng',
      dataIndex: 'absentDays',
      key: 'absentDays',
      searchField: 'absentDays',
      sortable: true,
      filterType: 'number',
      width: 90
    },
    {
      title: 'Phép',
      dataIndex: 'approvedLeaveDays',
      key: 'approvedLeaveDays',
      searchField: 'approvedLeaveDays',
      sortable: true,
      filterType: 'number',
      width: 90
    },
    {
      title: 'Vắng KLĐ',
      dataIndex: 'unauthorizedAbsenceDays',
      key: 'unauthorizedAbsenceDays',
      searchField: 'unauthorizedAbsenceDays',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'Công tác',
      dataIndex: 'businessTripDays',
      key: 'businessTripDays',
      searchField: 'businessTripDays',
      sortable: true,
      filterType: 'number',
      width: 100
    },
    {
      title: 'Tổng giờ',
      dataIndex: 'totalWorkHours',
      key: 'totalWorkHours',
      searchField: 'totalWorkHours',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'TB giờ',
      dataIndex: 'averageWorkHours',
      key: 'averageWorkHours',
      searchField: 'averageWorkHours',
      sortable: true,
      filterType: 'number',
      width: 100
    },
    {
      title: 'Tổng công',
      dataIndex: 'totalWorkingUnits',
      key: 'totalWorkingUnits',
      searchField: 'totalWorkingUnits',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'OT (giờ)',
      dataIndex: 'totalOvertimeHours',
      key: 'totalOvertimeHours',
      searchField: 'totalOvertimeHours',
      sortable: true,
      filterType: 'number',
      width: 100
    },
    {
      title: 'OT (lương)',
      dataIndex: 'totalOvertimeSalary',
      key: 'totalOvertimeSalary',
      searchField: 'totalOvertimeSalary',
      sortable: true,
      filterType: 'number',
      width: 130
    },
    {
      title: 'Phạt muộn',
      dataIndex: 'totalLatePenalty',
      key: 'totalLatePenalty',
      searchField: 'totalLatePenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Phạt sớm',
      dataIndex: 'totalEarlyLeavePenalty',
      key: 'totalEarlyLeavePenalty',
      searchField: 'totalEarlyLeavePenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Phạt vắng',
      dataIndex: 'totalUnauthorizedAbsencePenalty',
      key: 'totalUnauthorizedAbsencePenalty',
      searchField: 'totalUnauthorizedAbsencePenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Tổng phạt',
      dataIndex: 'totalPenalty',
      key: 'totalPenalty',
      searchField: 'totalPenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          {!record.isApproved ? (
            <Tooltip title="Duyệt bảng chấm công">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined style={{ color: 'green' }} />}
                onClick={() => handleApproveAttendance(record.id)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Đã duyệt">
              <Button 
                type="text" 
                size="small"
                icon={<CheckCircleOutlined style={{ color: 'gray' }} />} 
                disabled 
              />
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

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: 16 }} wrap align="center">
        <DatePicker 
          value={selectedMonth}
          onChange={(date) => date && setSelectedMonth(date)}
          picker="month"
          placeholder="Chọn tháng"
          format="MM/YYYY"
          style={{ width: 150 }}
          locale={viVN}
        />

        <Tooltip title="Duyệt tất cả bảng chấm công (chưa duyệt) của tháng đã chọn">
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={handleApproveAllMonth}
            loading={approvingMonth}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Duyệt tất cả {selectedMonth.format('MM/YYYY')}
          </Button>
        </Tooltip>

        <Button 
          type="default" 
          onClick={handleApproveSelected} 
          disabled={selectedRowKeys.length === 0}
          style={{ marginLeft: 8 }}
        >
          <CheckOutlined /> Duyệt đã chọn {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
        </Button>
      </Space>
      
      <ServerSideTable
        columns={columns}
        fetchData={fetchData}
        rowKey="id"
        defaultSortField="month"
        defaultSortOrder="desc"
        defaultPageSize={20}
        showSelection={true}
        onSelectionChange={(keys, rows) => {
          setSelectedRowKeys(keys);
          setSelectedRows(rows);
        }}
        getCheckboxProps={(record: any) => ({ disabled: Boolean(record?.isApproved), name: `select-${record?.id}` })}
        refreshTrigger={refreshTrigger}
        scroll={{ x: 'max-content' }}
        bordered
      />
    </div>
  );
};

export default AttendanceApprovalManagement;

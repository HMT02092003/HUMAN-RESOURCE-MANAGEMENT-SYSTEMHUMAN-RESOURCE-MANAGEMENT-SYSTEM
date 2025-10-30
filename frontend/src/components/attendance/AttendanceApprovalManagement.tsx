"use client";

import React, { useState, useEffect } from 'react';
import { Table, Button, message, Tag, Grid, ConfigProvider, Tooltip, Input, Space } from 'antd';
import { FileProtectOutlined, SearchOutlined } from '@ant-design/icons';
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
    field: 'month',
    order: 'descend'
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    // Only reload from API when pagination changes. Sorting/searching/column filters are handled on the client.
    loadData();
  }, [pagination.current, pagination.pageSize]);

  const router = useRouter();

  const loadData = async () => {
    setLoading(true);
    try {
      // Pass sorter to backend so it can return month-desc by default when requested
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
    // Pagination changes should call the API
    setPagination(newPagination);

    // Sorting is handled on the client: update sorter state but do not call loadData
    if (newSorter) {
      // Use field if provided (dataIndex), otherwise fall back to columnKey (column.key)
      const field = newSorter.field ?? newSorter.columnKey;
      if (field) {
        setSorter({
          field,
          order: newSorter.order as 'ascend' | 'descend' | undefined,
        });
      }
    }
  };

  const handleConfirmColumnSearch = (key: string, value: string | undefined, confirm: any) => {
    // set filter and reload
    setColumnFilters(prev => {
      const next = { ...prev };
      if (value && value.toString().trim() !== '') next[key] = value.toString().trim();
      else delete next[key];
      return next;
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    confirm();
  };

  const handleResetColumnSearch = (key: string, clearFilters?: any) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    if (clearFilters) clearFilters();
  };

  const getColumnSearchProps = (dataKey: string, placeholder?: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={placeholder || `Tìm kiếm ${dataKey}`}
          value={selectedKeys && selectedKeys[0] ? selectedKeys[0] : columnFilters[dataKey] || ''}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleConfirmColumnSearch(dataKey, selectedKeys && selectedKeys[0], confirm)}
          style={{ width: 200, marginBottom: 8, display: 'block' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" onClick={() => handleConfirmColumnSearch(dataKey, selectedKeys && selectedKeys[0], confirm)} size="small">Tìm kiếm</Button>
          <Button onClick={() => handleResetColumnSearch(dataKey, clearFilters)} size="small">Reset</Button>
        </div>
      </div>
    ),
    filterIcon: () => <SearchOutlined style={{ color: columnFilters[dataKey] ? '#1890ff' : undefined }} />,
    // show current filtered value in UI
    filteredValue: columnFilters[dataKey] ? [columnFilters[dataKey]] : null,
  });

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
      sorter: true,
      ...getColumnSearchProps('userName', 'Tìm kiếm tên người dùng'),
      render: (_: any, record: any) => {
        const u = record.user || {};
        return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || '—';
      }
    },
    {
      title: 'Username',
      dataIndex: ['user', 'username'],
      key: 'username',
      sorter: true
      ,
      ...getColumnSearchProps('username', 'Tìm kiếm username')
    },
    {
      title: 'Phòng ban',
      dataIndex: ['user', 'department', 'name'],
      key: 'departmentName',
      sorter: true
      ,
      ...getColumnSearchProps('departmentName', 'Tìm kiếm phòng ban')
    },
    {
      title: 'Tháng',
      dataIndex: 'month', key: 'month',
      sorter: true,
      ...getColumnSearchProps('month', 'Tìm kiếm tháng (YYYY-MM)'),
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
      sorter: true,
      ...getColumnSearchProps('isApproved', 'Tìm kiếm trạng thái'),
      render: (v: any) => (
        v ? <Tag color="green">Đã duyệt</Tag> : <Tag color="red">Chưa duyệt</Tag>
      )
    },
    {
      title: 'Tổng ngày dự kiến',
      dataIndex: 'totalScheduledDays',
      key: 'totalScheduledDays',
      sorter: true,
      ...getColumnSearchProps('totalScheduledDays', 'Tìm kiếm tổng ngày dự kiến')
    },
    {
      title: 'Ngày công',
      dataIndex: 'presentDays',
      key: 'presentDays',
      sorter: true,
      ...getColumnSearchProps('presentDays', 'Tìm kiếm ngày công')
    },
    {
      title: 'Ngày vắng',
      dataIndex: 'absentDays', key: 'absentDays',
      sorter: true,
      ...getColumnSearchProps('absentDays', 'Tìm kiếm ngày vắng')
    },
    {
      title: 'Ngày nghỉ phép',
      dataIndex: 'approvedLeaveDays',
      key: 'approvedLeaveDays',
      sorter: true,
      ...getColumnSearchProps('approvedLeaveDays', 'Tìm kiếm ngày nghỉ phép')
    },
    {
      title: 'Ngày nghỉ không lý do',
      dataIndex: 'unauthorizedAbsenceDays',
      key: 'unauthorizedAbsenceDays',
      sorter: true,
      ...getColumnSearchProps('unauthorizedAbsenceDays', 'Tìm kiếm ngày nghỉ không lý do')
    },
    {
      title: 'Công tác',
      dataIndex: 'businessTripDays',
      key: 'businessTripDays',
      sorter: true,
      ...getColumnSearchProps('businessTripDays', 'Tìm kiếm công tác')
    },
    {
      title: 'Tổng giờ làm',
      dataIndex: 'totalWorkHours',
      key: 'totalWorkHours',
      sorter: true,
      ...getColumnSearchProps('totalWorkHours', 'Tìm kiếm tổng giờ làm')
    },
    {
      title: 'Trung bình giờ',
      dataIndex: 'averageWorkHours',
      key: 'averageWorkHours',
      sorter: true,
      ...getColumnSearchProps('averageWorkHours', 'Tìm kiếm trung bình giờ')
    },
    {
      title: 'Tổng công',
      dataIndex: 'totalWorkingUnits',
      key: 'totalWorkingUnits',
      sorter: true,
      ...getColumnSearchProps('totalWorkingUnits', 'Tìm kiếm tổng công')
    },
    {
      title: 'OT giờ',
      dataIndex: 'totalOvertimeHours',
      key: 'totalOvertimeHours',
      sorter: true,
      ...getColumnSearchProps('totalOvertimeHours', 'Tìm kiếm OT giờ')
    },
    {
      title: 'OT lương',
      dataIndex: 'totalOvertimeSalary',
      key: 'totalOvertimeSalary',
      sorter: true,
      ...getColumnSearchProps('totalOvertimeSalary', 'Tìm kiếm OT lương')
    },
    {
      title: 'Phạt đi muộn',
      dataIndex: 'totalLatePenalty',
      key: 'totalLatePenalty',
      sorter: true,
      ...getColumnSearchProps('totalLatePenalty', 'Tìm kiếm phạt đi muộn')
    },
    {
      title: 'Phạt về sớm',
      dataIndex: 'totalEarlyLeavePenalty',
      key: 'totalEarlyLeavePenalty',
      sorter: true,
      ...getColumnSearchProps('totalEarlyLeavePenalty', 'Tìm kiếm phạt về sớm')
    },
    {
      title: 'Phạt vắng',
      dataIndex: 'totalUnauthorizedAbsencePenalty',
      key: 'totalUnauthorizedAbsencePenalty',
      sorter: true,
      ...getColumnSearchProps('totalUnauthorizedAbsencePenalty', 'Tìm kiếm phạt vắng')
    },
    {
      title: 'Tổng phạt',
      dataIndex: 'totalPenalty',
      key: 'totalPenalty',
      sorter: true,
      ...getColumnSearchProps('totalPenalty', 'Tìm kiếm tổng phạt')
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
          {/* If not approved - show approve attendance button. If approved - show payroll approval button */}
          {!record.isApproved ? (
            <Tooltip title="Duyệt bảng chấm công">
              <Button
                type="text"
                icon={<CheckOutlined style={{ color: 'green' }} />}
                onClick={() => handleApproveAttendance(record.id)}
              />
            </Tooltip>
          ) : (
            <Space>
              <Tooltip title="Đã duyệt">
                <Button type="text" icon={<CheckCircleOutlined style={{ color: 'gray' }} />} disabled />
              </Tooltip>
            </Space>
          )}
        </ConfigProvider>
      ),
    },
  ];

  // Client-side filtered + sorted data derived from the current page's userData
  const displayData = React.useMemo(() => {
    let data = Array.isArray(userData) ? [...userData] : [];

    // Apply global searchTerm (search across name, username, department name)
    if (searchTerm && searchTerm.trim() !== '') {
      const q = searchTerm.trim().toLowerCase();
      data = data.filter(r => {
        const u = r.user || {};
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
        const username = (u.username || '').toLowerCase();
        const dept = ((u.department && u.department.name) || '').toLowerCase();
        return name.includes(q) || username.includes(q) || dept.includes(q);
      });
    }

    // Apply columnFilters (exact or substring match)
    if (columnFilters && Object.keys(columnFilters).length > 0) {
      for (const k of Object.keys(columnFilters)) {
        const v = (columnFilters[k] || '').toLowerCase();
        if (!v) continue;
        data = data.filter(r => {
          switch (k) {
            case 'userName': {
              const u = r.user || {};
              const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
              return name.includes(v);
            }
            case 'username': {
              const u = r.user || {};
              return (u.username || '').toLowerCase().includes(v);
            }
            case 'departmentName': {
              const u = r.user || {};
              return ((u.department && u.department.name) || '').toLowerCase().includes(v);
            }
            case 'month': return (r.month || '').toLowerCase().includes(v);
            case 'isApproved': return String(r.isApproved).toLowerCase().includes(v);
            default: {
              // try direct property
              const val = (r[k] || '').toString().toLowerCase();
              return val.includes(v);
            }
          }
        });
      }
    }

    // Apply client-side sorting
    if (sorter && sorter.field) {
      const dir = sorter.order === 'ascend' ? 1 : -1;

      const resolveValue = (row: any, field: any) => {
        if (!field) return '';
        // If field is an array (antd sometimes sends dataIndex arrays), join to path
        if (Array.isArray(field)) field = field.join('.');
        // Map friendly keys to actual nested paths
        const mapping: Record<string, string> = {
          'username': 'user.username',
          'departmentName': 'user.department.name',
        };
        // Special-case: user/userName should resolve to full name
        if (field === 'user' || field === 'userName' || field === 'user.name') {
          const u = row.user || {};
          return `${u.firstName || ''} ${u.lastName || ''}`.trim();
        }
        const path = mapping[field] || field;
        const parts = path.split('.');
        return parts.reduce((acc: any, p: string) => (acc ? acc[p] : undefined), row) ?? '';
      };

      data.sort((a: any, b: any) => {
        const av = resolveValue(a, sorter.field);
        const bv = resolveValue(b, sorter.field);
        const sa = (av && typeof av === 'string') ? av.toLowerCase() : String(av);
        const sb = (bv && typeof bv === 'string') ? bv.toLowerCase() : String(bv);
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
      });
    }

    return data;
  }, [userData, searchTerm, columnFilters, sorter]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (newKeys: React.Key[]) => setSelectedRowKeys(newKeys),
    // Disable checkbox for rows that are already approved
    getCheckboxProps: (record: any) => ({
      disabled: Boolean(record?.isApproved),
      name: `select-${record?.id}`,
    }),
  };

  const handleApproveSelected = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.info('Vui lòng chọn ít nhất một bản ghi');
      return;
    }
    try {
      // Map selected keys to full records to access month and isApproved
      const selectedRecords = userData.filter(r => selectedRowKeys.includes(r.id));
      // Exclude already-approved records
      const toApprove = selectedRecords.filter(r => !r.isApproved);
      if (toApprove.length === 0) {
        message.info('Không có bản ghi nào cần duyệt');
        return;
      }
      // Sort by month descending (newest first). Month could be 'YYYY-MM' or a date string.
      const parseMonthValue = (m: any) => {
        if (!m) return new Date(0);
        // If format is YYYY-MM, convert to YYYY-MM-01
        if (/^\d{4}-\d{2}$/.test(m)) return new Date(`${m}-01`);
        const d = new Date(m);
        if (!isNaN(d.getTime())) return d;
        return new Date(0);
      };
      toApprove.sort((a, b) => parseMonthValue(b.month).getTime() - parseMonthValue(a.month).getTime());
      const ids = toApprove.map(r => Number(r.id));
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
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        {selectedRowKeys.length > 0 ? (
          <Button type="primary" onClick={() => handleApproveSelected()} disabled={selectedRowKeys.length === 0}><CheckOutlined />Duyệt bảng chấm công</Button>
        ) : null}
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={displayData}
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

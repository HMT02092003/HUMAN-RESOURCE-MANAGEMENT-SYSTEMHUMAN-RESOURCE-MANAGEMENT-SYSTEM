'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Popconfirm,
  Select,
  DatePicker,
  Input,
  Badge,
  Tooltip,
  Row,
  Col
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface ScheduleRecord {
  id: number;
  user_id: number;
  shift_id: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  shift_name?: string;
  start_time?: string;
  end_time?: string;
  working_unit?: number;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  user?: {
    id: number;
    fullName?: string;
    email?: string;
    Department?: { name?: string };
    Chevron?: { name?: string };
  };
}

const ShiftApprovalManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    user_id: undefined as number | undefined,
    sortField: '',
    sortOrder: ''
  });
  const [approveMonth, setApproveMonth] = useState<any>(dayjs());

  useEffect(() => {
    loadSchedules();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        user_id: filters.user_id || undefined,
        sortField: filters.sortField || undefined,
        sortOrder: filters.sortOrder || undefined
      };

      const response = await shiftService.getSchedulesForApproval(params);

      // Helpful debug logging when backend returns success=false
      if (response?.data && response.data.success === false) {
        console.error('[ShiftApproval] API responded with error:', response.data);
        const msg = response.data.message || '';
        // Token expired reported by backend in payload - force re-login
        if (msg.toLowerCase().includes('access token expired') || msg.toLowerCase().includes('token expired') || msg.toLowerCase().includes('refresh')) {
          message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
          window.location.href = '/login';
          return;
        }

        // Other server-side validation errors - show to user
        message.error(msg || 'Lỗi khi tải danh sách đơn đăng ký');
        return;
      }

      if (response.data?.success) {
        setSchedules(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0
        }));
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể tải danh sách đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  // Table change handler (pagination, filters). We perform sorting & column search on the client-side
  const handleTableChange = (pag: any, tableFilters: any) => {
    setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));

    // Update status filter (kept on server-side)
    if (tableFilters.status) {
      setFilters(prev => ({ ...prev, status: tableFilters.status[0] || '' }));
    }
  };

  // Client-side column search state
  const [columnSearch, setColumnSearch] = useState({
    user: '',
    department: '',
    position: '',
    shift_name: '',
    notes: ''
  });
  const displayedSchedules = React.useMemo(() => {
    const s = (schedules || []).filter((record) => {
      // user (fullname or email)
      if (columnSearch.user) {
        const q = columnSearch.user.toLowerCase();
        const fullName = (record.user?.fullName || '').toLowerCase();
        const email = (record.user?.email || '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q)) return false;
      }

      if (columnSearch.shift_name) {
        const q = columnSearch.shift_name.toLowerCase();
        if (!((record.shift_name || '').toLowerCase().includes(q))) return false;
      }

      if (columnSearch.notes) {
        const q = columnSearch.notes.toLowerCase();
        if (!((record.notes || '').toLowerCase().includes(q))) return false;
      }

      if (columnSearch.department) {
        const q = columnSearch.department.toLowerCase();
        if (!((record.user?.Department?.name || '').toLowerCase().includes(q))) return false;
      }

      if (columnSearch.position) {
        const q = columnSearch.position.toLowerCase();
        if (!((record.user?.Chevron?.name || '').toLowerCase().includes(q))) return false;
      }

      return true;
    });

    return s;
  }, [schedules, columnSearch]);

  const handleBulkApprove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một đơn đăng ký');
      return;
    }

    try {
      setLoading(true);
      const ids = selectedRowKeys.map(key => Number(key)).filter(n => !isNaN(n));
      if (ids.length === 0) {
        message.error('Danh sách IDs không hợp lệ');
        return;
      }

      const response = await shiftService.bulkApproveSchedules(ids, 'approve');

      if (response?.data && response.data.success) {
        message.success(response.data.data?.message || 'Đã duyệt thành công');
        setSelectedRowKeys([]);
        loadSchedules();
      } else {
        console.error('[ShiftApproval] bulkApprove response:', response?.data);
        message.error(response?.data?.message || 'Không thể duyệt đơn');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể duyệt đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một đơn đăng ký');
      return;
    }

    try {
      setLoading(true);
      const ids = selectedRowKeys.map(key => Number(key)).filter(n => !isNaN(n));
      if (ids.length === 0) {
        message.error('Danh sách IDs không hợp lệ');
        return;
      }

      const response = await shiftService.bulkApproveSchedules(ids, 'reject');

      if (response?.data && response.data.success) {
        message.success(response.data.data?.message || 'Đã từ chối thành công');
        setSelectedRowKeys([]);
        loadSchedules();
      } else {
        console.error('[ShiftApproval] bulkReject response:', response?.data);
        message.error(response?.data?.message || 'Không thể từ chối đơn');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể từ chối đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMonth = async (year?: number, month?: number) => {
    const useMonth = approveMonth || dayjs();
    const y = year || useMonth.year();
    const m = month || (useMonth.month() + 1);

    try {
      setLoading(true);
      const response = await shiftService.approveMonthSchedules(y, m);

      if (response.data?.success) {
        message.success(response.data.data?.message || `Đã duyệt tất cả đơn trong tháng ${m}/${y}`);
        loadSchedules();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể duyệt đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  // Wrapper for Popconfirm which expects a zero-arg callback
  const confirmApproveMonth = () => {
    void handleApproveMonth();
  };

  const handleSingleApprove = async (id: number) => {
    if (!id || isNaN(Number(id))) {
      message.error('ID lịch không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const response = await shiftService.approveShiftRegistration(id);
      if (response?.data && response.data.success) {
        message.success(response.data.message || 'Đã duyệt đơn đăng ký');
        loadSchedules();
      } else {
        console.error('[ShiftApproval] approve response:', response?.data);
        message.error(response?.data?.message || 'Không thể duyệt đơn đăng ký');
      }
    } catch (error: any) {
      console.error('[ShiftApproval] approve error:', error?.response?.data || error.message);
      message.error(error.response?.data?.message || 'Không thể duyệt đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  // Quick approve button handler: approve and update local state without full reload
  const handleQuickApprove = async (id: number) => {
    if (!id || isNaN(Number(id))) {
      message.error('ID lịch không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const response = await shiftService.approveShiftRegistration(id);
      if (response?.data && response.data.success) {
        // Optimistically update local schedules state so Tag/status updates immediately
        setSchedules(prev => prev.map(s => s.id === id ? ({
          ...s,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (response.data?.approvedBy) || s.approved_by || null
        }) : s));

        message.success(response.data.message || 'Đã duyệt đơn đăng ký');
      } else {
        console.error('[ShiftApproval] quickApprove response:', response?.data);
        message.error(response?.data?.message || 'Không thể duyệt đơn đăng ký');
      }
    } catch (error: any) {
      console.error('[ShiftApproval] quickApprove error:', error?.response?.data || error.message);
      message.error(error.response?.data?.message || 'Không thể duyệt đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleReject = async (id: number) => {
    if (!id || isNaN(Number(id))) {
      message.error('ID lịch không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const response = await shiftService.rejectShiftRegistration(id, 'Từ chối bởi quản lý');
      if (response?.data && response.data.success) {
        message.success(response.data.message || 'Đã từ chối đơn đăng ký');
        loadSchedules();
      } else {
        console.error('[ShiftApproval] reject response:', response?.data);
        message.error(response?.data?.message || 'Không thể từ chối đơn đăng ký');
      }
    } catch (error: any) {
      console.error('[ShiftApproval] reject error:', error?.response?.data || error.message);
      message.error(error.response?.data?.message || 'Không thể từ chối đơn đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: '',
        endDate: ''
      }));
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: true
    },
    {
      title: 'Nhân viên',
      key: 'user',
      width: 200,
      // client-side search dropdown
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Tìm nhân viên"
            value={columnSearch.user}
            onChange={e => setColumnSearch(prev => ({ ...prev, user: e.target.value }))}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button onClick={() => { setColumnSearch(prev => ({ ...prev, user: '' })); clearFilters(); confirm(); }} size="small">Reset</Button>
            <Button type="primary" onClick={() => confirm()} size="small">Tìm</Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: any) => <SearchOutlined style={{ color: columnSearch.user ? '#1890ff' : undefined }} />,
      render: (_: any, record: ScheduleRecord) => {
        const name = record.user?.fullName || (record.user as any)?.fullname || 'N/A';
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.user?.email}</div>
          </div>
        );
      }
    },
    {
      title: 'Phòng ban',
      key: 'department',
      width: 150,
      render: (_: any, record: ScheduleRecord) => (
        <span>{(record.user as any)?.department?.name || record.user?.Department?.name || 'N/A'}</span>
      ),
      sorter: (a: any, b: any) => String((a.user as any)?.department?.name || a.user?.Department?.name || '').localeCompare(String((b.user as any)?.department?.name || b.user?.Department?.name || ''))
    },
    {
      title: 'Chức vụ',
      key: 'position',
      width: 150,
      render: (_: any, record: ScheduleRecord) => (
        <span>{(record.user as any)?.chevron?.name || record.user?.Chevron?.name || 'N/A'}</span>
      ),
      sorter: (a: any, b: any) => String((a.user as any)?.chevron?.name || a.user?.Chevron?.name || '').localeCompare(String((b.user as any)?.chevron?.name || b.user?.Chevron?.name || ''))
    },
    {
      title: 'Ca làm việc',
      dataIndex: 'shift_name',
      key: 'shift_name',
      width: 150,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Tìm ca"
            value={columnSearch.shift_name}
            onChange={e => setColumnSearch(prev => ({ ...prev, shift_name: e.target.value }))}
            onPressEnter={() => { }}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button onClick={() => setColumnSearch(prev => ({ ...prev, shift_name: '' }))} size="small">Reset</Button>
            <Button type="primary" onClick={() => { }} size="small">Tìm</Button>
          </Space>
        </div>
      ),
      filterIcon: () => <SearchOutlined style={{ color: columnSearch.shift_name ? '#1890ff' : undefined }} />,
      render: (name: string, record: ScheduleRecord) => (
        <Tooltip title={`${record.start_time} - ${record.end_time}`}>
          <span>{name}</span>
        </Tooltip>
      ),
      sorter: (a: any, b: any) => String(a.shift_name || '').localeCompare(String(b.shift_name || ''))
    },
    {
      title: 'Ngày làm việc',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: any, b: any) => dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Chờ duyệt', value: 'pending' },
        { text: 'Đã duyệt', value: 'approved' },
        { text: 'Từ chối', value: 'rejected' }
      ],
      onFilter: (value: any, record: any) => record.status === value,
      render: (status: string) => {
        // Use Tag for clearer status labels
        if (status === 'pending') return <Tag color="orange">Chờ duyệt</Tag>;
        if (status === 'approved') return <Tag color="green">Đã duyệt</Tag>;
        if (status === 'rejected') return <Tag color="red">Từ chối</Tag>;
        return <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      ellipsis: true,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Tìm ghi chú"
            value={columnSearch.notes}
            onChange={e => setColumnSearch(prev => ({ ...prev, notes: e.target.value }))}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button onClick={() => setColumnSearch(prev => ({ ...prev, notes: '' }))} size="small">Reset</Button>
            <Button type="primary" onClick={() => { }} size="small">Tìm</Button>
          </Space>
        </div>
      ),
      filterIcon: () => <SearchOutlined style={{ color: columnSearch.notes ? '#1890ff' : undefined }} />
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
      sorter: true
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_: any, record: ScheduleRecord) => {
        const isPending = record.status === 'pending';
        return (
          <Space size="small">
            <Tooltip title={isPending ? 'Duyệt' : 'Không thể duyệt'}>
              <Button
                type="text"
                size="small"
                onClick={() => isPending && handleQuickApprove(record.id)}
                icon={<CheckOutlined style={{ color: isPending ? '#52c41a' : '#bbb', fontSize: 16 }} />}
                aria-label={`quick-approve-${record.id}`}
                disabled={!isPending}
              />
            </Tooltip>

            <Popconfirm
              title="Xác nhận từ chối đơn này?"
              onConfirm={() => isPending && handleSingleReject(record.id)}
              okText="Từ chối"
              cancelText="Hủy"
            >
              <Tooltip title={isPending ? 'Từ chối' : 'Không thể từ chối'}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined style={{ color: isPending ? undefined : '#bbb' }} />}
                  aria-label={`reject-${record.id}`}
                  disabled={!isPending}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: ScheduleRecord) => ({
      disabled: record.status !== 'pending'
    })
  };

  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Column-level search is available on each column (removed global search row) */}

        {/* Action Buttons */}
        <Space wrap>
          {/* Month picker for approve-month flow */}
          <DatePicker
            picker="month"
            value={approveMonth}
            format="MM/YYYY"
            onChange={(val) => setApproveMonth(val)}
            style={{ marginRight: 8 }}
          />
          {selectedRowKeys.length > 0 && (
            <>
              <Popconfirm
                title={`Xác nhận duyệt ${selectedRowKeys.length} đơn đã chọn?`}
                onConfirm={handleBulkApprove}
                disabled={selectedRowKeys.length === 0}
              >
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  disabled={selectedRowKeys.length === 0}
                >
                  Duyệt đã chọn ({selectedRowKeys.length})
                </Button>
              </Popconfirm>

              <Popconfirm
                title={`Xác nhận từ chối ${selectedRowKeys.length} đơn đã chọn?`}
                onConfirm={handleBulkReject}
                disabled={selectedRowKeys.length === 0}
              >
                <Button
                  danger
                  icon={<CloseOutlined />}
                  disabled={selectedRowKeys.length === 0}
                >
                  Từ chối đã chọn ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </>
          )}
          <Popconfirm
            title={`Xác nhận duyệt TẤT CẢ đơn chờ duyệt trong tháng ${((approveMonth || dayjs()).format ? (approveMonth || dayjs()).format('MM/YYYY') : dayjs().format('MM/YYYY'))}?`}
            onConfirm={confirmApproveMonth}
          >
            <Button type="dashed" icon={<CheckOutlined />}>
              Duyệt tất cả tháng này
            </Button>
          </Popconfirm>
        </Space>

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayedSchedules}
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: "max-content" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} đơn`
          }}
          onChange={handleTableChange}
        /* removed fixed horizontal scroll to avoid horizontal scrollbar */
        />
      </Space>
    </>
  );
};

export default ShiftApprovalManagement;

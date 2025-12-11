import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Space,
  Popconfirm,
  message,
  Tooltip,
  Statistic,
  Row,
  Col,
  Input,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import jobService from '@/service/jobService';
import ExpenseModal from './ExpenseModal';
import { ServerSideTable } from '../common/ServerSideTable';
import { decode } from '@/utils/decode-token';

const { Search } = Input;

interface ProjectExpensesProps {
  projectId: string;
  project?: any; // Pass project data to check manager
}

const EXPENSE_CATEGORIES = {
  personnel: { label: 'Chi phí nhân sự', icon: '👥', color: 'blue' },
  equipment: { label: 'Thiết bị', icon: '💻', color: 'green' },
  software: { label: 'Phần mềm/License', icon: '📦', color: 'purple' },
  travel: { label: 'Đi lại', icon: '✈️', color: 'cyan' },
  marketing: { label: 'Marketing', icon: '📢', color: 'orange' },
  infrastructure: { label: 'Cơ sở hạ tầng', icon: '🏢', color: 'magenta' },
  training: { label: 'Đào tạo', icon: '📚', color: 'geekblue' },
  consulting: { label: 'Tư vấn', icon: '💼', color: 'gold' },
  maintenance: { label: 'Bảo trì', icon: '🔧', color: 'lime' },
  other: { label: 'Khác', icon: '📝', color: 'default' },
};

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: 'warning' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' },
};

const ProjectExpenses: React.FC<ProjectExpensesProps> = ({ projectId, project }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [summary, setSummary] = useState<any>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = decode(token);
        setCurrentUserId(decoded.sub);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, []);

  const isProjectManager = project && currentUserId && project.manager_id === currentUserId;

  const handleCreate = () => {
    setSelectedExpense(null);
    setModalVisible(true);
  };

  const handleEdit = (expense: any) => {
    if (expense.status === 'approved') {
      message.warning('Không thể sửa khoản chi tiêu đã được duyệt!');
      return;
    }
    setSelectedExpense(expense);
    setModalVisible(true);
  };

  const handleDelete = async (expenseId: string) => {
    try {
      await jobService.deleteExpense(projectId, expenseId);
      message.success('Xóa chi tiêu thành công!');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể xóa chi tiêu!');
    }
  };

  const handleApprove = async (expenseId: string) => {
    if (!isProjectManager) {
      message.error('Chỉ quản lý dự án mới có quyền duyệt chi tiêu!');
      return;
    }
    try {
      await jobService.approveExpense(projectId, expenseId);
      message.success('Duyệt chi tiêu thành công!');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể duyệt chi tiêu!');
    }
  };

  const handleReject = async (expenseId: string) => {
    if (!isProjectManager) {
      message.error('Chỉ quản lý dự án mới có quyền từ chối chi tiêu!');
      return;
    }
    try {
      await jobService.rejectExpense(projectId, expenseId, 'Từ chối bởi quản lý');
      message.success('Đã từ chối chi tiêu!');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể từ chối chi tiêu!');
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      if (selectedExpense) {
        await jobService.updateExpense(projectId, selectedExpense.expense_id, values);
      } else {
        await jobService.createExpense(projectId, values);
      }
      setModalVisible(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const fetchData = async (params: any) => {
    const response = await jobService.getProjectExpenses(projectId, {
      ...params,
      search: searchText || undefined,
    });

    // Update summary from response
    if (response.data?.summary) {
      setSummary(response.data.summary);
    }

    return response;
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Ngày',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: true,
    },
    {
      title: 'Tên khoản chi',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: true,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (category: keyof typeof EXPENSE_CATEGORIES) => {
        const cat = EXPENSE_CATEGORIES[category];
        return (
          <Tag color={cat?.color}>
            {cat?.icon} {cat?.label}
          </Tag>
        );
      },
      filters: Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => ({
        text: `${val.icon} ${val.label}`,
        value: key,
      })),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: keyof typeof STATUS_CONFIG) => {
        const config = STATUS_CONFIG[status];
        return <Tag color={config?.color}>{config?.label}</Tag>;
      },
      filters: [
        { text: 'Chờ duyệt', value: 'pending' },
        { text: 'Đã duyệt', value: 'approved' },
        { text: 'Từ chối', value: 'rejected' },
      ],
    },
    {
      title: 'Người tạo',
      dataIndex: 'created_by_user',
      key: 'created_by',
      width: 150,
      render: (user: any) => user?.fullName || user?.username || '-',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {record.status === 'pending' && isProjectManager && (
            <>
              <Tooltip title="Duyệt">
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.expense_id)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  type="link"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleReject(record.expense_id)}
                  danger
                />
              </Tooltip>
            </>
          )}
          {record.status !== 'approved' && (
            <Tooltip title="Sửa">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Xác nhận xóa?"
            description="Bạn có chắc muốn xóa khoản chi tiêu này?"
            onConfirm={() => handleDelete(record.expense_id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button type="link" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ngân sách"
              value={summary.budget || 0}
              prefix={<DollarOutlined />}
              suffix="đ"
              valueStyle={{ color: '#666' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đã chi (đã duyệt)"
              value={summary.approved_amount || 0}
              prefix={<CheckCircleOutlined />}
              suffix="đ"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Chờ duyệt"
              value={summary.pending_amount || 0}
              prefix={<CloseCircleOutlined />}
              suffix="đ"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Còn lại"
              value={(summary.budget || 0) - (summary.approved_amount || 0)}
              suffix="đ"
              valueStyle={{
                color:
                  (summary.budget || 0) - (summary.approved_amount || 0) < 0
                    ? '#ff4d4f'
                    : '#52c41a',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Tìm kiếm theo tên hoặc mô tả..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            onSearch={(value) => {
              setSearchText(value);
              setRefreshKey(prev => prev + 1);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Thêm chi tiêu
          </Button>
        </Space>

        <ServerSideTable
          key={refreshKey}
          columns={columns}
          fetchData={fetchData}
          rowKey="expense_id"
          scroll={{ x: 1200 }}
        />
      </Card>

      <ExpenseModal
        visible={modalVisible}
        expense={selectedExpense}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default ProjectExpenses;

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Row,
  Col,
  Tag,
  Tooltip,
  Modal,
  message,
  Badge,
  Grid,
  ConfigProvider,
  Popconfirm,
  DatePicker
} from 'antd';

const { RangePicker } = DatePicker;
import {
  PlusCircleOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import mockApplicationService from '@/service/mockApplicationService';

dayjs.extend(isBetween);
import { ApplicationTypes } from '@/service/applicationService';
import { useRouter } from 'next/navigation';
import Highlighter from 'react-highlight-words';

const applicationService = mockApplicationService;
const MyHighlighter = Highlighter as unknown as React.FC<any>;

interface ApplicationManagementProps { }

const ApplicationManagement: React.FC<ApplicationManagementProps> = () => {
  const screens = Grid.useBreakpoint();
  const searchInput = useRef<InputRef>(null);
  const [applications, setApplications] = useState<ApplicationTypes[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const router = useRouter();

  // Permissions (mock)
  const createPer = true;
  const updatePer = true;
  const deletePer = true;
  const approvePer = true;

  // Application type options
  const applicationTypeOptions = [
    { value: 'leave', label: 'Đơn xin nghỉ', color: 'blue', icon: '🏠' },
    { value: 'shift_registration', label: 'Đơn đăng ký ca', color: 'green', icon: '📅' },
    { value: 'checkout', label: 'Đơn check-out sớm', color: 'orange', icon: '🚪' },
    { value: 'shift_change', label: 'Đơn đổi ca', color: 'purple', icon: '🔄' },
    { value: 'increased_hours', label: 'Đơn tăng ca', color: 'cyan', icon: '⏰' },
    { value: 'business_trip', label: 'Đơn công tác', color: 'magenta', icon: '✈️' },
    { value: 'resignation', label: 'Đơn thôi việc', color: 'red', icon: '📋' },
  ];

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Chờ duyệt', color: 'orange' },
    { value: 'approved', label: 'Đã duyệt', color: 'green' },
    { value: 'rejected', label: 'Từ chối', color: 'red' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await applicationService.getApplications({
        page: 1,
        limit: 100
      });
      setApplications(response.data || []);
    } catch (error) {
      message.error('Không thể tải danh sách đơn từ');
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (
    selectedKeys: string[],
    confirm: FilterDropdownProps['confirm'],
    dataIndex: keyof ApplicationTypes,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = (dataIndex: keyof ApplicationTypes, title: string, customRender?: boolean) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Tìm kiếm ${title.toLowerCase()}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Tìm kiếm
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => close()}
          >
            Đóng
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: ApplicationTypes) => {
      const recordValue = record[dataIndex];
      if (recordValue == null) return false;
      return recordValue
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase());
    },
    filterDropdownProps: {
      onOpenChange(open: any) {
        if (open) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
    ...(customRender ? {} : {
      render: (text: any) =>
        searchedColumn === dataIndex ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text ? text.toString() : ''}
          />
        ) : (
          text
        ),
    })
  });

  // Special search props for date range columns  
  const getDateRangeColumnSearchProps = (dataIndex: keyof ApplicationTypes, title: string) => {
    let currentDateRange: [string, string] | null = null;

    return {
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <RangePicker
            placeholder={['Từ ngày', 'Đến ngày']}
            value={
              selectedKeys[0] && selectedKeys[1]
                ? [dayjs(selectedKeys[0] as string), dayjs(selectedKeys[1] as string)]
                : null
            }
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                const range: [string, string] = [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')];
                currentDateRange = range;
                setSelectedKeys(range);
              } else {
                currentDateRange = null;
                setSelectedKeys([]);
              }
            }}
            style={{ marginBottom: 8, display: 'block', width: '100%' }}
            format="DD/MM/YYYY"
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Tìm kiếm
            </Button>
            <Button
              onClick={() => {
                currentDateRange = null;
                clearFilters && handleReset(clearFilters);
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => close()}
            >
              Đóng
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value: boolean | React.Key, record: ApplicationTypes) => {
        // Use the stored date range for filtering
        if (currentDateRange && currentDateRange.length === 2) {
          const recordDate = dayjs(record[dataIndex] as string);
          const startDate = dayjs(currentDateRange[0]);
          const endDate = dayjs(currentDateRange[1]);
          return recordDate.isBetween(startDate, endDate, 'day', '[]');
        }
        return true;
      },
      filterDropdownProps: {
        onOpenChange(open: any) {
          if (open) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
    };
  };

  // Get application type info
  const getApplicationTypeInfo = (type: string) => {
    return applicationTypeOptions.find(option => option.value === type) ||
      { label: type, color: 'default', icon: '📄' };
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    return statusOptions.find(option => option.value === status) ||
      { label: status, color: 'default' };
  };

  // Table columns
  const columns: ColumnsType<ApplicationTypes> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => (a.id || 0) - (b.id || 0),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder="Tìm kiếm ID"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys as string[], confirm, 'id')}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys as string[], confirm, 'id')}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Tìm kiếm
            </Button>
            <Button
              onClick={() => clearFilters && handleReset(clearFilters)}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => close()}
            >
              Đóng
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value: boolean | React.Key, record: ApplicationTypes) => {
        const recordValue = record.id;
        if (recordValue == null) return false;
        return recordValue
          .toString()
          .toLowerCase()
          .includes((value as string).toLowerCase());
      },
      filterDropdownProps: {
        onOpenChange(open: any) {
          if (open) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
      render: (text: any) =>
        searchedColumn === 'id' ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text ? text.toString() : ''}
          />
        ) : (
          text
        ),
    },
    {
      title: 'Loại đơn',
      dataIndex: 'applicationType',
      key: 'applicationType',
      width: 180,
      render: (type: string) => {
        const typeInfo = getApplicationTypeInfo(type);
        return (
          <Space>
            <span>{typeInfo.icon}</span>
            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
          </Space>
        );
      },
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => {
        const aInfo = getApplicationTypeInfo(a.applicationType);
        const bInfo = getApplicationTypeInfo(b.applicationType);
        return aInfo.label.localeCompare(bInfo.label);
      },
      filters: applicationTypeOptions.map(option => ({
        text: option.label,
        value: option.value,
      })),
      onFilter: (value: boolean | React.Key, record: ApplicationTypes) => record.applicationType === value,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 120,
      render: (employeeId: number) => {
        const formattedId = `NV${employeeId?.toString().padStart(4, '0')}`;
        return searchedColumn === 'employeeId' ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={formattedId}
          />
        ) : (
          formattedId
        );
      },
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => (a.employeeId || 0) - (b.employeeId || 0),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder="Tìm kiếm nhân viên"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys as string[], confirm, 'employeeId')}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys as string[], confirm, 'employeeId')}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Tìm kiếm
            </Button>
            <Button
              onClick={() => clearFilters && handleReset(clearFilters)}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => close()}
            >
              Đóng
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value: boolean | React.Key, record: ApplicationTypes) => {
        const formattedId = `NV${record.employeeId?.toString().padStart(4, '0')}`;
        return formattedId.toLowerCase().includes((value as string).toLowerCase());
      },
      filterDropdownProps: {
        onOpenChange(open: any) {
          if (open) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: {
        showTitle: false,
      },
      render: (reason: string) => (
        <Tooltip placement="topLeft" title={reason}>
          {searchedColumn === 'reason' ? (
            <MyHighlighter
              highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
              searchWords={[searchText]}
              autoEscape
              textToHighlight={reason || ''}
            />
          ) : (
            reason
          )}
        </Tooltip>
      ),
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => (a.reason || '').localeCompare(b.reason || ''),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder="Tìm kiếm lý do"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys as string[], confirm, 'reason')}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys as string[], confirm, 'reason')}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Tìm kiếm
            </Button>
            <Button
              onClick={() => clearFilters && handleReset(clearFilters)}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => close()}
            >
              Đóng
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value: boolean | React.Key, record: ApplicationTypes) => {
        const recordValue = record.reason;
        if (recordValue == null) return false;
        return recordValue
          .toString()
          .toLowerCase()
          .includes((value as string).toLowerCase());
      },
      filterDropdownProps: {
        onOpenChange(open: any) {
          if (open) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'Chờ duyệt' },
          approved: { color: 'green', text: 'Đã duyệt' },
          rejected: { color: 'red', text: 'Từ chối' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };

        return searchedColumn === 'status' ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={config.text}
          />
        ) : (
          <Tag color={config.color}>{config.text}</Tag>
        );
      },
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => (a.status || '').localeCompare(b.status || ''),
      filters: statusOptions.map(option => ({
        text: option.label,
        value: option.value,
      })),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder="Tìm kiếm trạng thái"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => handleSearch(selectedKeys as string[], confirm, 'status')}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys as string[], confirm, 'status')}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Tìm kiếm
            </Button>
            <Button
              onClick={() => clearFilters && handleReset(clearFilters)}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => close()}
            >
              Đóng
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value: boolean | React.Key, record: ApplicationTypes) => {
        // Handle both filter buttons and search input
        if (typeof value === 'string' && ['pending', 'approved', 'rejected'].includes(value)) {
          return record.status === value;
        }
        // Handle text search
        const statusText = record.status === 'approved' ? 'Đã duyệt' :
          record.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt';
        return statusText.toLowerCase().includes((value as string).toLowerCase()) ||
          record.status.toLowerCase().includes((value as string).toLowerCase());
      },
      filterDropdownProps: {
        onOpenChange(open: any) {
          if (open) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'applicationDate',
      key: 'applicationDate',
      width: 120,
      render: (date: string) => {
        const formattedDate = dayjs(date).format('DD/MM/YYYY');
        return searchedColumn === 'applicationDate' ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={formattedDate}
          />
        ) : (
          formattedDate
        );
      },
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => dayjs(a.applicationDate).unix() - dayjs(b.applicationDate).unix(),
      ...getDateRangeColumnSearchProps('applicationDate', 'Ngày tạo'),
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: ApplicationTypes) => {
        const isPending = record.status === 'pending';
        return (
          <>
            {/* Xem chi tiết */}
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleView(record)}
                style={{ color: '#1677ff' }}
              />
            </Tooltip>

            {/* Chỉnh sửa */}
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
                disabled={!isPending || !updatePer}
                style={{
                  color: !isPending || !updatePer ? '#d9d9d9' : '#52c41a',
                }}
              />
            </Tooltip>

            {/* Duyệt & Từ chối */}
            {isPending && approvePer && (
              <>
                <Tooltip title="Duyệt">
                  <Popconfirm
                    title="Duyệt đơn từ này?"
                    onConfirm={() => handleApprove(record.id!)}
                    okText="Duyệt"
                    cancelText="Hủy"
                  >
                    <Button
                      type="text"
                      icon={<CheckOutlined />}
                      size="small"
                      style={{ color: '#52c41a' }}
                    />
                  </Popconfirm>
                </Tooltip>

                <Tooltip title="Từ chối">
                  <Popconfirm
                    title="Từ chối đơn từ này?"
                    onConfirm={() => handleReject(record.id!)}
                    okText="Từ chối"
                    cancelText="Hủy"
                  >
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      size="small"
                      style={{ color: '#ff4d4f' }}
                    />
                  </Popconfirm>
                </Tooltip>
              </>
            )}
          </>
        );
      },
    },
  ];

  // Selection handlers
  const onChangeSelection = (selectedRowKeys: React.Key[]): void => {
    setSelectedIds(selectedRowKeys);
  };

  const showDeleteConfirm = (): void => {
    setIsDeleteModalVisible(true);
  };

  const hideDeleteModal = (): void => {
    setIsDeleteModalVisible(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await applicationService.deleteApplication(Number(id));
      }

      // Update data after successful deletion
      const newData = applications.filter(item => !selectedIds.includes(item.id!));
      setApplications(newData);
      setSelectedIds([]);
      message.success('Xóa thành công!');
    } catch (error) {
      message.error('Không thể xóa đơn từ');
    } finally {
      setLoading(false);
      hideDeleteModal();
    }
  };

  // Handle actions
  const handleCreate = () => {
    router.push('/applications/create');
  };

  const handleView = (record: ApplicationTypes) => {
    router.push(`/applications/view/${record.id}`);
  };

  const handleEdit = (record: ApplicationTypes) => {
    router.push(`/applications/edit/${record.id}`);
  };

  const handleApprove = async (id: number) => {
    try {
      await applicationService.approveApplication(id, {
        approvedBy: 1,
        approvalNotes: 'Đã duyệt'
      });
      message.success('Duyệt đơn từ thành công');
      loadData();
    } catch (error) {
      message.error('Không thể duyệt đơn từ');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await applicationService.rejectApplication(id, {
        rejectedBy: 1,
        rejectionReason: 'Từ chối'
      });
      message.success('Từ chối đơn từ thành công');
      loadData();
    } catch (error) {
      message.error('Không thể từ chối đơn từ');
    }
  };

  return (
    <div style={{ padding: screens.lg ? 24 : 16 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && deletePer && (
              <Button
                danger
                className='btn-top'
                onClick={showDeleteConfirm}
              >
                <DeleteOutlined />
                Xóa ({selectedIds.length})
              </Button>
            )}

            <Button
              onClick={handleCreate}
              type="primary"
              className='btn-top'
              hidden={!createPer}
            >
              <PlusCircleOutlined />
              Tạo đơn từ
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={columns}
              dataSource={applications}
              loading={loading}
              rowKey="id"
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: onChangeSelection,
                getCheckboxProps: (record: ApplicationTypes) => ({
                  disabled: record.status !== 'pending', // Disable checkbox for non-pending items
                }),
              }}
              scroll={{ x: 'max-content' }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total: number) => `Tổng số: ${total} bản ghi`,
                size: screens.lg ? 'default' : 'small'
              }}
              rowClassName={(_, index) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
              size={screens.lg ? 'middle' : 'small'}
            />
          </div>
        </Col>
      </Row>

      <Modal
        title="Xác nhận xóa"
        open={isDeleteModalVisible}
        onOk={handleDelete}
        onCancel={hideDeleteModal}
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <p>Bạn có chắc chắn muốn xóa {selectedIds.length} đơn từ đã chọn?</p>
      </Modal>

      <style jsx global>{`
        .row-even {
          background-color: #f5f5f5;
        }
        .row-odd {
          background-color: #ffffff;
        }
        .btn-top {
          margin-right: 8px;
        }
        @media (max-width: 768px) {
          .ant-table-thead > tr > th,
          .ant-table-tbody > tr > td {
            padding: 8px 4px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ApplicationManagement;

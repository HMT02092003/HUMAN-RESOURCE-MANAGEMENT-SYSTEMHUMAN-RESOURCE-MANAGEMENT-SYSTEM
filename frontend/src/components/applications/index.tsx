import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Space, Typography, Empty, message, Tooltip, DatePicker, Input, Row, Col } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { FilterConfirmProps, FilterDropdownProps } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import applicationService, { ApplicationTypes } from '@/service/applicationService';
import { getStatusTag, getTypeTag, formatApplicationDetails, getMockApplications } from './utils';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ApplicationListProps {
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

const ApplicationList: React.FC<ApplicationListProps> = ({ 
  showCreateButton = true, 
  onCreateClick 
}) => {
  const [applications, setApplications] = useState<ApplicationTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<any>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationService.getApplications({});
      setApplications(response.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      // Use fake data if API fails
      setApplications(getMockApplications());
      message.warning('Không thể tải dữ liệu từ server, hiển thị dữ liệu mẫu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: string,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = (dataIndex: string, placeholder: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={placeholder}
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
            Tìm
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Xóa
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Lọc
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            Đóng
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  const getDateRangeFilter = () => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <RangePicker
          value={selectedKeys[0] ? [dayjs(String(selectedKeys[0]).split(',')[0]), dayjs(String(selectedKeys[0]).split(',')[1])] : null}
          onChange={(dates) => {
            if (dates) {
              setSelectedKeys([`${dates[0]?.format('YYYY-MM-DD')},${dates[1]?.format('YYYY-MM-DD')}`]);
            } else {
              setSelectedKeys([]);
            }
          }}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90 }}
          >
            Áp dụng
          </Button>
          <Button
            onClick={() => {
              clearFilters && clearFilters();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Xóa
          </Button>
        </Space>
      </div>
    ),
    onFilter: (value: any, record: any) => {
      if (!value) return true;
      const [startDate, endDate] = String(value).split(',');
      const recordDate = dayjs(record.applicationDate);
      return recordDate.isAfter(dayjs(startDate).subtract(1, 'day')) && 
             recordDate.isBefore(dayjs(endDate).add(1, 'day'));
    },
  });

  // Using imported utility functions instead of duplicated code

  const handleView = (record: ApplicationTypes) => {
    message.info(`Xem chi tiết đơn #${record.id}`);
  };

  const handleCancel = (record: ApplicationTypes) => {
    message.warning(`Hủy đơn #${record.id}`);
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <Text strong>#{id}</Text>,
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => (a.id || 0) - (b.id || 0),
    },
    {
      title: 'Loại đơn',
      dataIndex: 'applicationType',
      key: 'applicationType',
      width: 140,
      render: (type: string) => getTypeTag(type),
      filters: [
        { text: '📝 Đơn nghỉ', value: 'leave' },
        { text: '⏰ Tăng ca', value: 'overtime' },
        { text: '✈️ Công tác', value: 'business_trip' },
        { text: '⏰ Quên check', value: 'forgot_checkin' },
        { text: '🕒 Đăng ký ca', value: 'shift_registration' },
        { text: '📄 Thôi việc', value: 'resignation' }
      ],
      onFilter: (value: any, record: ApplicationTypes) => record.applicationType === value,
    },
    {
      title: 'Chi tiết',
      key: 'details',
      render: (record: ApplicationTypes) => (
        <div>
          <Text strong>{formatApplicationDetails(record)}</Text>
          <br />
          <Text type="secondary" className="text-sm">
            {record.reason}
          </Text>
          {record.rejectedReason && (
            <>
              <br />
              <Text type="danger" className="text-sm">
                Lý do từ chối: {record.rejectedReason}
              </Text>
            </>
          )}
        </div>
      ),
      ...getColumnSearchProps('reason', 'Tìm theo lý do...'),
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'applicationDate',
      key: 'applicationDate',
      width: 120,
      render: (date: string) => <Text>{date}</Text>,
      sorter: (a: ApplicationTypes, b: ApplicationTypes) => 
        dayjs(a.applicationDate).unix() - dayjs(b.applicationDate).unix(),
      ...getDateRangeFilter(),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => getStatusTag(status),
      filters: [
        { text: '⏳ Chờ duyệt', value: 'pending' },
        { text: '✅ Đã duyệt', value: 'approved' },
        { text: '❌ Bị từ chối', value: 'rejected' }
      ],
      onFilter: (value: any, record: ApplicationTypes) => record.status === value,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (record: ApplicationTypes) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip title="Hủy đơn">
              <Button 
                danger 
                size="small" 
                icon={<DeleteOutlined />}
                onClick={() => handleCancel(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          {showCreateButton && (
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={onCreateClick}
              style={{
                borderRadius: '8px',
                height: '48px',
                paddingLeft: '24px',
                paddingRight: '24px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Tạo đơn mới
            </Button>
          )}
        </Col>
      </Row>

      {/* Applications Table with built-in filters */}
      <Table
        columns={columns}
        dataSource={applications}
        rowKey="id"
        loading={loading}
        pagination={{
          total: applications.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} của ${total} đơn từ`,
          style: { marginTop: '24px' }
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '60px', marginBottom: '16px' }}>📭</div>
                  <Title level={4} type="secondary" style={{ marginBottom: '8px' }}>
                    Chưa có đơn từ nào
                  </Title>
                  <Text type="secondary">Tạo đơn từ đầu tiên của bạn</Text>
                </div>
              }
            />
          )
        }}
        style={{
          background: 'white',
          borderRadius: '8px'
        }}
        size="middle"
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default ApplicationList;

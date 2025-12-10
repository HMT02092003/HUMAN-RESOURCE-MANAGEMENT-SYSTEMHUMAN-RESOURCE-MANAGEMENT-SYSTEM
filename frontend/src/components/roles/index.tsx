"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfigProvider, message, Space, Table, Tooltip, Modal, Popconfirm, Input, Select, Grid, Row, Col } from 'antd';
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, PlusOutlined, KeyOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { roleService } from '@/service/roleService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

// Định nghĩa interface cho dữ liệu vai trò
interface Role {
  id: string | number;
  name: string;
  description?: string;
  parentName?: string;
  createdAt?: string | Date;
  [key: string]: any;
}

interface TableRefType {
  reload?: () => void;
}

// Hàm định dạng ngày
const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

const Roles: React.FC = () => {
  const tableRef = useRef<TableRefType>(null);
  const screens = Grid.useBreakpoint();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchColumn, setSearchColumn] = useState('name');

  // Server-side pagination and sorting state
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12, total: 0 });
  const [sorter, setSorter] = useState<{ field: string; order: 'ascend' | 'descend' | undefined }>({ field: '', order: undefined });

  // Giả lập quyền hạn
  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;

  const getColumnSearchProps = (dataIndex: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Tìm kiếm ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Tìm kiếm
          </Button>
          <Button
            onClick={() => clearFilters && clearFilters()}
            size="small"
            style={{ width: 90 }}
          >
            Đặt lại
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: Role): boolean => {
      const recordValue = record[dataIndex];
      if (!recordValue) return false;
      return recordValue.toString().toLowerCase().includes(value.toString().toLowerCase());
    },
  });

  const columns: ColumnsType<Role> = [
    {
      title: "Tên vai trò",
      dataIndex: 'name',
      key: 'roles.name',
      sorter: true,
      width: 200,
      ...getColumnSearchProps('name'),
    },
    {
      title: "Mô tả vai trò",
      dataIndex: 'description',
      key: 'roles.description',
      sorter: true,
      width: 150,
      ...getColumnSearchProps('description'),
    },
    {
      title: "Ngày tạo",
      dataIndex: 'createdAt',
      key: 'roles.createdAt',
      sorter: true,
      render: (text: Date | string) => formatDate(text),
      width: 150,
    },
    {
      title: "Phân quyền",
      dataIndex: 'decentralization',
      key: "decentralization",
      width: 150,
      render: (_: any, record: Role) => {
        return (
          <Button
            onClick={() => router.push(`roles/decentralization/${record.id}`)}
            type="primary"
          >
            <PlusCircleOutlined />
            Phân quyền
          </Button>
        )
      }
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: "actions",
      fixed: 'right' as const,
      width: 80,
      render: (_: any, record: Role) => (
        <ConfigProvider
          theme={{
            components: {
              Button: {
                colorBgContainer: "transparent",
                colorText: "#595959",
                colorBorder: "transparent",
                borderRadius: 4,
                boxShadow: "none",
              },
            },
          }}
        >
          <Space size="small">
            <Tooltip title="Chỉnh sửa">
              <Button
                type="default"
                shape="circle"
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  router.push(`roles/edit/${record.id}`);
                }}
                hidden={!updatePer}
              />
            </Tooltip>
          </Space>
        </ConfigProvider>
      ),
    },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (sorter.field && sorter.order) {
        params.sort = sorter.field;
        params.order = sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      const response = await roleService.getAllRoles(params);
      setRoles(response.data || []);
      setPagination(prev => ({ ...prev, total: response.total || 0 }));
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, sorter.field, sorter.order]);

  const handleTableChange = (
    paginationConfig: any,
    filters: any,
    sorterConfig: any
  ) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: pagination.total,
    });

    if (sorterConfig.field) {
      setSorter({
        field: sorterConfig.field,
        order: sorterConfig.order,
      });
    } else {
      setSorter({ field: '', order: undefined });
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await roleService.deleteMultipleRoles(selectedRowKeys);
      message.success('Xóa vai trò thành công!');
      await fetchData();
      setSelectedRowKeys([]);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi xóa vai trò');
    } finally {
      setLoading(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ padding: screens.lg ? 24 : 16 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa các vai trò đã chọn?"
                  onConfirm={handleDelete}
                  okText="Có"
                  cancelText="Không"
                >
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    Xóa đã chọn
                  </Button>
                </Popconfirm>
              )}

              <Button
                onClick={() => {
                  router.push('/roles/create');
                }}
                type="primary"
                className='btn-top'
                hidden={!createPer}
              >
                <PlusCircleOutlined />
                Tạo mới vai trò
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              ref={tableRef as React.Ref<any>}
              columns={columns}
              dataSource={roles || []}
              loading={loading}
              rowKey="id"
              rowSelection={rowSelection}
              scroll={{ x: 'max-content' }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['12', '24', '36', '48'],
                showTotal: (total: number) => `Tổng số: ${total} bản ghi`,
                size: screens.lg ? 'default' : 'small'
              }}
              onChange={handleTableChange}
              rowClassName={(_, index) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
              size={screens.lg ? 'middle' : 'small'}
            />
          </div>
        </Col>
      </Row>

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

export default Roles;
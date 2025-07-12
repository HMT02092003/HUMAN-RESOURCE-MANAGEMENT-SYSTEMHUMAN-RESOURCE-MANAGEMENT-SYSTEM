"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfigProvider, message, Space, Table, Tooltip, Modal, Popconfirm, Input, Select } from 'antd';
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, PlusOutlined, KeyOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { roleService } from '@/src/service/roleService';
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchColumn, setSearchColumn] = useState('name');

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
      sorter: (a: Role, b: Role) => a.name.localeCompare(b.name),
      width: 200,
      ...getColumnSearchProps('name'),
    },
    {
      title: "Mô tả vai trò",
      dataIndex: 'description',
      key: 'roles.description',
      sorter: (a: Role, b: Role) => (a.description || '').localeCompare(b.description || ''),
      width: 150,
      ...getColumnSearchProps('description'),
    },
    {
      title: "Ngày tạo",
      dataIndex: 'createdAt',
      key: 'roles.createdAt',
      sorter: (a: Role, b: Role) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
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
      const data = await roleService.getAllRoles();
      setRoles(data);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await roleService.deleteMultipleRoles(selectedRowKeys);
      message.success('Xóa vai trò thành công!');
      fetchData();
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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            style={{ width: 120 }}
            value={searchColumn}
            onChange={setSearchColumn}
            options={[
              { value: 'name', label: 'Tên vai trò' },
              { value: 'description', label: 'Mô tả' },
            ]}
          />
          <Input
            placeholder="Tìm kiếm..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
        </div>

        <div>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa các vai trò đã chọn?"
            onConfirm={handleDelete}
            okText="Có"
            cancelText="Không"
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
            >
              Xóa đã chọn
            </Button>
          </Popconfirm>

          <Button
            onClick={() => {
              router.push('/roles/create');
            }}
            type="primary"
            className='btn-top'
            style={{ marginRight: 8 }}
            hidden={!createPer}
          >
            <PlusCircleOutlined />
            Tạo mới vai trò
          </Button>
        </div>
      </div>

      <Table
        ref={tableRef as React.Ref<any>}
        columns={columns}
        dataSource={roles || []}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 12,
          showSizeChanger: true,
          pageSizeOptions: ['12', '24', '36', '48'],
          showTotal: (total: number) => `Tổng số: ${total} bản ghi`
        }}
        rowClassName={(_, index) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
      />

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
      `}</style>
    </div>
  );
};

export default Roles;
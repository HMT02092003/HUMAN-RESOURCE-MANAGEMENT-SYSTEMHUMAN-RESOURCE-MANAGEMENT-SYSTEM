"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, ConfigProvider, message, Space, Tooltip, Modal, Popconfirm, Input, Select, Grid, Row, Col } from 'antd';
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, PlusOutlined, KeyOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { roleService } from '@/service/roleService';
import dayjs from 'dayjs';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable';

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
  const [roles, setRoles] = useState<Role[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Giả lập quyền hạn
  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;

  // Fetch function cho ServerSideTable
  const fetchData = useCallback(async (params: any) => {
    try {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
      };

      if (params.sort && params.order) {
        apiParams.sort = params.sort;
        apiParams.order = params.order;
      }

      // Xử lý search
      if (params.search && params.search_field) {
        apiParams[params.search_field] = params.search;
      }

      const response = await roleService.getAllRoles(apiParams);
      return {
        data: response.data || [],
        total: response.total || 0
      };
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu');
      return { data: [], total: 0 };
    }
  }, []);
  const columns: ServerSideColumnType<Role>[] = useMemo(() => [
    {
      title: "Tên vai trò",
      dataIndex: 'name',
      key: 'name',
      searchable: true,
      sortable: true,
      searchField: 'name',
      filterType: 'text',
      width: 200,
    },
    {
      title: "Mô tả vai trò",
      dataIndex: 'description',
      key: 'description',
      searchable: true,
      sortable: true,
      searchField: 'description',
      filterType: 'text',
      width: 150,
    },
    {
      title: "Ngày tạo",
      dataIndex: 'createdAt',
      key: 'createdAt',
      sortable: true,
      searchable: false,
      filterType: 'none',
      render: (text: Date | string) => formatDate(text),
      width: 150,
    },
    {
      title: "Phân quyền",
      dataIndex: 'decentralization',
      key: "decentralization",
      width: 150,
      searchable: false,
      sortable: false,
      filterType: 'none',
      render: (_: any, record: Role) => (
        <Button
          onClick={() => router.push(`roles/decentralization/${record.id}`)}
          type="primary"
        >
          <PlusCircleOutlined />
          Phân quyền
        </Button>
      )
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: "actions",
      fixed: 'right' as const,
      width: 80,
      searchable: false,
      sortable: false,
      filterType: 'none',
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
  ], [router, updatePer]);

  const handleDelete = async () => {
    try {
      await roleService.deleteMultipleRoles(selectedRowKeys as any);
      setSelectedRowKeys([]);
      setRefreshTrigger(prev => prev + 1);
      message.success('Xóa vai trò thành công!');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi xóa vai trò');
    }
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

              <ExcelExportButton
                data={roles.map(role => ({
                  ...role,
                  createdAt: role.createdAt ? formatDate(role.createdAt) : ''
                }))}
                columns={[
                  { title: 'Tên vai trò', dataIndex: 'name', width: 25 },
                  { title: 'Mô tả', dataIndex: 'description', width: 35 },
                  { title: 'Vai trò cha', dataIndex: 'parentName', width: 20 },
                  { title: 'Ngày tạo', dataIndex: 'createdAt', width: 15 }
                ]}
                fileName={`danh-sach-vai-tro-${dayjs().format('YYYY-MM-DD')}`}
                title="DANH SÁCH VAI TRÒ"
                description={`Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
              />
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <ServerSideTable
            columns={columns}
            fetchData={fetchData}
            rowKey="id"
            defaultSortField="createdAt"
            defaultSortOrder="desc"
            defaultPageSize={12}
            showSelection={true}
            onSelectionChange={useCallback((keys: React.Key[]) => setSelectedRowKeys(keys), [])}
            refreshTrigger={refreshTrigger}
            showTotal={true}
            onDataChange={useCallback((data: Role[]) => setRoles(data), [])}
            scroll={{ x: 'max-content' }}
            rowClassName={(_: any, index: number) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
            size={screens.lg ? 'middle' : 'small'}
          />
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
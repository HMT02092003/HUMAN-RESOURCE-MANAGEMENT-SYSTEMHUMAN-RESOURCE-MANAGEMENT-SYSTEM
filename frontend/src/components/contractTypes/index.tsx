"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfigProvider, Space, Table, Tooltip, Modal, message, Input, Grid, Row, Col } from "antd";
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from 'dayjs';
import { contractTypeService } from '@/service/contractTypeService';

interface ContractType {
  id: number;
  name: string;
  description: string;
  contractTerm: number;
  type: number;
  insurance: number;
  created_at: Date;
}

interface TableRefType {
  reload?: () => void;
}

// Hàm định dạng ngày
const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

const Index: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const tableRef = useRef<TableRefType>(null);
  const [hiddenDeleteBtn, setHiddenDeleteBtn] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // 🔥 Server-side: State cho pagination, sort và search
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [sorter, setSorter] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'created_at', order: 'desc' });
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchField, setSearchField] = useState<string | undefined>(undefined);

  // Giả lập quyền hạn
  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, sorter.field, sorter.order, searchKeyword]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
        sort: sorter.field,
        order: sorter.order,
      };

      if (searchKeyword) {
        params.search = searchKeyword;
        if (searchField) params.search_field = searchField;
      }

      const response = await contractTypeService.getAllContractTypes(params);
      setContractTypes(response.data || []);
      setPagination(prev => ({ ...prev, total: response.total || 0 }));
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Đã xảy ra lỗi khi tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  };

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

    if (sorterConfig.field && sorterConfig.order) {
      setSorter({
        field: sorterConfig.field,
        order: sorterConfig.order === 'ascend' ? 'asc' : 'desc',
      });
    } else {
      setSorter({ field: 'created_at', order: 'desc' });
    }
  };

  // 🔥 Server-side search handler
  const handleSearch = (value: string) => {
    // Global search
    setSearchField(undefined);
    setSearchKeyword(value);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset về trang 1 khi search
  };

  const handleColumnSearch = (field: string, value: string) => {
    setSearchField(field);
    setSearchKeyword(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const columns = [
    {
      title: 'Tên hợp đồng',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Tìm theo tên"
            value={selectedKeys && selectedKeys[0] ? selectedKeys[0] : ''}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => {
              const val = (selectedKeys && selectedKeys[0]) || '';
              handleColumnSearch('name', val);
              confirm();
            }}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            size="small"
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const val = (selectedKeys && selectedKeys[0]) || '';
                handleColumnSearch('name', val);
                confirm();
              }}
              size="small"
            >Tìm</Button>
            <Button
              onClick={() => {
                clearFilters && clearFilters();
                setSearchField(undefined);
                setSearchKeyword('');
                confirm();
              }}
              size="small"
            >Xóa</Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    },
    {
      title: 'Mô tả hợp đồng',
      dataIndex: 'description',
      key: 'description',
      sorter: true,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Tìm theo mô tả"
            value={selectedKeys && selectedKeys[0] ? selectedKeys[0] : ''}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => {
              const val = (selectedKeys && selectedKeys[0]) || '';
              handleColumnSearch('description', val);
              confirm();
            }}
            style={{ width: 220, marginBottom: 8, display: 'block' }}
            size="small"
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                const val = (selectedKeys && selectedKeys[0]) || '';
                handleColumnSearch('description', val);
                confirm();
              }}
              size="small"
            >Tìm</Button>
            <Button
              onClick={() => {
                clearFilters && clearFilters();
                setSearchField(undefined);
                setSearchKeyword('');
                confirm();
              }}
              size="small"
            >Xóa</Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    },
    {
      title: "Mức bảo hiểm",
      dataIndex: 'insurance',
      key: 'insurance',
      sorter: true,
    },
    {
      title: "Thời hạn hợp đồng",
      dataIndex: 'contractTerm',
      key: 'contractTerm',
      sorter: true,
      render: (value: number) => {
        return value ? `${value} tháng` : 'Vô thời hạn';
      },
    },
    {
      title: "Loại hợp đồng",
      dataIndex: 'type',
      key: 'type',
      sorter: true,
      render: (value: number) => {
        const typeLabels: { [key: number]: string } = {
          1: "Hợp đồng Thực tập",
          2: "Hợp đồng Thử việc",
          3: "Hợp đồng Lao động (Có thời hạn)",
          4: "Hợp đồng Lao động (Không thời hạn)",
          5: "Hợp đồng Đào tạo nghề",
          6: "Hợp đồng Cộng tác viên (CTV)",
          7: "Hợp đồng Khoán việc",
        };
        return typeLabels[value] || "Khác";
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      sorter: true,
      render: (text: Date) => formatDate(text),
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: "actions",
      fixed: 'right' as 'right',
      width: 5,
      render: (_: unknown, record: ContractType) => (
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
                onClick={() => router.push(`/contractTypes/edit/${record.id}`)}
                hidden={!updatePer}
              />
            </Tooltip>
          </Space>
        </ConfigProvider>
      ),
    },
  ];

  const onChangeSelection = (selectedRowKeys: React.Key[]): void => {
    if (selectedRowKeys.length) setHiddenDeleteBtn(false);
    else setHiddenDeleteBtn(true);
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
      await contractTypeService.deleteMultipleContractTypes(selectedIds);
      
      // Reload data after successful deletion
      await loadData();
      setSelectedIds([]);
      setHiddenDeleteBtn(true);
      message.success('Xóa thành công!');
    } catch (error) {
      console.error('Error deleting data:', error);
      message.error('Đã xảy ra lỗi khi xóa dữ liệu!');
    } finally {
      setLoading(false);
      hideDeleteModal();
    }
  };

  return (
    <div style={{ padding: screens.lg ? 24 : 16 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedIds.length > 0 && (
                <Button
                  danger
                  className='btn-top'
                  onClick={showDeleteConfirm}
                  hidden={hiddenDeleteBtn || !deletePer}
                >
                  <DeleteOutlined />
                  Xóa
                </Button>
              )}

              <Button
                onClick={() => router.push("/contractTypes/create")}
                type="primary"
                className='btn-top'
                hidden={!createPer}
              >
                <PlusCircleOutlined />
                Tạo mới hợp đồng
              </Button>
            </div>

            {/* 🔥 Server-side search input */}
            <Input.Search
              placeholder="Tìm kiếm theo tên, mô tả..."
              allowClear
              onSearch={handleSearch}
              style={{ width: screens.lg ? 300 : '100%' }}
              enterButton={<SearchOutlined />}
            />
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              ref={tableRef as React.Ref<any>}
              columns={columns}
              dataSource={contractTypes}
              loading={loading}
              rowKey="id"
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: onChangeSelection
              }}
              scroll={{ x: 'max-content' }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '50', '100', '500'],
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

      <Modal
        title="Xác nhận xóa"
        open={isDeleteModalVisible}
        onOk={handleDelete}
        onCancel={hideDeleteModal}
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <p>Bạn có chắc chắn muốn xóa các hợp đồng đã chọn?</p>
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

export default Index;
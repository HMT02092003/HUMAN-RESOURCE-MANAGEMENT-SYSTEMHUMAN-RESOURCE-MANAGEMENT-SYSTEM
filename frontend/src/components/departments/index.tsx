import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfigProvider, Tooltip, Space, Table, Modal, message, Input, Grid, Row, Col } from "antd";
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { departmentService } from '@/service/departmentService';
import type { InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import Highlighter from 'react-highlight-words';

// Định nghĩa interfaces
interface DepartmentData {
  id: number;
  name: string;
  description: string;
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

const MyHighlighter = Highlighter as unknown as React.FC<any>;

const Index: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const tableRef = useRef<TableRefType>(null);
  const searchInput = useRef<InputRef>(null);
  const [hiddenDeleteBtn, setHiddenDeleteBtn] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const [DepartmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const router = useRouter();

  // Giả lập quyền hạn
  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await departmentService.getAllDepartments();
      setDepartmentData(data);
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Đã xảy ra lỗi khi tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (
    selectedKeys: string[],
    confirm: FilterDropdownProps['confirm'],
    dataIndex: keyof DepartmentData,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = (dataIndex: keyof DepartmentData) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Tìm kiếm ${dataIndex}`}
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
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: DepartmentData) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    filterDropdownProps: {
      onOpenChange(open: boolean) {
        if (open) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
    render: (text: string) =>
      searchedColumn === text ? (
        <MyHighlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text}
        />
      ) : (
        text
      ),
  });

  const columns = [
    {
      title: "Tên phòng ban",
      dataIndex: 'name',
      key: 'name',
      sorter: (a: DepartmentData, b: DepartmentData) => a.name.localeCompare(b.name),
      width: 200,
      ...getColumnSearchProps('name'),
    },
    {
      title: "Mô tả phòng ban",
      dataIndex: 'description',
      key: 'description',
      sorter: (a: DepartmentData, b: DepartmentData) => a.description.localeCompare(b.description),
      width: 300,
      ...getColumnSearchProps('description'),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      sorter: (a: DepartmentData, b: DepartmentData) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      ...getColumnSearchProps('created_at'),
      render: (text: Date) => {
        const formattedDate = formatDate(text);
        return searchedColumn === 'created_at' ? (
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
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: "actions",
      fixed: 'right' as 'right',
      width: 5,
      render: (_: unknown, record: DepartmentData) => (
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
                  router.push(`departments/edit/${record.id}`);
                }}
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
      await departmentService.deleteMultipleDepartments(selectedIds);
      
      // Cập nhật lại dữ liệu sau khi xóa thành công
      const newData = DepartmentData.filter(item => !selectedIds.includes(item.id));
      setDepartmentData(newData);
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
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && (
              <Button
                danger
                className='btn-top'
                onClick={showDeleteConfirm}
              >
                <DeleteOutlined />
                Xóa
              </Button>
            )}

            <Button
              onClick={() => {
                router.push('/departments/create');
              }}
              type="primary"
              className='btn-top'
              hidden={!createPer}
            >
              <PlusCircleOutlined />
              Tạo mới phòng ban
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              ref={tableRef as React.Ref<any>}
              columns={columns}
              dataSource={DepartmentData}
              loading={loading}
              rowKey="id"
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: onChangeSelection
              }}
              scroll={{ x: 'max-content' }}
              pagination={{
                pageSize: 12,
                showSizeChanger: true,
                pageSizeOptions: ['12', '24', '36', '48'],
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
        <p>Bạn có chắc chắn muốn xóa các phòng ban đã chọn?</p>
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

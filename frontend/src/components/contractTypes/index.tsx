"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfigProvider, Space, Table, Tooltip, Modal, message, Input } from "antd";
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from 'dayjs';
import { contractTypeService } from '@/src/service/contractTypeService';
import type { InputRef } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import Highlighter from 'react-highlight-words';
const MyHighlighter = Highlighter as unknown as React.FC<any>;

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
  const tableRef = useRef<TableRefType>(null);
  const searchInput = useRef<InputRef>(null);
  const [hiddenDeleteBtn, setHiddenDeleteBtn] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
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
      const data = await contractTypeService.getAllContractTypes();
      setContractTypes(data);
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
    dataIndex: keyof ContractType,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = (dataIndex: keyof ContractType) => ({
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
    onFilter: (value: boolean | React.Key, record: ContractType) =>
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
      title: "Tên hợp đồng",
      dataIndex: 'name',
      key: 'contract_types.name',
      sorter: (a: ContractType, b: ContractType) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name'),
    },
    {
      title: "Mô tả hợp đồng",
      dataIndex: 'description',
      key: 'contract_types.description',
      sorter: (a: ContractType, b: ContractType) => a.description.localeCompare(b.description),
      ...getColumnSearchProps('description'),
    },
    {
      title: "Thời hạn hợp đồng",
      dataIndex: 'contractTerm',
      key: 'contract_types.contractTerm',
      sorter: (a: ContractType, b: ContractType) => a.contractTerm - b.contractTerm,
      ...getColumnSearchProps('contractTerm'),
      render: (value: number) => {
        const text = value ? `${value} tháng` : 'Vô thời hạn';
        return searchedColumn === 'contractTerm' ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text}
          />
        ) : (
          text
        );
      },
    },
    {
      title: "Loại hợp đồng",
      dataIndex: 'type',
      key: 'contract_types.type',
      sorter: (a: ContractType, b: ContractType) => a.type - b.type,
      ...getColumnSearchProps('type'),
      render: (value: number) => {
        const text = value === 1 ? "Hợp đồng thực tập" : value === 2 ? "Hợp đồng chính thức" : " ";
        return searchedColumn === 'type' ? (
          <MyHighlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text}
          />
        ) : (
          text
        );
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "contractTypes.created_at",
      sorter: (a: ContractType, b: ContractType) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
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
      
      // Cập nhật lại dữ liệu sau khi xóa thành công
      const newData = contractTypes.filter(item => !selectedIds.includes(item.id));
      setContractTypes(newData);
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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div>
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
      </div>

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
          pageSize: 12,
          showSizeChanger: true,
          pageSizeOptions: ['12', '24', '36', '48'],
          showTotal: (total: number) => `Tổng số: ${total} bản ghi`
        }}
        rowClassName={(_, index) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
      />

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
      `}</style>
    </div>
  );
};

export default Index;
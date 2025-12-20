import React, { useState, useRef, useEffect } from 'react';
import { Button, ConfigProvider, Tooltip, Space, Modal, message, Grid, Row, Col } from "antd";
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { chevronService } from '@/service/chevronService';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable';

// Định nghĩa interfaces
interface ChevronData {
  id: number;
  name: string;
  description: string;
  chevronCoefficient: string;
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

// Excel column configuration
const excelColumns: ExcelColumn[] = [
  {
    title: 'Tên chức vụ',
    dataIndex: 'name',
    width: 25
  },
  {
    title: 'Mô tả chức vụ',
    dataIndex: 'description',
    width: 40
  },
  {
    title: 'Hệ số chức vụ',
    dataIndex: 'chevronCoefficient',
    width: 15
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'created_at',
    width: 15,
    render: (value: any) => formatDate(value)
  }
];

const Index: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const tableRef = useRef<TableRefType>(null);
  const [hiddenDeleteBtn, setHiddenDeleteBtn] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const [chevronData, setChevronData] = useState<ChevronData[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Giả lập quyền hạn
  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;

  const loadData = async (params: any) => {
    try {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
        sort: params.sort || 'created_at',
        order: params.order || 'desc',
      };

      if (params.search && params.search_field) {
        apiParams.search = params.search;
        apiParams.search_field = params.search_field;
      }

      const response = await chevronService.getAllChevrons(apiParams);
      return {
        data: response.data || [],
        total: response.total || 0
      };
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Đã xảy ra lỗi khi tải dữ liệu!');
      return { data: [], total: 0 };
    }
  };

  const columns: ServerSideColumnType<ChevronData>[] = [
    {
      title: 'Tên chức vụ',
      dataIndex: 'name',
      key: 'name',
      searchable: true,
      sortable: true,
      searchField: 'name',
      filterType: 'text',
      width: 200,
    },
    {
      title: 'Mô tả chức vụ',
      dataIndex: 'description',
      key: 'description',
      searchable: true,
      sortable: true,
      searchField: 'description',
      filterType: 'text',
      width: 300,
    },
    {
      title: "Hệ số chức vụ",
      dataIndex: 'chevronCoefficient',
      key: 'chevronCoefficient',
      sortable: true,
      searchable: false,
      filterType: 'none',
      width: 150,
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      sortable: true,
      searchable: false,
      filterType: 'none',
      width: 150,
      render: (text: Date) => formatDate(text),
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: "actions",
      fixed: 'right' as 'right',
      searchable: false,
      sortable: false,
      filterType: 'none',
      width: 5,
      render: (_: unknown, record: ChevronData) => (
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
                  router.push(`chevrons/edit/${record.id}`);
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
    try {
      await chevronService.deleteMultipleChevrons(selectedIds);
      
      setSelectedIds([]);
      setHiddenDeleteBtn(true);
      setRefreshTrigger(prev => prev + 1);
      message.success('Xóa thành công!');
    } catch (error) {
      console.error('Error deleting data:', error);
      message.error('Đã xảy ra lỗi khi xóa dữ liệu!');
    } finally {
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
                >
                  <DeleteOutlined />
                  Xóa
                </Button>
              )}

              <Button
                onClick={() => {
                  router.push('/chevrons/create');
                }}
                type="primary"
                className='btn-top'
                hidden={!createPer}
              >
                <PlusCircleOutlined />
                Tạo mới chức vụ
              </Button>

              {chevronData && chevronData.length > 0 && (
                <ExcelExportButton
                  data={chevronData}
                  columns={excelColumns}
                  fileName="Danh_sach_chuc_vu"
                  title="DANH SÁCH CHỨC VỤ"
                  description={`Tổng số: ${totalRecords} chức vụ | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
                  type="primary"
                  className="btn-top"
                >
                  <DownloadOutlined />
                  Xuất Excel
                </ExcelExportButton>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <div style={{ overflowX: 'auto' }}>
            <ServerSideTable<ChevronData>
              ref={tableRef as React.Ref<any>}
              columns={columns}
              fetchData={loadData}
              rowKey="id"
              defaultSortField="created_at"
              defaultSortOrder="desc"
              defaultPageSize={10}
              showSelection={true}
              onSelectionChange={onChangeSelection}
              refreshTrigger={refreshTrigger}
              onDataChange={(data, pagination) => {
                setChevronData(data);
                setTotalRecords(pagination?.total || 0);
              }}
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
        <p>Bạn có chắc chắn muốn xóa các chức vụ đã chọn?</p>
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
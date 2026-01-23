"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, ConfigProvider, Space, Tooltip, Modal, message, Grid, Row, Col } from "antd";
import { PlusCircleOutlined, DeleteOutlined, EditOutlined, SettingOutlined, SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from 'dayjs';
import { contractTypeService } from '@/service/contractTypeService';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable';

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

// Helper function cho loại hợp đồng
const getContractTypeLabel = (value: number): string => {
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
};

// Excel column configuration
const excelColumns: ExcelColumn[] = [
  {
    title: 'Tên hợp đồng',
    dataIndex: 'name',
    width: 30
  },
  {
    title: 'Mô tả hợp đồng',
    dataIndex: 'description',
    width: 40
  },
  {
    title: 'Mức bảo hiểm',
    dataIndex: 'insurance',
    width: 15
  },
  {
    title: 'Thời hạn hợp đồng',
    dataIndex: 'contractTerm',
    width: 20,
    render: (value: any) => value ? `${value} tháng` : 'Vô thời hạn'
  },
  {
    title: 'Loại hợp đồng',
    dataIndex: 'type',
    width: 35,
    render: (value: any) => getContractTypeLabel(value)
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
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Giả lập quyền hạn
  const createPer: boolean = true;
  const updatePer: boolean = true;
  const deletePer: boolean = true;

  const loadData = useCallback(async (params: any) => {
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

      const response = await contractTypeService.getAllContractTypes(apiParams);
      return {
        data: response.data || [],
        total: response.total || 0
      };
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Đã xảy ra lỗi khi tải dữ liệu!');
      return { data: [], total: 0 };
    }
  }, []);


  const columns: ServerSideColumnType<ContractType>[] = [
    {
      title: 'Tên hợp đồng',
      dataIndex: 'name',
      key: 'name',
      searchField: 'name',
      filterType: 'text',
      sortable: true,
      searchable: true,
      searchPlaceholder: 'Tìm theo tên',
    },
    {
      title: 'Mô tả hợp đồng',
      dataIndex: 'description',
      key: 'description',
      searchField: 'description',
      filterType: 'text',
      sortable: true,
      searchable: true,
      searchPlaceholder: 'Tìm theo mô tả',
    },
    {
      title: "Mức bảo hiểm",
      dataIndex: 'insurance',
      key: 'insurance',
      sortable: true,
      searchable: false,
      filterType: 'none',
    },
    {
      title: "Thời hạn hợp đồng",
      dataIndex: 'contractTerm',
      key: 'contractTerm',
      sortable: true,
      searchable: false,
      filterType: 'none',
      render: (value: number) => value ? `${value} tháng` : 'Vô thời hạn',
    },
    {
      title: "Loại hợp đồng",
      dataIndex: 'type',
      key: 'type',
      sortable: true,
      searchable: false,
      filterType: 'none',
      render: (value: number) => getContractTypeLabel(value),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      sortable: true,
      searchable: false,
      filterType: 'none',
      render: (text: Date) => formatDate(text),
    },
    {
      title: <>&nbsp;&nbsp;<SettingOutlined /></>,
      key: "actions",
      sortable: false,
      searchable: false,
      filterType: 'none',
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

  const showDeleteConfirm = (): void => {
    setIsDeleteModalVisible(true);
  };

  const hideDeleteModal = (): void => {
    setIsDeleteModalVisible(false);
  };

  const handleDelete = async () => {
    try {
      await contractTypeService.deleteMultipleContractTypes(selectedIds);

      setSelectedIds([]);
      setHiddenDeleteBtn(true);
      message.success('Xóa thành công!');
      setRefreshTrigger(prev => prev + 1);
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

              {contractTypes && contractTypes.length > 0 && (
                <ExcelExportButton
                  data={contractTypes}
                  columns={excelColumns}
                  fileName="Danh_sach_loai_hop_dong"
                  title="DANH SÁCH LOẠI HỢP ĐỒNG"
                  description={`Tổng số: ${totalRecords} loại hợp đồng | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
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
          <ServerSideTable
            columns={columns}
            fetchData={loadData}
            rowKey="id"
            defaultSortField="created_at"
            defaultSortOrder="desc"
            defaultPageSize={10}
            showSelection={true}
            onSelectionChange={(keys) => {
              setSelectedIds(keys);
              setHiddenDeleteBtn(keys.length === 0);
            }}
            refreshTrigger={refreshTrigger}
            showTotal={true}
            onDataChange={useCallback((data: any, pagination: any) => {
              setContractTypes(data);
              setTotalRecords(pagination.total);
            }, [])}
            scroll={{ x: 'max-content' }}
            rowClassName={(_: any, index: number) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
            size={screens.lg ? 'middle' : 'small'}
          />
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
import React, { useState, useEffect, useCallback } from "react";
import { Button, Tooltip, ConfigProvider, Modal, message, Tag, Row, Col, Grid, Typography } from 'antd';
import {
  PlusCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  FormOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import dayjs from 'dayjs';
import UserService from '@/service/userService'; // Ensure this path is correct
import { useRouter } from "next/navigation";
import constantConfig from "@/config/constant";
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable';

const { statusOptions, Gender } = constantConfig;

// Utility functions
const formatDate = (date: string | Date | null): string => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

// Helper functions for Excel export
const getGenderText = (genderCode: number | string): string => {
  const gender = Gender.find((g: any) => g.value === Number(genderCode));
  return gender ? gender.label : '';
};

const getStatusText = (statusCode: number | string): string => {
  const status = statusOptions.find((s: any) => s.value === Number(statusCode));
  return status ? status.label : '';
};

// Excel column configuration for user table
const excelColumns: ExcelColumn[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 10
  },
  {
    title: 'Tên đăng nhập',
    dataIndex: 'username',
    width: 20
  },
  {
    title: 'Họ và tên',
    dataIndex: 'fullName',
    width: 30
  },
  {
    title: 'Ngày sinh',
    dataIndex: 'birthday',
    width: 15,
    render: (value: any) => formatDate(value)
  },
  {
    title: 'Email',
    dataIndex: 'email',
    width: 35
  },
  {
    title: 'Số điện thoại',
    dataIndex: 'phone',
    width: 18
  },
  {
    title: 'Giới tính',
    dataIndex: 'gender',
    width: 12,
    render: (value: any) => getGenderText(value)
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    width: 15,
    render: (value: any) => getStatusText(value)
  },
  {
    title: 'Vai trò',
    dataIndex: ['role', 'name'],
    width: 20
  },
  {
    title: 'Phòng ban',
    dataIndex: ['department', 'name'],
    width: 30
  },
  {
    title: 'Chức vụ',
    dataIndex: ['chevron', 'name'],
    width: 25
  },
  {
    title: 'Ngày bắt đầu',
    dataIndex: 'startDate',
    width: 15,
    render: (value: any) => formatDate(value)
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'createdAt',
    width: 20,
    render: (value: any) => formatDate(value)
  }
];

// Kiểu dữ liệu cho trạng thái sắp xếp
interface SorterState {
  field: string;
  order: 'ascend' | 'descend' | undefined;
}

// Main component
const UserTable = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const router = useRouter();
  const screens = Grid.useBreakpoint();

  const createPer = true;
  const updatePer = true;
  const deletePer = true;
  const viewPer = true;

  // 🔥 Fetch function để dùng với ServerSideTable
  const fetchUsers = async (params: any) => {
    try {
      // Xử lý date range params
      const apiParams: any = { ...params };
      
      // Xử lý date range
      if (params.birthday_range) {
        const [start, end] = params.birthday_range.split(',');
        apiParams.birthdayFrom = start;
        apiParams.birthdayTo = end;
        delete apiParams.birthday_range;
      }
      if (params.startDate_range) {
        const [start, end] = params.startDate_range.split(',');
        apiParams.startDateFrom = start;
        apiParams.startDateTo = end;
        delete apiParams.startDate_range;
      }
      if (params.createdAt_range) {
        const [start, end] = params.createdAt_range.split(',');
        apiParams.createdAtFrom = start;
        apiParams.createdAtTo = end;
        delete apiParams.createdAt_range;
      }

      // Đổi tên params cho phù hợp với API
      apiParams.pageSize = params.limit;
      delete apiParams.limit;
      
      // Xử lý sort field
      if (params.sort) {
        apiParams.sortField = params.sort;
        delete apiParams.sort;
      }
      if (params.order) {
        apiParams.sortOrder = params.order === 'asc' ? 'ascend' : 'descend';
        delete apiParams.order;
      }

      const response = await UserService.getAllUsersAll(apiParams);
      
      return {
        data: response.results || response || [],
        total: response.total || 0
      };
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi tải người dùng!');
      return { data: [], total: 0 };
    }
  };

  const handleDelete = async () => {
    try {
      await UserService.deleteMultipleUsers(selectedRowKeys as number[]);
      setSelectedRowKeys([]);
      setIsDeleteModalVisible(false);
      message.success('Xóa người dùng thành công!');
      // Reload data
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error deleting users:', error);
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi xóa người dùng!');
    }
  };

  const showDeleteConfirm = () => {
    setIsDeleteModalVisible(true);
  };

  const hideDeleteModal = () => {
    setIsDeleteModalVisible(false);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // � handleTableChange: Gọi API khi thay đổi pagination hoặc sort
  const handleTableChange = (
    newPagination: any, 
    filters: any, 
    newSorter: any
  ) => {
    // Cập nhật pagination
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));

    // Cập nhật sorter
    if (newSorter && newSorter.field) {
      setSorter({
        field: newSorter.field,
        order: newSorter.order as 'ascend' | 'descend' | undefined,
      });
    } else if (!newSorter || !newSorter.order) {
      // Reset to default sort when sort is cleared
      setSorter({ field: 'id', order: 'descend' });
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record: any) => ({
      disabled: record.id === 1,
    }),
  };

  // 🔥 handleColumnSearch: Cập nhật filter và reset về trang 1
  function handleColumnSearch(value: any, dataIndex: string) {
    const newFilters = { ...columnSearch };
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[dataIndex];
    } else {
      newFilters[dataIndex] = value;
    }
    setColumnSearch(newFilters);
    // Reset về trang 1 khi filter thay đổi
    setPagination(prev => ({ ...prev, current: 1 }));
  }

  function getColumnSearchProps(dataIndex: string, opts?: { type?: 'input' | 'select' | 'dateRange'; options?: { value: any; label: string }[]; placeholder?: string }) {
    const type = opts?.type || 'input';
    const placeholder = opts?.placeholder || dataIndex;
    return {
      filteredValue: columnSearch[dataIndex] ? (Array.isArray(columnSearch[dataIndex]) ? [columnSearch[dataIndex]] : [columnSearch[dataIndex]]) : null,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          {type === 'select' ? (
            <Select
              placeholder={`Chọn ${placeholder}`}
              value={(selectedKeys && selectedKeys[0]) ?? columnSearch[dataIndex] ?? undefined}
              onChange={(v) => setSelectedKeys(v !== undefined && v !== null ? [v] : [])}
              options={opts?.options?.map(o => ({ value: o.value, label: o.label }))}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
              allowClear
              onSelect={() => {
                const val = (selectedKeys && selectedKeys[0]) ?? columnSearch[dataIndex] ?? undefined;
                handleColumnSearch(val, dataIndex);
                confirm();
              }}
            />
          ) : type === 'dateRange' ? (
            <DatePicker.RangePicker
              value={(selectedKeys && selectedKeys[0]) ? [dayjs(selectedKeys[0][0]), dayjs(selectedKeys[0][1])] : (columnSearch[dataIndex] ? [dayjs(columnSearch[dataIndex][0]), dayjs(columnSearch[dataIndex][1])] : undefined)}
              onChange={(vals: any) => {
                if (!vals || vals.length === 0) {
                  setSelectedKeys([]);
                  return;
                }
                const start = vals[0] ? vals[0].toISOString() : null;
                const end = vals[1] ? vals[1].toISOString() : null;
                setSelectedKeys(start && end ? [[start, end]] : []);
                if (start && end) {
                  handleColumnSearch([start, end], dataIndex);
                  confirm();
                }
              }}
              style={{ width: 250, marginBottom: 8, display: 'block' }}
            />
          ) : (
            <Input
              placeholder={`Tìm ${placeholder}`}
              value={(selectedKeys && selectedKeys[0]) ?? columnSearch[dataIndex] ?? ''}
              onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => { handleColumnSearch((selectedKeys && selectedKeys[0]) || '', dataIndex); confirm(); }}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
          )}
          <Button
            type="primary"
            size="small"
            onClick={() => { handleColumnSearch((selectedKeys && selectedKeys[0]) || '', dataIndex); confirm(); }}
          >
            Tìm
          </Button>
          <Button
            size="small"
            onClick={() => { 
              clearFilters && clearFilters(); 
              handleColumnSearch('', dataIndex); 
            }}
            style={{ marginLeft: 8 }}
          >
            Xóa
          </Button>
        </div>
      ),
      filterIcon: (filtered: any) => <SearchOutlined style={{ color: columnSearch[dataIndex] ? '#1890ff' : undefined }} />,
      onFilter: () => true, // Server-side filtering
    };
  }

  const columns: ServerSideColumnType<any>[] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      searchField: "search",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 80,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      searchField: "username",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 150,
      render: (text: string) => <Typography.Text copyable>{text || '-'}</Typography.Text>,
    },
    {
      title: "Ảnh",
      dataIndex: "identificationPhoto",
      key: "identificationPhoto",
      filterType: "none",
      sortable: false,
      searchable: false,
      width: 80,
      render: (url: string) => url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="avatar"
          src={url.startsWith('/') ? url : `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}${url}`}
          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
        />
      ) : '-',
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      searchField: "fullName",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 200,
      render: (_: any, record: any) => record.fullName || '-'
    },
    {
      title: "Ngày sinh",
      dataIndex: "birthday",
      key: "birthday",
      searchField: "birthday",
      filterType: "dateRange",
      sortable: true,
      searchable: true,
      searchPlaceholder: "Ngày sinh",
      render: (text: Date) => formatDate(text),
      width: 150,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      searchField: "email",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 250,
      render: (text: string) => <Typography.Text copyable>{text || '-'}</Typography.Text>
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      searchField: "phone",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 150,
      render: (text: string) => <Typography.Text copyable>{text || '-'}</Typography.Text>
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      searchField: "gender",
      filterType: "select",
      filterOptions: Gender.map(g => ({ value: g.key, label: g.value })),
      sortable: true,
      searchable: true,
      render: (gender: number) => {
        return Gender.find((g) => g.key === gender)?.value || "-";
      },
      width: 150,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      searchField: "status",
      filterType: "select",
      filterOptions: statusOptions.map(s => ({ value: s.value, label: s.label })),
      sortable: true,
      searchable: true,
      render: (status: string | number) => {
        const statusNum = typeof status === 'string' ? parseInt(status, 10) : status;
        const label = statusOptions.find((s) => s.value === statusNum)?.label || "-";
        let color = '#f5222d';
        if (statusNum === 1) color = 'green';
        else if (statusNum === 2) color = 'blue';
        return <Tag color={color}>{label}</Tag>;
      },
      width: 150,
    },
    {
      title: "Vai trò",
      dataIndex: ["role", "name"],
      key: "role.name",
      searchField: "role.name",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 200,
      render: (_: any, record: any) => `${record.role?.name || ''}`.trim()
    },
    {
      title: "Phòng ban",
      dataIndex: ["department", "name"],
      key: "department",
      searchField: "department.name",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Chức vụ",
      dataIndex: ["chevron", "name"],
      key: "chevron",
      searchField: "chevron.name",
      filterType: "text",
      sortable: true,
      searchable: true,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Ngày vào làm",
      dataIndex: "startDate",
      key: "startDate",
      searchField: "startDate",
      filterType: "dateRange",
      sortable: true,
      searchable: true,
      searchPlaceholder: "Ngày vào làm",
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      searchField: "createdAt",
      filterType: "dateRange",
      sortable: true,
      searchable: true,
      searchPlaceholder: "Ngày tạo",
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Thao tác",
      key: "actions",
      filterType: "none",
      sortable: false,
      searchable: false,
      fixed: "right" as "right",
      width: 150,
      render: (_: any, record: any) => (
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
          <Tooltip title="Xem">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => router.push(`/user/view/${record.id}`)}
              hidden={!viewPer}
              style={{
                padding: '4px 6px',
                minWidth: 'auto',
                height: '26px',
                color: '#1677ff'
              }}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => router.push(`/user/edit/${record.id}`)}
              hidden={!updatePer}
              style={{
                padding: '4px 6px',
                minWidth: 'auto',
                height: '26px',
                color: '#52c41a'
              }}
            />
          </Tooltip>
          <Tooltip title="Tạo hợp đồng">
            <Button
              type="text"
              icon={<FormOutlined />}
              size="small"
              onClick={() => router.push(`/user/createContract/${record.id}`)}
              style={{
                padding: '4px 6px',
                minWidth: 'auto',
                height: '26px',
                color: '#722ed1'
              }}
            />
          </Tooltip>
        </ConfigProvider>
      ),
    },
  ];

  // column-specific search handled via getColumnSearchProps and handleColumnSearch

  return (
    <div style={{ padding: screens.lg ? 24 : 16 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                className="btn-top"
                hidden={!deletePer}
                onClick={showDeleteConfirm}
              >
                <DeleteOutlined />
                Xóa
              </Button>
            )}

            <Button
              hidden={!createPer}
              onClick={() => router.push("/user/create")}
              type="primary"
              className="btn-top"
            >
              <PlusCircleOutlined />
              Tạo mới
            </Button>

            <Button
              hidden={!createPer}
              onClick={() => alert("Chức năng upload excel")}
              type="primary"
              className="btn-top"
              style={{
                backgroundColor: '#fc5603',
                border: 'none'
              }}
            >
              <CloudUploadOutlined />
              Tải lên Excel
            </Button>

            <ExcelExportButton
              data={userData}
              columns={excelColumns}
              fileName="Danh_sach_nhan_vien"
              title="DANH SÁCH NHÂN VIÊN"
              description={`Tổng số: ${totalRecords} nhân viên | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
              className="btn-top"
              style={{
                backgroundColor: '#52c41a',
                border: 'none',
                color: 'white'
              }}
            >
              <DownloadOutlined />
              Xuất Excel
            </ExcelExportButton>
            {/* per-column search available on each column header */}
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <ServerSideTable
            columns={columns}
            fetchData={fetchUsers}
            rowKey="id"
            defaultSortField="id"
            defaultSortOrder="desc"
            defaultPageSize={10}
            showSelection={true}
            onSelectionChange={(keys) => setSelectedRowKeys(keys)}
            getCheckboxProps={(record: any) => ({ disabled: record.id === 1 })}
            refreshTrigger={refreshTrigger}
            showTotal={true}
            onDataChange={(data, pagination) => {
              setUserData(data);
              setTotalRecords(pagination.total);
            }}
            scroll={{ x: 'max-content' }}
            rowClassName={(record: any, index: number) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
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
        <p>Bạn có chắc chắn muốn xóa các bản ghi được chọn?</p>
      </Modal>

  {/* Salary editing moved to dedicated page /user/edit-salary/[id] */}

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

export default UserTable;
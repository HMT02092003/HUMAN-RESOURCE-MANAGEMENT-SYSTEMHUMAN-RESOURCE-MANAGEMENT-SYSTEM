import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Tooltip, ConfigProvider, Modal, message, Tag, Row, Col, Grid, Input, Typography, Select, DatePicker } from 'antd';
import {
  PlusCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  FormOutlined,
  SearchOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import dayjs from 'dayjs';
import UserService from '@/service/userService'; // Ensure this path is correct
import { useRouter } from "next/navigation";
import constantConfig from "@/config/constant";

const { statusOptions, Gender } = constantConfig;

// Utility functions
const formatDate = (date: string | Date | null): string => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

// Kiểu dữ liệu cho trạng thái sắp xếp
interface SorterState {
  field: string;
  order: 'ascend' | 'descend' | undefined;
}

// Main component
const UserTable = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  // per-column search map. Values can be string, number, array (for ranges), etc.
  const [columnSearch, setColumnSearch] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // 💡 Sắp xếp mặc định: ID giảm dần (mới nhất lên đầu)
  const [sorter, setSorter] = useState<SorterState>({
    field: 'id',
    order: 'descend'
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const router = useRouter();
  const screens = Grid.useBreakpoint();

  const createPer = true;
  const updatePer = true;
  const deletePer = true;
  const viewPer = true;

  // 🔥 Server-side: Gọi API mỗi khi thay đổi pagination, sort, hoặc filter
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Chuẩn bị params để gửi lên server
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        sortField: sorter.field,
        sortOrder: sorter.order,
      };

      // Thêm các column filters
      Object.keys(columnSearch).forEach(key => {
        const value = columnSearch[key];
        if (value !== undefined && value !== null && value !== '') {
          // Xử lý date range
          if (Array.isArray(value) && value.length === 2) {
            if (key === 'birthday') {
              params.birthdayFrom = value[0];
              params.birthdayTo = value[1];
            } else if (key === 'startDate') {
              params.startDateFrom = value[0];
              params.startDateTo = value[1];
            } else if (key === 'createdAt') {
              params.createdAtFrom = value[0];
              params.createdAtTo = value[1];
            }
          } else {
            // Map column key to API param
            const paramMap: Record<string, string> = {
              'id': 'search', // ID tìm kiếm global
              'username': 'username',
              'fullName': 'fullName',
              'email': 'email',
              'phone': 'phone',
              'gender': 'gender',
              'status': 'status',
              'role.name': 'search', // Role search via global
              'department.name': 'search', // Department search via global
              'chevron.name': 'search', // Chevron search via global
            };
            const paramKey = paramMap[key] || key;
            params[paramKey] = value;
          }
        }
      });

      const response = await UserService.getAllUsersAll(params);
      
      // API trả về { results: [...], total: N, page: N, pageSize: N }
      const users = response.results || response || [];
      const total = response.total || users.length;
      
      setUserData(users);
      setPagination(prev => ({ ...prev, total }));
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi tải người dùng!');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, sorter.field, sorter.order, columnSearch]);

  // 🔥 Gọi API khi các dependencies thay đổi
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await UserService.deleteMultipleUsers(selectedRowKeys as number[]);
      setSelectedRowKeys([]);
      setIsDeleteModalVisible(false);
      // Reload sau khi xóa
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting users:', error);
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi xóa người dùng!');
    } finally {
      setLoading(false);
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

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      // 💡 Thêm sắp xếp mặc định cho cột ID (dùng cho việc load lần đầu và reload)
      sorter: true, // Cho phép sắp xếp trên cột này (client-side)
      ...getColumnSearchProps('id'),
      defaultSortOrder: sorter.field === 'id' ? sorter.order : undefined,
      width: 80,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      sorter: true, // client-side sorting enabled
      ...getColumnSearchProps('username'),
      defaultSortOrder: sorter.field === 'username' ? sorter.order : undefined,
      width: 150,
      render: (text: string) => <Typography.Text copyable>{text || '-'}</Typography.Text>,
    },
    {
      title: "Ảnh",
      dataIndex: "identificationPhoto",
      key: "identificationPhoto",
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
      sorter: true,
      ...getColumnSearchProps('fullName'),
      defaultSortOrder: sorter.field === 'fullName' ? sorter.order : undefined,
      width: 200,
      render: (_: any, record: any) => record.fullName || '-'
    },
    {
      title: "Ngày sinh",
      dataIndex: "birthday",
      key: "birthday",
      sorter: true,
      ...getColumnSearchProps('birthday', { type: 'dateRange', placeholder: 'Ngày sinh' }),
      defaultSortOrder: sorter.field === 'birthday' ? sorter.order : undefined,
      render: (text: Date) => formatDate(text),
      width: 150,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: true,
      ...getColumnSearchProps('email'),
      defaultSortOrder: sorter.field === 'email' ? sorter.order : undefined,
      width: 250,
      render: (text: string) => <Typography.Text copyable>{text || '-'}</Typography.Text>
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      sorter: true,
      ...getColumnSearchProps('phone'),
      defaultSortOrder: sorter.field === 'phone' ? sorter.order : undefined,
      width: 150,
      render: (text: string) => <Typography.Text copyable>{text || '-'}</Typography.Text>
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      sorter: true,
      // Use select filter for gender to make selection easier for users
      ...getColumnSearchProps('gender', { type: 'select', options: Gender.map(g => ({ value: g.key, label: g.value })) }),
      defaultSortOrder: sorter.field === 'gender' ? sorter.order : undefined,
      render: (gender: number) => {
        return Gender.find((g) => g.key === gender)?.value || "-";
      },
      width: 150,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      sorter: true,
      ...getColumnSearchProps('status', { type: 'select', options: statusOptions.map(s => ({ value: s.value, label: s.label })) }),
      defaultSortOrder: sorter.field === 'status' ? sorter.order : undefined,
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
      dataIndex: "role.name",
      key: "role.name",
      sorter: true,
      ...getColumnSearchProps('role.name'),
      defaultSortOrder: sorter.field === 'role.name' ? sorter.order : undefined,
      width: 200,
      render: (_: any, record: any) => `${record.role?.name || ''}`.trim()
    },
    {
      title: "Phòng ban",
      dataIndex: ["department", "name"],
      key: "department",
      sorter: true,
      ...getColumnSearchProps('department.name'),
      defaultSortOrder: sorter.field === 'department' ? sorter.order : undefined,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Chức vụ",
      dataIndex: ["chevron", "name"],
      key: "chevron",
      sorter: true,
      ...getColumnSearchProps('chevron.name'),
      defaultSortOrder: sorter.field === 'chevron' ? sorter.order : undefined,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Ngày vào làm",
      dataIndex: "startDate",
      key: "startDate",
      sorter: true,
      ...getColumnSearchProps('startDate', { type: 'dateRange', placeholder: 'Ngày vào làm' }),
      defaultSortOrder: sorter.field === 'startDate' ? sorter.order : undefined,
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: true,
      ...getColumnSearchProps('createdAt', { type: 'dateRange', placeholder: 'Ngày tạo' }),
      defaultSortOrder: sorter.field === 'createdAt' ? sorter.order : undefined,
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Thao tác",
      key: "actions",
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

            <Button
              onClick={() => alert("Đang xuất file Excel")}
              type="primary"
              className="btn-top"
              style={{
                backgroundColor: '#52c41a',
                border: 'none'
              }}
            >
              <DownloadOutlined />
              Xuất Excel
            </Button>
            {/* per-column search available on each column header */}
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={24}>
          <div style={{ overflowX: 'auto' }}>
            {/* 💡 TRUYỀN `columns` VÀ `onChange` ĐÃ CẬP NHẬT */}
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={userData}
              loading={loading}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showTotal: (total) => `Tổng số: ${total} bản ghi`,
                size: screens.lg ? 'default' : 'small'
              }}
              onChange={handleTableChange}
              rowClassName={(record, index) => (index % 2 === 0 ? 'row-even' : 'row-odd')}
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
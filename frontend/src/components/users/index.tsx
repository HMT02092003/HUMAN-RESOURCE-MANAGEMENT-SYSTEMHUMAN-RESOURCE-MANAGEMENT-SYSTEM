import React, { useState, useEffect } from "react";
import { Table, Button, Tooltip, ConfigProvider, Modal, message, Tag, Row, Col, Grid, Input, Typography } from 'antd';
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
  // Store full dataset locally for client-side search/sort
  const [allUsers, setAllUsers] = useState<any[]>([]);
  // per-column search text map
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // 💡 KHỞI TẠO SẮP XẾP MẶC ĐỊNH: ID giảm dần (mới nhất lên đầu)
  const [sorter, setSorter] = useState<SorterState>({
    field: 'id', // Hoặc 'createdAt' nếu muốn sắp xếp theo ngày tạo
    order: 'descend' // Mới nhất (giảm dần)
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

  // Fetch the full user list once and perform search/sort locally
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      // Use the endpoint that returns all users (no pagination) for client-side operations
      const response = await UserService.getAllUsersAll();
      const users = Array.isArray(response) ? response : [];
      setAllUsers(users);
      // initialize pagination total
      setPagination(prev => ({ ...prev, total: users.length }));
  // compute initial page slice
  setUserData(applySearchSortSlice(users, columnSearch, sorter, pagination));
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi tải người dùng!');
    } finally {
      setLoading(false);
    }
  };

  // Helper: convert record value to searchable string (global or per-field)
  const recordToSearchString = (record: any, field?: string) => {
    if (!field) {
      const parts: string[] = [];
      parts.push(String(record.id || '').toLowerCase());
      parts.push(String(record.username || '').toLowerCase());
      parts.push(String(record.fullName || '').toLowerCase());
      parts.push(String(record.email || '').toLowerCase());
      parts.push(String(record.phone || '').toLowerCase());
      parts.push(String(record.role?.name || '').toLowerCase());
      parts.push(String(record.department?.name || '').toLowerCase());
      parts.push(String(record.chevron?.name || '').toLowerCase());
      parts.push(String(record.status || '').toLowerCase());
      parts.push(String(record.gender || '').toLowerCase());
      parts.push(String(record.startDate || '').toLowerCase());
      parts.push(String(record.createdAt || '').toLowerCase());
      return parts.join(' | ');
    }
    const getVal = (obj: any, f: string) => {
      if (f === 'fullName') return (obj.fullName || '').toLowerCase();
      if (f.includes('.')) return f.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
      return obj[f];
    };
    const v = getVal(record, field);
    return (v === undefined || v === null) ? '' : String(v).toLowerCase();
  };

  // Apply search and sort and then slice for pagination
  // data: full array, columnFilters: { field: text }
  const applySearchSortSlice = (data: any[], columnFilters: Record<string,string>, sorterState: SorterState, pag: any) => {
    let filtered = data;
    const filterKeys = Object.keys(columnFilters || {}).filter(k => columnFilters[k] && columnFilters[k].trim() !== '');
    if (filterKeys.length > 0) {
      filtered = data.filter((r) => {
        return filterKeys.every((k) => {
          const val = recordToSearchString(r, k);
          return val.includes((columnFilters[k] || '').toLowerCase());
        });
      });
    }

    // Sorting
    if (sorterState && sorterState.field) {
      const field = sorterState.field;
      const order = sorterState.order;
      filtered = [...filtered].sort((a: any, b: any) => {
        const getVal = (obj: any, f: string) => {
          // support nested keys like 'role.name' or array path
          if (f.includes('.')) {
            return f.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
          }
          return obj[f];
        };
        let va = getVal(a, field);
        let vb = getVal(b, field);
        if (va === undefined || va === null) va = '';
        if (vb === undefined || vb === null) vb = '';
        // normalize dates
        if (typeof va === 'string' && Date.parse(va)) va = new Date(va).getTime();
        if (typeof vb === 'string' && Date.parse(vb)) vb = new Date(vb).getTime();
        if (va < vb) return order === 'ascend' ? -1 : 1;
        if (va > vb) return order === 'ascend' ? 1 : -1;
        return 0;
      });
    }

    // Pagination slice
    const start = (pag.current - 1) * pag.pageSize;
    const end = start + pag.pageSize;
    return filtered.slice(start, end);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await UserService.deleteMultipleUsers(selectedRowKeys as number[]);
      setSelectedRowKeys([]);
      setIsDeleteModalVisible(false);
      // Reload full dataset after deletion
      await fetchAllUsers();
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

  // 💡 CẬP NHẬT handleTableChange để lưu trạng thái sắp xếp
  const handleTableChange = (
    newPagination: any, 
    filters: any, 
    newSorter: any
  ) => {
    // Client-side pagination and sorting only (do NOT call API)
    setPagination(newPagination);

    // Update sorter state used for client-side sorting
    if (newSorter && newSorter.field) {
      const newState = {
        field: newSorter.field,
        order: newSorter.order as 'ascend' | 'descend' | undefined,
      };
      setSorter(newState);
      // Recompute displayed data
      setUserData(applySearchSortSlice(allUsers, columnSearch, newState, newPagination));
      setPagination(prev => ({ ...prev, total: (allUsers || []).filter((r:any) => {
        if (Object.keys(columnSearch || {}).length === 0) return true;
        return Object.keys(columnSearch || {}).filter(k => columnSearch[k]).every(k => recordToSearchString(r, k).includes(columnSearch[k].toLowerCase()));
      }).length }));
    } else {
      const defaultState: SorterState = { field: 'id', order: 'descend' };
      setSorter(defaultState);
      setUserData(applySearchSortSlice(allUsers, columnSearch, defaultState, newPagination));
      setPagination(prev => ({ ...prev, total: (allUsers || []).filter((r:any) => {
        if (Object.keys(columnSearch || {}).length === 0) return true;
        return Object.keys(columnSearch || {}).filter(k => columnSearch[k]).every(k => recordToSearchString(r, k).includes(columnSearch[k].toLowerCase()));
      }).length }));
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record: any) => ({
      disabled: record.id === 1,
    }),
  };

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
      ...getColumnSearchProps('birthday'),
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
      ...getColumnSearchProps('gender'),
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
      ...getColumnSearchProps('status'),
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
      ...getColumnSearchProps('startDate'),
      defaultSortOrder: sorter.field === 'startDate' ? sorter.order : undefined,
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: true,
      ...getColumnSearchProps('createdAt'),
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

  // Per-column search helpers (function declarations so they are available to column definitions above)
  function handleColumnSearch(value: string, dataIndex: string) {
    const newFilters = { ...(columnSearch || {}), [dataIndex]: value };
    setColumnSearch(newFilters);
    const newPag = { ...pagination, current: 1 };
    setPagination(newPag);
    setUserData(applySearchSortSlice(allUsers, newFilters, sorter, newPag));
    setPagination(prev => ({ ...prev, total: (allUsers || []).filter((r:any) => {
      const keys = Object.keys(newFilters).filter(k => newFilters[k]);
      if (keys.length === 0) return true;
      return keys.every(k => recordToSearchString(r, k).includes(newFilters[k].toLowerCase()));
    }).length }));
  }

  function getColumnSearchProps(dataIndex: string, placeholder?: string) {
    return {
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder={`Tìm ${placeholder || dataIndex}`}
            value={selectedKeys && selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => { handleColumnSearch((selectedKeys && selectedKeys[0]) || '', dataIndex); confirm(); }}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Button
            type="primary"
            size="small"
            onClick={() => { handleColumnSearch((selectedKeys && selectedKeys[0]) || '', dataIndex); confirm(); }}
          >
            Tìm
          </Button>
          <Button
            size="small"
            onClick={() => { clearFilters && clearFilters(); handleColumnSearch('', dataIndex); }}
            style={{ marginLeft: 8 }}
          >
            Xóa
          </Button>
        </div>
      ),
      filterIcon: (filtered: any) => <SearchOutlined style={{ color: columnSearch[dataIndex] ? '#1890ff' : undefined }} />,
      // We override onFilter because filtering done client-side by applySearchSortSlice
      onFilter: (_: any, __: any) => true,
    };
  }

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
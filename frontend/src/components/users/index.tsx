import React, { useState, useEffect } from "react";
import { Table, Button, Tooltip, ConfigProvider, Modal, message, Tag, Row, Col, Grid } from 'antd';
import {
  PlusCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  FormOutlined,
  DownloadOutlined,
  DollarOutlined
} from "@ant-design/icons";
import dayjs from 'dayjs';
import UserService from '@/service/userService'; // Ensure this path is correct
import { useRouter } from "next/navigation";
import constantConfig from "@/config/constant";
// SalaryModal was used previously for inline editing; we now navigate to a dedicated edit page

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
  const [loading, setLoading] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isSalaryModalVisible, setIsSalaryModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  
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

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, sorter.field, sorter.order]); 

  const loadData = async () => {
    setLoading(true);
    try {
      const sortOrderApi = sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : undefined;
      
      const response = await UserService.getAllUsers({
        page: pagination.current - 1,
        pageSize: pagination.pageSize,
        sortField: sorter.field, 
        sortOrder: sortOrderApi
      } as any);

      setUserData(response.results);
      setPagination(prev => ({
        ...prev,
        total: response.total
      }));
    } catch (error: any) {
      const data = error?.response?.data;
      message.destroy();
      message.error(data?.message || data?.error || error.message || 'Có lỗi xảy ra khi tải người dùng!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await UserService.deleteMultipleUsers(selectedRowKeys as number[]);
      setSelectedRowKeys([]);
      setIsDeleteModalVisible(false);
      loadData(); // Reload data to reflect changes
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
    setPagination(newPagination);
    
    // Cập nhật trạng thái sắp xếp
    if (newSorter.field) {
      setSorter({
        field: newSorter.field,
        order: newSorter.order as 'ascend' | 'descend' | undefined,
      });
    } else {
      // Nếu không có sắp xếp, trở về mặc định
      setSorter({ field: 'id', order: 'descend' });
    }
  };

  // Xử lý mở modal lương
  const handleOpenSalaryModal = async (userId: number) => {
    setSelectedUserId(userId);
    setIsSalaryModalVisible(true);
    setSalaryLoading(true);

    try {
      const response = await UserService.getSalaryInfo(userId);
      setSalaryInfo(response.data);
    } catch (error: any) {
      message.error("Không thể lấy thông tin lương");
      console.error(error);
    } finally {
      setSalaryLoading(false);
    }
  };

  // Xử lý đóng modal lương
  const handleCloseSalaryModal = () => {
    setIsSalaryModalVisible(false);
    setSelectedUserId(null);
    setSalaryInfo(null);
  };

  // Xử lý cập nhật lương
  const handleUpdateSalary = async (values: any) => {
    if (!selectedUserId) return;

    setSalaryLoading(true);
    try {
      await UserService.updateSalaryInfo(selectedUserId, values);
      message.success("Cập nhật thông tin lương thành công!");
      handleCloseSalaryModal();
      loadData(); // Refresh table data
    } catch (error: any) {
      const data = error?.response?.data;
      message.error(data?.message || "Có lỗi xảy ra khi cập nhật lương");
    } finally {
      setSalaryLoading(false);
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
      sorter: true, // Cho phép sắp xếp trên cột này (thực hiện ở backend)
      defaultSortOrder: sorter.field === 'id' ? sorter.order : undefined,
      width: 80,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      sorter: true, // Cho phép sắp xếp trên cột này
      defaultSortOrder: sorter.field === 'username' ? sorter.order : undefined,
      width: 150,
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
      defaultSortOrder: sorter.field === 'fullName' ? sorter.order : undefined,
      width: 200,
      render: (_: any, record: any) => `${record.lastName || ''} ${record.firstName || ''}`.trim()
    },
    {
      title: "Ngày sinh",
      dataIndex: "birthday",
      key: "birthday",
      sorter: true,
      defaultSortOrder: sorter.field === 'birthday' ? sorter.order : undefined,
      render: (text: Date) => formatDate(text),
      width: 150,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: true,
      defaultSortOrder: sorter.field === 'email' ? sorter.order : undefined,
      width: 250,
      render: (text: string) => text || '-'
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      sorter: true,
      defaultSortOrder: sorter.field === 'phone' ? sorter.order : undefined,
      width: 150,
      render: (text: string) => text || '-'
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      sorter: true,
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
      defaultSortOrder: sorter.field === 'role.name' ? sorter.order : undefined,
      width: 200,
      render: (_: any, record: any) => `${record.role?.name || ''}`.trim()
    },
    {
      title: "Phòng ban",
      dataIndex: ["department", "name"],
      key: "department",
      sorter: true,
      defaultSortOrder: sorter.field === 'department' ? sorter.order : undefined,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Chức vụ",
      dataIndex: ["chevron", "name"],
      key: "chevron",
      sorter: true,
      defaultSortOrder: sorter.field === 'chevron' ? sorter.order : undefined,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Ngày vào làm",
      dataIndex: "startDate",
      key: "startDate",
      sorter: true,
      defaultSortOrder: sorter.field === 'startDate' ? sorter.order : undefined,
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: true,
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
          <Tooltip title="Chỉnh lương">
            <Button
              type="text"
              icon={<DollarOutlined />}
              size="small"
              onClick={() => router.push(`/user/edit-salary/${record.id}`)}
              hidden={!updatePer}
              style={{
                padding: '4px 6px',
                minWidth: 'auto',
                height: '26px',
                color: '#fa8c16'
              }}
            />
          </Tooltip>
        </ConfigProvider>
      ),
    },
  ];

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
import React, { useState, useEffect } from "react";
import { Table, Button, Space, Tooltip, ConfigProvider, Modal, message, Tag, Row, Col, Grid } from 'antd';
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
import SalaryModal from './SalaryModal';

const { statusOptions, Gender } = constantConfig;

// Utility functions
const formatDate = (date: string | Date | null): string => {
  if (!date) return '';
  return dayjs(date).format('DD/MM/YYYY');
};

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
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const router = useRouter();
  const screens = Grid.useBreakpoint();

  console.log("userData", userData);

  // Simulate permissions (replace with actual permission logic if available)
  const createPer = true;
  const updatePer = true;
  const deletePer = true;
  const viewPer = true;

  // useEffect to load data when pagination changes
  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize]); // Dependencies ensure re-fetch on page/size change

  const loadData = async () => {
    setLoading(true);
    try {
      // API call to fetch users for the current page and page size
      const response = await UserService.getAllUsers({
        page: pagination.current - 1, // Ant Design's `current` is 1-indexed, backend likely 0-indexed
        pageSize: pagination.pageSize
      });

      // Assuming UserService.getAllUsers returns an Axios response,
      // where the actual data is under `response.data`.
      // Based on your provided backend structure: { results: [...], total: N }
      setUserData(response.results);
      setPagination(prev => ({
        ...prev,
        total: response.total // Update total from the API response
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
      setSelectedRowKeys([]); // Clear selection after deletion
      setIsDeleteModalVisible(false); // Close the modal
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

  // Placeholder for redirection logic
  const redirect = (route: string, params?: { id: number }) => {
    console.log(`Redirecting to: ${route}${params ? ' with ID: ' + params.id : ''}`);
    // In a real application, you would use a router here, e.g., Next.js's useRouter or React Router's useNavigate
    alert(`Đang chuyển hướng đến: ${route} ${params ? 'với ID: ' + params.id : ''}`);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // This handler is crucial for Ant Design's pagination to work
  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    // The useEffect hook will automatically call loadData with the new pagination state
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
      disabled: record.id === 1, // Example: disable checkbox for user with ID 1
    }),
  };

  const columns = [
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      sorter: (a: any, b: any) => a.username?.localeCompare(b.username || '') || 0,
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
      sorter: (a: any, b: any) => `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(`${b.lastName || ''} ${b.firstName || ''}`),
      width: 200,
      render: (_: any, record: any) => `${record.lastName || ''} ${record.firstName || ''}`.trim()
    },
    {
      title: "Ngày sinh",
      dataIndex: "birthday",
      key: "birthday",
      sorter: (a: any, b: any) => (dayjs(a.birthday).isValid() ? dayjs(a.birthday).unix() : 0) - (dayjs(b.birthday).isValid() ? dayjs(b.birthday).unix() : 0),
      render: (text: Date) => formatDate(text),
      width: 150,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: (a: any, b: any) => a.email?.localeCompare(b.email || '') || 0,
      width: 250,
      render: (text: string) => text || '-'
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      sorter: (a: any, b: any) => a.phone?.localeCompare(b.phone || '') || 0,
      width: 150,
      render: (text: string) => text || '-'
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      sorter: (a: any, b: any) => (a.gender || 0) - (b.gender || 0),
      render: (gender: number) => {
        return Gender.find((g) => g.key === gender)?.value || "-";
      },
      width: 150,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      sorter: (a: any, b: any) => (parseInt(a.status) || 0) - (parseInt(b.status) || 0),
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
      title: "Phòng ban",
      dataIndex: ["department", "name"],
      key: "department",
      sorter: (a: any, b: any) => a.department?.name?.localeCompare(b.department?.name || '') || 0,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Chức vụ",
      dataIndex: ["chevron", "name"],
      key: "chevron",
      sorter: (a: any, b: any) => a.chevron?.name?.localeCompare(b.chevron?.name || '') || 0,
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: "Ngày vào làm",
      dataIndex: "startDate",
      key: "startDate",
      sorter: (a: any, b: any) => (dayjs(a.startDate).isValid() ? dayjs(a.startDate).unix() : 0) - (dayjs(b.startDate).isValid() ? dayjs(b.startDate).unix() : 0),
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: any, b: any) => (dayjs(a.createdAt).isValid() ? dayjs(a.createdAt).unix() : 0) - (dayjs(b.createdAt).isValid() ? dayjs(b.createdAt).unix() : 0),
      render: (text: Date) => formatDate(text),
      width: 180,
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right" as "right",
      width: 100,
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
          <Space size={4}>
            <Tooltip title="Xem">
              <Button
                type="default"
                shape="circle"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => router.push(`/user/view/${record.id}`)}
                hidden={!viewPer}
              />
            </Tooltip>
            <Tooltip title="Sửa">
              <Button
                type="default"
                shape="circle"
                icon={<EditOutlined />}
                size="small"
                onClick={() => router.push(`/user/edit/${record.id}`)}
                hidden={!updatePer}
              />
            </Tooltip>
            <Tooltip title="Tạo hợp đồng">
              <Button
                type="default"
                shape="circle"
                icon={<FormOutlined />}
                size="small"
                onClick={() => router.push(`/user/createContract/${record.id}`)}
              />
            </Tooltip>
            <Tooltip title="Thông tin lương">
              <Button
                type="default"
                shape="circle"
                icon={<DollarOutlined />}
                size="small"
                onClick={() => handleOpenSalaryModal(record.id)}
                hidden={!updatePer}
              />
            </Tooltip>
          </Space>
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

      <SalaryModal
        visible={isSalaryModalVisible}
        onCancel={handleCloseSalaryModal}
        onOk={handleUpdateSalary}
        loading={salaryLoading}
        salaryInfo={salaryInfo}
      />

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
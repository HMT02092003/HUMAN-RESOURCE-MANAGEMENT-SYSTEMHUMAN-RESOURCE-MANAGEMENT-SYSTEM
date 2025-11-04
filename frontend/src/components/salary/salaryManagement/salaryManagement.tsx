"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DatePicker, Button, Table, message, Space, Input, Tag } from 'antd';
import type { InputRef } from 'antd';
import type { ColumnType } from 'antd/es/table';
import type { FilterConfirmProps } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import salaryService from '@/service/salaryService';
import { CalculatorOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import constant from '@/config/constant';
import InvalidUsersModal from '../InvalidUsersModal';

const {TypeOfStatusSalary} = constant;

const { MonthPicker } = DatePicker;

// Định nghĩa kiểu dữ liệu cho một hàng (tùy chọn nhưng nên có)
interface PayslipDataType {
  id: string;
  user_id: string;
  year: number;
  month: number;
  base_salary: string;
  allowances: string;
  overtime_pay: string;
  gross_salary: string;
  social_insurance: string;
  health_insurance: string;
  personal_income_tax: string;
  total_deductions: string;
  penalty_total: string;
  net_salary: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const SalaryManagement: React.FC = () => {
  const [month, setMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PayslipDataType[]>([]);

  // State cho modal hiển thị người dùng không hợp lệ
  const [invalidUsersModalOpen, setInvalidUsersModalOpen] = useState(false);
  const [invalidUsersData, setInvalidUsersData] = useState<{
    usersWithoutContracts: any[];
    usersWithoutApprovedAttendance: any[];
    usersWithoutSalaryProfile: any[];
  }>({
    usersWithoutContracts: [],
    usersWithoutApprovedAttendance: [],
    usersWithoutSalaryProfile: []
  });

  // State cho việc tìm kiếm
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

  useEffect(() => {
    fetchPayslipsForMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPayslipsForMonth = async (m: any) => {
    setLoading(true);
    try {
      const str = m.format('YYYY-MM');
      const res = await salaryService.listPayslips(str);
      if (res.success) setData(res.data || []);
      else setData([]);
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Lỗi khi tải danh sách bảng lương');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const str = month.format('YYYY-MM');
      const res = await salaryService.calculateFromAttendance(str);
      if (res.success) {
        message.success('Đã tính bảng lương cho tháng');
        fetchPayslipsForMonth(month);
        // Reset invalid users data nếu thành công
        setInvalidUsersData({
          usersWithoutContracts: [],
          usersWithoutApprovedAttendance: [],
          usersWithoutSalaryProfile: []
        });
      } else {
        // Kiểm tra xem có người dùng không hợp lệ không
        const hasInvalidUsers = 
          (res.usersWithoutContracts && res.usersWithoutContracts.length > 0) ||
          (res.usersWithoutApprovedAttendance && res.usersWithoutApprovedAttendance.length > 0) ||
          (res.usersWithoutSalaryProfile && res.usersWithoutSalaryProfile.length > 0);
        
        if (hasInvalidUsers) {
          // Lưu dữ liệu người dùng không hợp lệ
          setInvalidUsersData({
            usersWithoutContracts: res.usersWithoutContracts || [],
            usersWithoutApprovedAttendance: res.usersWithoutApprovedAttendance || [],
            usersWithoutSalaryProfile: res.usersWithoutSalaryProfile || []
          });
        }
        
        message.error(res.message || 'Không thể tính bảng lương');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Lỗi khi tính bảng lương');
    } finally {
      setLoading(false);
    }
  };

  // --- Chức năng tìm kiếm ---
  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: keyof PayslipDataType,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  const getColumnSearchProps = (dataIndex: keyof PayslipDataType, title: string): ColumnType<PayslipDataType> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Tìm ${title}`}
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
            Tìm
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
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes((value as string).toLowerCase())
        : false,
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });
  // --- Hết chức năng tìm kiếm ---

  // --- Hàm hỗ trợ format ---
  /**
   * Formats a number string (e.g., "15000000.00") into a Vietnamese currency format (e.g., "15,000,000")
   */
  const formatCurrency = (text: string | number | undefined | null) => {
    if (text === null || text === undefined) return '0';
    const number = parseFloat(text.toString());
    if (isNaN(number)) return '0';
    // .toFixed(0) để loại bỏ phần thập phân ".00"
    return new Intl.NumberFormat('vi-VN').format(Number(number.toFixed(0)));
  };

  /**
   * Formats an ISO date string into a more readable format
   */
  const formatDate = (text: string | undefined | null) => {
    if (!text) return '';
    return dayjs(text).format('DD/MM/YYYY HH:mm:ss');
  };
  // --- Hết hàm hỗ trợ format ---

  // --- Định nghĩa cột ---
  const columns: ColumnType<PayslipDataType>[] = [
    {
      title: 'Tên nhân viên',
      dataIndex: 'user',
      key: 'user',
      render: (text, record:any) => record.fullName || record.username || 'N/A',
    },
    {
      title: 'Phòng ban',
      dataIndex: ["department", "name"],
      key: 'department',
      render: (_: any, record: any) => record.department?.name || 'N/A',
      // Nếu muốn thêm chức năng tìm kiếm, cần custom lại filter cho trường này
    },
    {
      title: 'Năm',
      dataIndex: 'year',
      key: 'year',
      sorter: (a, b) => a.year - b.year,
      ...getColumnSearchProps('year', 'Năm'),
    },
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      sorter: (a, b) => a.month - b.month,
      ...getColumnSearchProps('month', 'Tháng'),
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'base_salary',
      key: 'base_salary',
      sorter: (a, b) => parseFloat(a.base_salary) - parseFloat(b.base_salary),
      ...getColumnSearchProps('base_salary', 'Lương cơ bản'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Phụ cấp',
      dataIndex: 'allowances',
      key: 'allowances',
      sorter: (a, b) => parseFloat(a.allowances) - parseFloat(b.allowances),
      ...getColumnSearchProps('allowances', 'Phụ cấp'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Lương tăng ca',
      dataIndex: 'overtime_pay',
      key: 'overtime_pay',
      sorter: (a, b) => parseFloat(a.overtime_pay) - parseFloat(b.overtime_pay),
      ...getColumnSearchProps('overtime_pay', 'Lương tăng ca'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Tổng lương (Chưa khấu trừ)',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      sorter: (a, b) => parseFloat(a.gross_salary) - parseFloat(b.gross_salary),
      ...getColumnSearchProps('gross_salary', 'Tổng lương (Chưa khấu trừ)'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'BHXH',
      dataIndex: 'social_insurance',
      key: 'social_insurance',
      sorter: (a, b) => parseFloat(a.social_insurance) - parseFloat(b.social_insurance),
      ...getColumnSearchProps('social_insurance', 'BHXH'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'BHYT',
      dataIndex: 'health_insurance',
      key: 'health_insurance',
      sorter: (a, b) => parseFloat(a.health_insurance) - parseFloat(b.health_insurance),
      ...getColumnSearchProps('health_insurance', 'BHYT'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Thuế TNCN',
      dataIndex: 'personal_income_tax',
      key: 'personal_income_tax',
      sorter: (a, b) => parseFloat(a.personal_income_tax) - parseFloat(b.personal_income_tax),
      ...getColumnSearchProps('personal_income_tax', 'Thuế TNCN'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Tổng khấu trừ',
      dataIndex: 'total_deductions',
      key: 'total_deductions',
      sorter: (a, b) => parseFloat(a.total_deductions) - parseFloat(b.total_deductions),
      ...getColumnSearchProps('total_deductions', 'Tổng khấu trừ'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Tổng tiền phạt',
      dataIndex: 'penalty_total',
      key: 'penalty_total',
      sorter: (a, b) => parseFloat(a.penalty_total) - parseFloat(b.penalty_total),
      ...getColumnSearchProps('penalty_total', 'Tổng tiền phạt'),
      render: (text) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Lương thực nhận',
      dataIndex: 'net_salary',
      key: 'net_salary',
      sorter: (a, b) => parseFloat(a.net_salary) - parseFloat(b.net_salary),
      ...getColumnSearchProps('net_salary', 'Lương thực nhận'),
      render: (text) => <b style={{ color: 'green' }}>{formatCurrency(text) + ' VNĐ'}</b>, // In đậm lương Net
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      sorter: (a, b) => a.notes.localeCompare(b.notes),
      ...getColumnSearchProps('notes', 'Ghi chú'),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      ...getColumnSearchProps('created_at', 'Ngày tạo'),
      render: (text) => formatDate(text),
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: (a, b) => dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(),
      ...getColumnSearchProps('updated_at', 'Ngày cập nhật'),
      render: (text) => formatDate(text),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      ...getColumnSearchProps('status', 'Trạng thái'),
      fixed: 'right', // Yêu cầu: Cố định cột này bên phải
      render: (status: string | number) => {
        const key = typeof status === 'number' ? status : Number(status);
        const label = TypeOfStatusSalary[key as keyof typeof TypeOfStatusSalary] || 'Không xác định';
        return (
          <Tag color={key === 1 ? "red" : 'green'}>
            {label}
          </Tag>
        );
      },
    },
  ];

  // Kiểm tra xem có người dùng không hợp lệ không
  const hasInvalidUsers = 
    invalidUsersData.usersWithoutContracts.length > 0 ||
    invalidUsersData.usersWithoutApprovedAttendance.length > 0 ||
    invalidUsersData.usersWithoutSalaryProfile.length > 0;

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <MonthPicker value={month} onChange={(d) => d && setMonth(d)} format="MM/YYYY" />
        <Button onClick={handleCalculate} type="primary" disabled={loading}>
          <CalculatorOutlined />Tính dữ liệu chấm công
        </Button>
        {hasInvalidUsers && (
          <Button 
            onClick={() => setInvalidUsersModalOpen(true)} 
            type="default"
            danger
            icon={<WarningOutlined />}
          >
            Xem người dùng không hợp lệ
          </Button>
        )}
      </Space>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(r) => r.id || `${r.user_id}-${r.year}-${r.month}`}
        scroll={{ x: 'max-content' }} // Yêu cầu: Thêm thanh cuộn ngang
      />

      {/* Modal hiển thị người dùng không hợp lệ */}
      <InvalidUsersModal
        open={invalidUsersModalOpen}
        onClose={() => setInvalidUsersModalOpen(false)}
        usersWithoutContracts={invalidUsersData.usersWithoutContracts}
        usersWithoutApprovedAttendance={invalidUsersData.usersWithoutApprovedAttendance}
        usersWithoutSalaryProfile={invalidUsersData.usersWithoutSalaryProfile}
      />
    </div>
  );
};

export default SalaryManagement;
"use client";

import React, { useState, useCallback } from 'react';
import { DatePicker, Button, message, Space, Tag, notification, Badge, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import salaryService from '@/service/salaryService';
import { CalculatorOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
import { ExcelExportButton, ExcelColumn } from '@/components/common/ExcelExport';
import constant from '@/config/constant';
import InvalidUsersModal from '../InvalidUsersModal';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import CheckPermission from '@/components/common/CheckPermission';

const { TypeOfStatusSalary } = constant;

const SalaryManagement: React.FC = () => {
  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [month, setMonth] = useState(dayjs());
  const [calculating, setCalculating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

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

  // Fetch data function for ServerSideTable - always fetch all months
  const fetchData = useCallback(async (params: any) => {
    console.log('[salaryManagement] Fetching payslips with params:', params);
    // Remove `allMonths` from payload so backend decides default behavior (backend defaults to all months)
    const normalized = { ...params };
    if (normalized.allMonths !== undefined) delete normalized.allMonths;
    const result = await salaryService.listPayslipsPaginated(normalized);
    console.log('[salaryManagement] Payslips result:', {
      success: result.success,
      dataCount: result.data?.length || 0,
      total: result.total,
      message: result.message
    });
    return result;
  }, []);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      // Dùng API async - trả về ngay, xử lý background
      const res = await salaryService.calculateBulkAsync({
        year: selectedYear,
        month: selectedMonth,
        userIds: [] // Empty = tính cho tất cả users có attendance approved
      });

      if (res.success) {
        message.success({
          content: `🚀 Đang tính lương cho tháng ${selectedMonth}/${selectedYear} ở background. Bạn sẽ nhận thông báo khi hoàn tất!`,
          duration: 5
        });
        setRefreshTrigger(prev => prev + 1);  // Trigger table refresh
      } else {
        message.error(res.message || 'Không thể bắt đầu tính lương');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Lỗi khi tính bảng lương');
    } finally {
      setCalculating(false);
    }
  };

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

  // --- Định nghĩa cột cho ServerSideTable ---
  const columns: ServerSideColumnType<any>[] = [
    {
      title: 'Tên nhân viên',
      dataIndex: 'fullName',
      key: 'fullName',
      searchField: 'fullName',
      sortable: true,
      filterType: 'text',
      width: 180,
      render: (_: any, record: any) => record.fullName || record.username || 'N/A',
    },
    {
      title: 'Phòng ban',
      dataIndex: ['department', 'name'],
      key: 'departmentName',
      searchField: 'departmentName',
      sortable: true,
      filterType: 'text',
      width: 150,
      render: (_: any, record: any) => record.departmentName || record.department?.name || 'N/A',
    },
    {
      title: 'Kỳ',
      dataIndex: 'month',
      key: 'period',
      // Use a date range picker for period (month range). Server expects monthFrom/monthTo.
      searchField: 'month',
      sortable: true,
      filterType: 'month',
      width: 180,
      render: (val: any, record: any) => {
        // show as MM/YYYY or month number and year
        const y = record.year;
        const m = record.month;
        if (y && m) return `${m}/${y}`;
        if (typeof val === 'string') return val;
        return '-';
      }
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'base_salary',
      key: 'base_salary',
      searchField: 'base_salary',
      sortable: true,
      filterType: 'number',
      width: 140,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Phụ cấp',
      dataIndex: 'allowances',
      key: 'allowances',
      searchField: 'allowances',
      sortable: true,
      filterType: 'number',
      width: 120,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Lương tăng ca',
      dataIndex: 'overtime_pay',
      key: 'overtime_pay',
      searchField: 'overtime_pay',
      sortable: true,
      filterType: 'number',
      width: 140,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Tổng lương',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      searchField: 'gross_salary',
      sortable: true,
      filterType: 'number',
      width: 140,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'BHXH',
      dataIndex: 'social_insurance',
      key: 'social_insurance',
      searchField: 'social_insurance',
      sortable: true,
      filterType: 'number',
      width: 120,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'BHYT',
      dataIndex: 'health_insurance',
      key: 'health_insurance',
      searchField: 'health_insurance',
      sortable: true,
      filterType: 'number',
      width: 120,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Thuế TNCN',
      dataIndex: 'personal_income_tax',
      key: 'personal_income_tax',
      searchField: 'personal_income_tax',
      sortable: true,
      filterType: 'number',
      width: 130,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Tổng khấu trừ',
      dataIndex: 'total_deductions',
      key: 'total_deductions',
      searchField: 'total_deductions',
      sortable: true,
      filterType: 'number',
      width: 140,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Tổng tiền phạt',
      dataIndex: 'penalty_total',
      key: 'penalty_total',
      searchField: 'penalty_total',
      sortable: true,
      filterType: 'number',
      width: 130,
      render: (text: any) => formatCurrency(text) + ' VNĐ',
    },
    {
      title: 'Lương thực nhận',
      dataIndex: 'net_salary',
      key: 'net_salary',
      searchField: 'net_salary',
      sortable: true,
      filterType: 'number',
      width: 150,
      render: (text: any) => <b style={{ color: 'green' }}>{formatCurrency(text) + ' VNĐ'}</b>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      searchField: 'notes',
      sortable: true,
      filterType: 'text',
      width: 200,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      searchField: 'created_at',
      sortable: true,
      filterType: 'date',
      width: 160,
      render: (text: any) => formatDate(text),
    },
    // {
    //   title: 'Trạng thái',
    //   dataIndex: 'status',
    //   key: 'status',
    //   searchField: 'status',
    //   sortable: true,
    //   filterType: 'select',
    //   filterOptions: [
    //     { value: '1', label: 'Nháp' },
    //     { value: '2', label: 'Hoàn thành' }
    //   ],
    //   fixed: 'right',
    //   width: 130,
    //   render: (status: any) => {
    //     const key = typeof status === 'number' ? status : Number(status);
    //     const label = TypeOfStatusSalary[key as keyof typeof TypeOfStatusSalary] || 'Không xác định';
    //     return (
    //       <Tag color={key === 1 ? "red" : 'green'}>
    //         {label}
    //       </Tag>
    //     );
    //   },
    // },
  ];

  // Kiểm tra xem có người dùng không hợp lệ không
  const hasInvalidUsers =
    invalidUsersData.usersWithoutContracts.length > 0 ||
    invalidUsersData.usersWithoutApprovedAttendance.length > 0 ||
    invalidUsersData.usersWithoutSalaryProfile.length > 0;

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <span>Chọn năm:</span>
        <InputNumber
          min={2000}
          max={2100}
          value={selectedYear}
          onChange={(val) => setSelectedYear(val || currentYear)}
          style={{ width: 120 }}
        />
        <span>Chọn tháng:</span>
        <Select
          value={selectedMonth}
          onChange={setSelectedMonth}
          style={{ width: 100 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <Select.Option key={m} value={m}>Tháng {m}</Select.Option>
          ))}
        </Select>
        <CheckPermission permissionKey="salaries" requiredType="create">
          <Button onClick={handleCalculate} type="primary" loading={calculating}>
            <CalculatorOutlined /> Tính lương {selectedMonth}/{selectedYear}
          </Button>
        </CheckPermission>

        {tableData && tableData.length > 0 && (
          <ExcelExportButton
            data={tableData}
            columns={columns.map(col => ({
              title: col.title as string,
              dataIndex: col.dataIndex as string | string[],
              width: 20,
              render: col.render
            }))}
            fileName={`Bang_luong_${selectedMonth}_${selectedYear}`}
            title={`BẢNG LƯƠNG THÁNG ${selectedMonth}/${selectedYear}`}
            description={`Tổng số: ${totalRecords} nhân viên | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
            type="default"
            style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
          >
            <DownloadOutlined /> Xuất Excel
          </ExcelExportButton>
        )}
      </Space>

      <ServerSideTable
        columns={columns}
        fetchData={fetchData}
        rowKey="id"
        defaultSortField="created_at"
        defaultSortOrder="desc"
        defaultPageSize={25}
        refreshTrigger={refreshTrigger}
        onDataChange={useCallback((data: any[], pagination: any) => {
          setTableData(data);
          setTotalRecords(pagination.total);
        }, [])}
        scroll={{ x: 'max-content' }}
        bordered
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
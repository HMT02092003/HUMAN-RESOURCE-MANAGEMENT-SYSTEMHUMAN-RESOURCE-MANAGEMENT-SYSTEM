"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DatePicker, Button, Table, message, Space, Input } from 'antd';
import type { InputRef } from 'antd';
import type { ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import salaryService from '@/service/salaryService';
import { SearchOutlined } from '@ant-design/icons';

const { MonthPicker } = DatePicker;

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
  notes: string;
  created_at: string;
  updated_at: string;
  user?: any;
  username?: string | null;
  fullName?: string | null;
  department?: { id: number; name?: string } | null;
}

const AllPayslips: React.FC = () => {
  const [month, setMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PayslipDataType[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const searchInput = useRef<InputRef>(null);

  useEffect(() => { fetchPayslips(); }, [page, pageSize]);

  const fetchPayslips = async (m?: any) => {
    setLoading(true);
    try {
      // By default fetch all payslips for the authenticated user (no month filter).
      // Only pass the month filter when an explicit month is provided (user selected).
      const params: any = {};
      if (m) params.month = (m || month).format('YYYY-MM');
      const res = Object.keys(params).length ? await salaryService.getMyPayslips(params) : await salaryService.getMyPayslips();
      if (res.success) {
  const all = res.data || [];
        setTotal(all.length || 0);
        // client-side pagination for the current user's rows
        const start = page * pageSize;
        const pageRows = all.slice(start, start + pageSize);
        setData(pageRows);
      } else {
        setData([]);
        message.error(res.message || 'Lỗi khi tải danh sách bảng lương');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Lỗi khi tải danh sách bảng lương');
    } finally { setLoading(false); }
  };

  const handleMonthChange = (d: any) => { if (!d) { setMonth(dayjs()); setPage(0); fetchPayslips(); return; } setMonth(d); setPage(0); fetchPayslips(d); };

  const handleTableChange = (pagination: any) => {
    const newPage = (pagination.current || 1) - 1;
    const newPageSize = pagination.pageSize || pageSize;
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const formatCurrency = (text: string | number | undefined | null) => {
    if (text === null || text === undefined) return '0';
    const number = parseFloat(text.toString());
    if (isNaN(number)) return '0';
    return new Intl.NumberFormat('vi-VN').format(Number(number.toFixed(0)));
  };

  const formatDate = (text: string | undefined | null) => { if (!text) return ''; return dayjs(text).format('DD/MM/YYYY HH:mm:ss'); };

  const columns: ColumnType<PayslipDataType>[] = [
    { title: 'Tên nhân viên', dataIndex: 'user', key: 'user', render: (_v, r:any) => r.fullName || r.username || 'N/A' },
    { title: 'Phòng ban', dataIndex: ['department','name'], key: 'department', render: (_,_r:any) => {
        // department may be present in several shapes depending on backend: prefer record.department.name, then record.user.department.name, then departmentName
        return _r?.department?.name ?? _r?.user?.department?.name ?? _r?.departmentName ?? 'N/A';
      } },
    { title: 'Năm', dataIndex: 'year', key: 'year' },
    { title: 'Tháng', dataIndex: 'month', key: 'month' },
    { title: 'Lương cơ bản', dataIndex: 'base_salary', key: 'base_salary', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Phụ cấp', dataIndex: 'allowances', key: 'allowances', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Lương tăng ca', dataIndex: 'overtime_pay', key: 'overtime_pay', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Tổng lương (Chưa khấu trừ)', dataIndex: 'gross_salary', key: 'gross_salary', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'BHXH', dataIndex: 'social_insurance', key: 'social_insurance', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'BHYT', dataIndex: 'health_insurance', key: 'health_insurance', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Thuế TNCN', dataIndex: 'personal_income_tax', key: 'personal_income_tax', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Tổng khấu trừ', dataIndex: 'total_deductions', key: 'total_deductions', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Tổng tiền phạt', dataIndex: 'penalty_total', key: 'penalty_total', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Lương thực nhận', dataIndex: 'net_salary', key: 'net_salary', render: (t)=> <b style={{ color: 'green' }}>{formatCurrency(t) + ' VNĐ'}</b> },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes' },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', render: (t)=> formatDate(t) },
    { title: 'Ngày cập nhật', dataIndex: 'updated_at', key: 'updated_at', render: (t)=> formatDate(t) },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(r:any) => r.id || `${r.user_id}-${r.year}-${r.month}`}
        pagination={{ current: page + 1, pageSize, total, showSizeChanger: true }}
        onChange={(pagination) => handleTableChange(pagination)}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default AllPayslips;

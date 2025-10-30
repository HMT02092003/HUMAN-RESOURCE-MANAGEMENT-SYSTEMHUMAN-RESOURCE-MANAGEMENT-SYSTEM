"use client";

import React, { useState, useEffect } from 'react';
import { DatePicker, Button, Table, message, Space } from 'antd';
import dayjs from 'dayjs';
import salaryService from '@/service/salaryService';
import { CalculatorOutlined } from '@ant-design/icons';

const { MonthPicker } = DatePicker;

const SalaryManagement: React.FC = () => {
  const [month, setMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

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
      } else {
        message.error(res.message || 'Không thể tính bảng lương');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Lỗi khi tính bảng lương');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'User ID', dataIndex: 'user_id', key: 'user_id' },
    { title: 'Year', dataIndex: 'year', key: 'year' },
    { title: 'Month', dataIndex: 'month', key: 'month' },
    { title: 'Base Salary', dataIndex: 'base_salary', key: 'base_salary' },
    { title: 'Allowances', dataIndex: 'allowances', key: 'allowances' },
    { title: 'Overtime Pay', dataIndex: 'overtime_pay', key: 'overtime_pay' },
    { title: 'Gross Salary', dataIndex: 'gross_salary', key: 'gross_salary' },
    { title: 'Total Deductions', dataIndex: 'total_deductions', key: 'total_deductions' },
    { title: 'Net Salary', dataIndex: 'net_salary', key: 'net_salary' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <MonthPicker value={month} onChange={(d) => d && setMonth(d)} format="MM/YYYY" />
        <Button onClick={handleCalculate} type="primary" disabled={loading}><CalculatorOutlined />Tính dữ liệu chấm công</Button>
      </Space>
      <Table columns={columns} dataSource={data} loading={loading} rowKey={(r) => r.id || `${r.user_id}-${r.year}-${r.month}`} />
    </div>
  );
};

export default SalaryManagement;

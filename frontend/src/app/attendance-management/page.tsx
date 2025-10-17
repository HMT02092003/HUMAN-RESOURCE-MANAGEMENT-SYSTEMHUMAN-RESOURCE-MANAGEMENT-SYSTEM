import React, { useEffect, useState } from 'react';
import { Table, Button, message } from 'antd';

// Minimal manager approval page - calls attendance-service endpoints
export default function AttendanceManagementPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/monthly-summaries');
      const json = await res.json();
      if (json.success) setData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (record: any) => {
    try {
      const res = await fetch(`/api/attendance/monthly-summaries/${record.id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        message.success('Đã chốt & duyệt thành công');
        fetchSummaries();
      } else {
        message.error(json.message || 'Lỗi khi chốt bảng công');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi gọi API');
    }
  };

  const columns = [
    { title: 'User ID', dataIndex: 'user_id', key: 'user_id' },
    { title: 'Month', dataIndex: 'month', key: 'month', render: (_: any, r: any) => `${r.year}-${String(r.month).padStart(2,'0')}` },
    { title: 'Work Days', dataIndex: 'totalWorkDays', key: 'totalWorkDays' },
    { title: 'Work Hours', dataIndex: 'totalWorkHours', key: 'totalWorkHours' },
    { title: 'Overtime Hours', dataIndex: 'totalOvertimeHours', key: 'totalOvertimeHours' },
    { title: 'Penalty', dataIndex: 'totalPenalty', key: 'totalPenalty' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Actions', key: 'actions', render: (_: any, record: any) => {
        return (
          <Button type="primary" onClick={() => handleApprove(record)} disabled={record.status !== 'IN_PROGRESS'}>
            Chốt & Duyệt
          </Button>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>Quản lý & Duyệt Bảng Chấm Công</h2>
      <Table rowKey="id" dataSource={data} columns={columns as any} loading={loading} />
    </div>
  );
}

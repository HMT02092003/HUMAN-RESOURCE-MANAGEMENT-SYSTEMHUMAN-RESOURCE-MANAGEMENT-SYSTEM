"use client";

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Tag, message, Space } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import SalaryService from '@/service/salaryService';
import SalaryForm from './Users/SalaryForm';
import dayjs from 'dayjs';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';

interface Props { userId: number | string }

const SalaryDealsList: React.FC<Props> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [allowanceTypes, setAllowanceTypes] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await SalaryService.listEmployeeSalaryProfiles(userId);
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách thông tin lương');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const res = await SalaryService.listAllowanceTypes({ page: 1, pageSize: 1000 } as any);
        const list = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
        setAllowanceTypes(list);
      } catch (err) {
        console.error('Could not load allowance types', err);
      }
    };
    loadTypes();
  }, []);

  const getStatus = (eff: string, allProfiles: any[]) => {
    if (!eff) return 'unknown';
    const today = dayjs().startOf('day');
    const effDate = dayjs(eff).startOf('day');
    
    // Future: effective_from is after today
    if (effDate.isAfter(today)) return 'future';
    
    // Find the current profile: effective_from <= today, sorted desc by effective_from
    const eligibleProfiles = allProfiles
      .filter(p => {
        if (!p.effective_from) return false;
        const pDate = dayjs(p.effective_from).startOf('day');
        return pDate.isBefore(today) || pDate.isSame(today);
      })
      .sort((a, b) => {
        const dateA = dayjs(a.effective_from);
        const dateB = dayjs(b.effective_from);
        if (!dateB.isSame(dateA)) return dateB.diff(dateA);
        // If same date, sort by created_at or id desc
        return (b.created_at || b.id) - (a.created_at || a.id);
      });
    
    // The first one in sorted list is current
    if (eligibleProfiles.length > 0 && eligibleProfiles[0].id === allProfiles.find(p => p.effective_from === eff)?.id) {
      return 'current';
    }
    
    // Otherwise it's past
    return 'past';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'current': return 'Hiện tại';
      case 'future': return 'Tương lai';
      case 'past': return 'Đã qua';
      default: return 'Không rõ';
    }
  };

  // Excel column configuration
  const excelColumns: ExcelColumn[] = [
    {
      title: 'Hiệu lực từ',
      dataIndex: 'effective_from',
      width: 15,
      render: (value: any) => value ? dayjs(value).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Lương cơ bản (VND)',
      dataIndex: 'salary',
      width: 20,
      render: (value: any) => Number(value).toLocaleString('vi-VN')
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'tax_code',
      width: 20,
      render: (value: any) => value || '-'
    },
    {
      title: 'Ngân hàng',
      dataIndex: ['bank_info', 'bank_name'],
      width: 25,
      render: (value: any) => value || '-'
    },
    {
      title: 'Số tài khoản',
      dataIndex: ['bank_info', 'bank_account'],
      width: 25,
      render: (value: any) => value || '-'
    },
    {
      title: 'Phụ cấp',
      dataIndex: 'allowances',
      width: 50,
      render: (list: any) => {
        if (!list || list.length === 0) return '-';
        return list
          .map((a: any) => `${a.allowance_type_name}: ${Number(a.amount || 0).toLocaleString('vi-VN')} đ`)
          .join(', ');
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'effective_from',
      width: 15,
      render: (value: any, record: any) => {
        const status = getStatus(value, profiles);
        return getStatusText(status);
      }
    }
  ];

  const columns: any[] = [
    { 
      title: 'Hiệu lực từ', 
      dataIndex: 'effective_from', 
      key: 'effective_from', 
      render: (v: any) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
      sorter: (a: any, b: any) => dayjs(a.effective_from).unix() - dayjs(b.effective_from).unix(),
      defaultSortOrder: 'descend' as any,
    },
    { 
      title: 'Lương cơ bản', 
      dataIndex: 'salary', 
      key: 'salary', 
      render: (v: any) => Number(v).toLocaleString('vi-VN') + ' đ' 
    },
    { 
      title: 'Mã số thuế', 
      dataIndex: 'tax_code', 
      key: 'tax_code', 
      render: (v: any) => v || '-' 
    },
    { 
      title: 'Ngân hàng', 
      dataIndex: 'bank_info', 
      key: 'bank_info', 
      render: (v: any) => v?.bank_name || '-' 
    },
    { 
      title: 'Số tài khoản', 
      dataIndex: 'bank_info', 
      key: 'bank_account', 
      render: (v: any) => v?.bank_account || '-' 
    },
    { 
      title: 'Phụ cấp', 
      dataIndex: 'allowances', 
      key: 'allowances', 
      render: (list: any[]) => {
        if (!list || list.length === 0) return '-';
        return (
          <Space direction="vertical" size={2}>
            {list.map((a, idx) => {;
              return (
                <Tag key={idx} color={"orange"}>
                  {a.allowance_type_name}: {Number(a.amount || 0).toLocaleString('vi-VN')} đ
                </Tag>
              );
            })}
          </Space>
        );
      }
    },
    { 
      title: 'Trạng thái', 
      key: 'status', 
      fixed: 'right',
      render: (_: any, rec: any) => {
        const s = getStatus(rec.effective_from, profiles);
        let color = 'default';
        let label = '';
        if (s === 'current') { color = 'green'; label = 'Hiện tại'; }
        else if (s === 'future') { color = 'blue'; label = 'Tương lai'; }
        else if (s === 'past') { color = 'default'; label = 'Đã qua'; }
        else { color = 'default'; label = 'Không rõ'; }
        return <Tag color={color}>{label}</Tag>;
      },
      filters: [
        { text: 'Hiện tại', value: 'current' },
        { text: 'Tương lai', value: 'future' },
        { text: 'Đã qua', value: 'past' },
      ],
      onFilter: (value: any, rec: any) => getStatus(rec.effective_from, profiles) === value,
    },
  ];

  const handleCreate = async (values: any) => {
    try {
      setLoading(true);
      await SalaryService.createEmployeeSalaryProfile(userId, values);
      message.success('Tạo cấu hình lương thành công');
      setShowModal(false);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      message.error(data?.message || 'Lỗi khi tạo cấu hình lương');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Cấu hình lương nhân viên</h2>
        <Space>
          {profiles && profiles.length > 0 && (
            <ExcelExportButton
              data={profiles}
              columns={excelColumns}
              fileName="Cau_hinh_luong_nhan_vien"
              title="CẤU HÌNH LƯƠNG NHÂN VIÊN"
              description={`Tổng số: ${profiles.length} cấu hình | Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
              type="primary"
              style={{
                backgroundColor: '#52c41a',
                border: 'none'
              }}
            >
              <DownloadOutlined />
              Xuất Excel
            </ExcelExportButton>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            Thêm mới
          </Button>
        </Space>
      </div>

      <Table 
        rowKey="id" 
        loading={loading} 
        dataSource={profiles} 
        columns={columns} 
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total} bản ghi` }}
        bordered
        scroll={{ x: 'max-content' }}
      />

      <Modal 
        title="Thêm cấu hình lương mới" 
        open={showModal} 
        footer={null} 
        onCancel={() => setShowModal(false)} 
        destroyOnClose
        width={900}
      >
        <SalaryForm
          onBack={() => setShowModal(false)}
          onFinish={handleCreate}
          loading={loading}
          allowanceTypes={allowanceTypes}
          initialValues={{ salary: 0, allowance: 0, allowances: [], allowance_type_ids: [], effective_from: dayjs() }}
        />
      </Modal>
    </div>
  );
};

export default SalaryDealsList;

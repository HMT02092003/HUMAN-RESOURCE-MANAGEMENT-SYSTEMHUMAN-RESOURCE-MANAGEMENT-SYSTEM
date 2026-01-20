"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DatePicker, Button, message, Space, Input, Modal, Descriptions, Row, Col } from 'antd';
import type { InputRef } from 'antd';
import type { ColumnType } from 'antd/es/table';
import ServerSideTable from '@/components/common/ServerSideTable/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import dayjs from 'dayjs';
import salaryService from '@/service/salaryService';
import { SearchOutlined } from '@ant-design/icons';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';

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

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const searchInput = useRef<InputRef>(null);

  // ServerSideTable will drive data loading through its fetchData prop below.

  const handleMonthChange = (d: any) => { if (!d) { setMonth(dayjs()); return; } setMonth(d); };

  const formatCurrency = (text: string | number | undefined | null) => {
    if (text === null || text === undefined) return '0';
    const number = parseFloat(text.toString());
    if (isNaN(number)) return '0';
    return new Intl.NumberFormat('vi-VN').format(Number(number.toFixed(0)));
  };

  const formatDate = (text: string | undefined | null) => { if (!text) return ''; return dayjs(text).format('DD/MM/YYYY HH:mm:ss'); };

  const openDetail = async (id: number | string) => {
    setDetailLoading(true);
    try {
      const res = await salaryService.getPayslipById(id);
      if (res.success) {
        setSelectedPayslip(res.data);
        setDetailModalVisible(true);
      } else {
        message.error(res.message || 'Không thể tải thông tin phiếu lương');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Lỗi khi tải chi tiết');
    } finally { setDetailLoading(false); }
  };

  const columns: ServerSideColumnType<PayslipDataType>[] = [
    { title: 'Tên nhân viên', dataIndex: 'user', key: 'user', render: (_v, r:any) => r.fullName || r.username || 'N/A' },
    { title: 'Phòng ban', dataIndex: ['department','name'], key: 'department', render: (_,_r:any) => {
        // department may be present in several shapes depending on backend: prefer record.department.name, then record.user.department.name, then departmentName
        return _r?.department?.name ?? _r?.user?.department?.name ?? _r?.departmentName ?? 'N/A';
      } },
    { title: 'Kỳ', dataIndex: 'month', key: 'month', searchField: 'month', filterType: 'dateRange', render: (_,_r:any) => `${_r.year || ''}-${String(_r.month || '').padStart(2,'0')}` },
    { title: 'Lương cơ bản', dataIndex: 'base_salary', key: 'base_salary', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Phụ cấp', dataIndex: 'allowances', key: 'allowances', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Lương tăng ca', dataIndex: 'overtime_pay', key: 'overtime_pay', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' }, 
    { title: 'Tổng lương (Chưa khấu trừ)', dataIndex: 'gross_salary', key: 'gross_salary', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'BHXH', dataIndex: 'social_insurance', key: 'social_insurance', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'BHYT', dataIndex: 'health_insurance', key: 'health_insurance', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Thuế TNCN', dataIndex: 'personal_income_tax', key: 'personal_income_tax', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Tổng khấu trừ', dataIndex: 'total_deductions', key: 'total_deductions', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Tổng tiền phạt', dataIndex: 'penalty_total', key: 'penalty_total', filterType: 'number', render: (t)=> formatCurrency(t) + ' VNĐ' },
    { title: 'Lương thực nhận', dataIndex: 'net_salary', key: 'net_salary', filterType: 'number', render: (t)=> <b style={{ color: 'green' }}>{formatCurrency(t) + ' VNĐ'}</b> },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes' },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', render: (t)=> formatDate(t) },
    { title: 'Ngày cập nhật', dataIndex: 'updated_at', key: 'updated_at', render: (t)=> formatDate(t) },
    { title: 'Thao tác', key: 'actions', fixed: 'right', width: 80, render: (_,_r:any) => (
      <Button type="text" onClick={() => openDetail(_r.id)} aria-label="Xem chi tiết">
        {/* eye outline icon */}
        <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
      </Button>
    ) },
  ];

  const excelColumns: ExcelColumn[] = [
    { title: 'Năm', dataIndex: 'year', width: 10 },
    { title: 'Tháng', dataIndex: 'month', width: 10 },
    { title: 'Lương cơ bản', dataIndex: 'base_salary', width: 15 },
    { title: 'Phụ cấp', dataIndex: 'allowances', width: 15 },
    { title: 'Lương tăng ca', dataIndex: 'overtime_pay', width: 15 },
    { title: 'Tổng lương', dataIndex: 'gross_salary', width: 15 },
    { title: 'BHXH', dataIndex: 'social_insurance', width: 15 },
    { title: 'BHYT', dataIndex: 'health_insurance', width: 15 },
    { title: 'Thuế TNCN', dataIndex: 'personal_income_tax', width: 15 },
    { title: 'Tổng khấu trừ', dataIndex: 'total_deductions', width: 15 },
    { title: 'Tổng tiền phạt', dataIndex: 'penalty_total', width: 15 },
    { title: 'Lương thực nhận', dataIndex: 'net_salary', width: 15 },
    { title: 'Ghi chú', dataIndex: 'notes', width: 30 }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <ExcelExportButton
          data={data}
          columns={excelColumns}
          fileName={`phieu-luong-cua-toi-${dayjs().format('YYYY-MM-DD')}`}
          title="PHIẾU LƯƠNG CỦA TÔI"
          description={`Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
        />
      </div>

      <ServerSideTable
        columns={columns}
        rowKey={(r:any) => r.id || `${r.user_id}-${r.year}-${r.month}`}
        fetchData={async (params: any) => {
          // Forward table params to server-side paginated endpoint so backend applies filters/sort/pagination.
          // useServerSideTable already converts *_range -> fieldFrom/fieldTo; pass params through.
          try {
            const res = await salaryService.listMyPayslipsPaginated(params);
            if (!res.success) return { data: [], total: 0, page: params.page || 1, pageSize: params.limit || 10 };
            return {
              data: res.data || [],
              total: typeof res.total === 'number' ? res.total : (res.data ? res.data.length : 0),
              page: params.page || res.page || 1,
              pageSize: params.limit || params.pageSize || res.pageSize || 10,
            };
          } catch (e: any) {
            return { data: [], total: 0, page: params.page || 1, pageSize: params.limit || 10 };
          }
        }}
        defaultPageSize={pageSize}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={selectedPayslip ? `Phiếu lương - ${selectedPayslip.fullName || selectedPayslip.username || ''} (${selectedPayslip.year || ''}-${String(selectedPayslip.month || '').padStart(2,'0')})` : 'Phiếu lương'}
        open={detailModalVisible}
        onCancel={() => { setDetailModalVisible(false); setSelectedPayslip(null); }}
        footer={null}
        width={900}
        centered
      >
        {selectedPayslip ? (
          <div style={{ padding: 16, border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedPayslip.fullName || selectedPayslip.username}</div>
                <div style={{ color: '#666' }}>{selectedPayslip.departmentName || (selectedPayslip.department && selectedPayslip.department.name) || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#444' }}>
                <div>Kỳ: {selectedPayslip.year} - {String(selectedPayslip.month).padStart(2, '0')}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{formatDate(selectedPayslip.created_at)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1, borderRight: '1px dashed #eee', paddingRight: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>Lương cơ bản</div>
                  <div>{formatCurrency(selectedPayslip.base_salary)} VNĐ</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>Phụ cấp</div>
                  <div>{formatCurrency(selectedPayslip.allowances)} VNĐ</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>Tăng ca</div>
                  <div>{formatCurrency(selectedPayslip.overtime_pay)} VNĐ</div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <div>Tổng thu nhập (Gross)</div>
                  <div>{formatCurrency(selectedPayslip.gross_salary)} VNĐ</div>
                </div>
              </div>

              <div style={{ flex: 1, paddingLeft: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>BHXH</div>
                  <div>{formatCurrency(selectedPayslip.social_insurance)} VNĐ</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>BHYT</div>
                  <div>{formatCurrency(selectedPayslip.health_insurance)} VNĐ</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>Tiền phạt</div>
                  <div>{formatCurrency(selectedPayslip.penalty_total)} VNĐ</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div>Thuế TNCN</div>
                  <div>{formatCurrency(selectedPayslip.personal_income_tax)} VNĐ</div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <div>Tổng khấu trừ</div>
                  <div>{formatCurrency(selectedPayslip.total_deductions)} VNĐ</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#666' }}>{selectedPayslip.notes || '---'}</div>
              <div style={{ textAlign: 'right' }}>
                <br /><br />
                <div style={{ marginBottom: 6 }}>Tổng khấu trừ: {formatCurrency(selectedPayslip.total_deductions)} VNĐ</div>
                <div style={{ fontSize: 20, color: 'green', fontWeight: 800 }}>Lương thực nhận: {formatCurrency(selectedPayslip.net_salary)} VNĐ</div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AllPayslips;

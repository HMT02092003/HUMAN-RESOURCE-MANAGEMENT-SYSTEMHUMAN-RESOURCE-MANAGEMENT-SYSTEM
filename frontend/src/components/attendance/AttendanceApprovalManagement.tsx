"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button, Space, message, Tooltip, Tag, DatePicker, Modal } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { CheckOutlined, CheckCircleOutlined, CalendarOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType } from '@/components/common/ServerSideTable/types';
import { attendanceService } from '@/service/attendanceService';
import dayjs from 'dayjs';
import { useExcelExport } from '@/components/common/ExcelExport';

const { MonthPicker } = DatePicker;

const AttendanceApprovalManagement: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Hook Excel Export
  const { exportToExcel } = useExcelExport();
  
  // State cho xuất Excel
  const [loadingApprovalExport, setLoadingApprovalExport] = useState(false);
  const [loadingAttendanceExport, setLoadingAttendanceExport] = useState(false);
  
  // Modal cho duyệt bảng chấm công và xuất bảng công
  const [showApproveMonthModal, setShowApproveMonthModal] = useState(false);
  const [showAttendanceMonthModal, setShowAttendanceMonthModal] = useState(false);
  const [exportMonthSelection, setExportMonthSelection] = useState(dayjs());

  // Ref để lưu trữ dữ liệu đã filter/sort từ table
  const currentTableDataRef = useRef<any[]>([]);
  const currentFiltersRef = useRef<any>({});
  const currentSortRef = useRef<any>({});

  const handleApproveAttendance = async (monthlyAttendanceId: number) => {
    try {
      await attendanceService.approveMonthlyAttendance([monthlyAttendanceId]);
      message.success('Đã duyệt bảng chấm công');
      setRefreshTrigger(prev => prev + 1);
      setSelectedRowKeys([]);
      setSelectedRows([]);
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi duyệt chấm công!');
    }
  };

  const handleApproveSelected = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.info('Vui lòng chọn ít nhất một bản ghi');
      return;
    }
    try {
      const toApprove = selectedRows.filter((r: any) => !r.isApproved);
      if (toApprove.length === 0) {
        message.info('Không có bản ghi nào cần duyệt');
        return;
      }
      const ids = toApprove.map((r: any) => Number(r.id));
      await attendanceService.approveMonthlyAttendance(ids);
      message.success(`Đã duyệt ${ids.length} bảng chấm công`);
      setSelectedRowKeys([]);
      setSelectedRows([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi duyệt các bản ghi đã chọn');
    }
  };

  const handleApproveAllMonth = async (selectedMonth: dayjs.Dayjs) => {
    setShowApproveMonthModal(false);
    const monthStr = selectedMonth.format('YYYY-MM');
    const monthDisplay = selectedMonth.format('MM/YYYY');
    
    Modal.confirm({
      title: 'Xác nhận duyệt tất cả',
      content: `Bạn có chắc chắn muốn duyệt TẤT CẢ bảng chấm công (chưa duyệt) của tháng ${monthDisplay}?`,
      okText: 'Duyệt tất cả',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const result = await attendanceService.approveAllByMonth(monthStr);
          message.success(`Đã duyệt ${result.approved} bảng chấm công cho tháng ${monthDisplay}`);
          setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
          message.error(err.message || 'Lỗi khi duyệt tất cả bảng chấm công');
        }
      }
    });
  };

  // Hàm xuất Excel Bảng Duyệt - Gọi API lấy TẤT CẢ dữ liệu theo scope
  const handleExportApprovalData = async () => {
    setLoadingApprovalExport(true);
    
    try {
      console.log('📊 Xuất Excel - Gọi API lấy tất cả dữ liệu theo scope...');
      // Export should reflect the current table view (search/sort/filter/pagination).
      // Use `currentTableDataRef.current` (kept in sync by ServerSideTable.onDataChange).
      let rowsToExport: any[] = Array.isArray(currentTableDataRef.current) ? currentTableDataRef.current : [];

      // If table currently shows no rows (e.g. not loaded), fallback to full-export API (previous behavior)
      if (!rowsToExport || rowsToExport.length === 0) {
        console.log('📊 Bảng hiện tại rỗng — fallback sang full export API');
        const response = await attendanceService.getMonthlySummariesForExport(currentFiltersRef.current);
        if (!response.success || !response.data || response.data.length === 0) {
          message.warning('Không có dữ liệu để xuất.');
          setLoadingApprovalExport(false);
          return;
        }
        rowsToExport = response.data;
      }

      console.log('📊 Xuất Excel - Số bản ghi sẽ xuất:', rowsToExport.length);

      // Format data cho Excel (hỗ trợ cả dạng API-flat và dạng record.user nested)
      const formattedData = rowsToExport.map((record: any, idx: number) => ({
        fullName: record.fullName || record.user?.fullName || record.user?.firstName || record.user?.lastName || record.user?.username || '-',
        username: record.username || record.user?.username || '-',
        department: record.department || record.user?.department?.name || '-',
        month: record.month || record.month || '-',
        status: record.isApproved || record.status || record.approved ? 'Đã duyệt' : 'Chưa duyệt',
        totalScheduledDays: record.totalScheduledDays || record.totalDays || 0,
        presentDays: record.presentDays || record.presentDaysCount || 0,
        absentDays: record.absentDays || 0,
        approvedLeaveDays: record.approvedLeaveDays || 0,
        unauthorizedAbsenceDays: record.unauthorizedAbsenceDays || 0,
        businessTripDays: record.businessTripDays || 0,
        totalWorkHours: record.totalWorkHours || record.totalHours || 0,
        averageWorkHours: record.averageWorkHours || 0,
        totalWorkingUnits: record.totalWorkingUnits || 0,
        totalOvertimeHours: record.totalOvertimeHours || 0,
        totalOvertimeSalary: record.totalOvertimeSalary || record.totalOvertimePay || 0,
        totalLatePenalty: record.totalLatePenalty || 0,
        totalEarlyLeavePenalty: record.totalEarlyLeavePenalty || 0,
        totalUnauthorizedAbsencePenalty: record.totalUnauthorizedAbsencePenalty || 0,
        totalPenalty: record.totalPenalty || 0,
      }));

      // Columns definition
      const columns = [
        { title: 'Họ và tên', dataIndex: 'fullName', width: 25 },
        { title: 'Username', dataIndex: 'username', width: 20 },
        { title: 'Phòng ban', dataIndex: 'department', width: 25 },
        { title: 'Tháng', dataIndex: 'month', width: 12 },
        { title: 'Trạng thái', dataIndex: 'status', width: 15 },
        { title: 'Tổng ngày', dataIndex: 'totalScheduledDays', width: 12 },
        { title: 'Ngày công', dataIndex: 'presentDays', width: 12 },
        { title: 'Vắng', dataIndex: 'absentDays', width: 10 },
        { title: 'Phép', dataIndex: 'approvedLeaveDays', width: 10 },
        { title: 'Vắng KLĐ', dataIndex: 'unauthorizedAbsenceDays', width: 12 },
        { title: 'Công tác', dataIndex: 'businessTripDays', width: 12 },
        { title: 'Tổng giờ', dataIndex: 'totalWorkHours', width: 12 },
        { title: 'TB giờ', dataIndex: 'averageWorkHours', width: 12 },
        { title: 'Tổng công', dataIndex: 'totalWorkingUnits', width: 12 },
        { title: 'OT (giờ)', dataIndex: 'totalOvertimeHours', width: 12 },
        { title: 'OT (lương)', dataIndex: 'totalOvertimeSalary', width: 15 },
        { title: 'Phạt muộn', dataIndex: 'totalLatePenalty', width: 15 },
        { title: 'Phạt sớm', dataIndex: 'totalEarlyLeavePenalty', width: 15 },
        { title: 'Phạt vắng', dataIndex: 'totalUnauthorizedAbsencePenalty', width: 15 },
        { title: 'Tổng phạt', dataIndex: 'totalPenalty', width: 15 },
      ];

      // Xuất Excel (theo dữ liệu đã format)
      await exportToExcel({
        data: formattedData,
        columns,
        fileName: 'BangDuyetChamCong',
        title: 'BẢNG DUYỆT CHẤM CÔNG',
        description: `Báo cáo ngày ${dayjs().format('DD/MM/YYYY')} - Tổng: ${formattedData.length} bản ghi`,
      });

      message.success(`Đã xuất ${formattedData.length} bản ghi ra Excel`);
    } catch (error: any) {
      console.error('Error exporting approval data:', error);
      message.error(error.message || 'Có lỗi khi xuất Excel');
    } finally {
      setLoadingApprovalExport(false);
    }
  };

  // Hàm xuất Excel Bảng Công chi tiết theo ngày
  const handleExportDailyAttendanceData = async (selectedMonth: dayjs.Dayjs) => {
    setLoadingAttendanceExport(true);
    setShowAttendanceMonthModal(false);
    
    try {
      const monthStr = selectedMonth.format('YYYY-MM');
      const monthDisplay = selectedMonth.format('MM/YYYY');
      
      console.log('📊 Fetching daily attendance for export:', monthStr);
      
      // Gọi API mới để lấy chi tiết theo ngày
      const response = await attendanceService.getDailyAttendanceForExport(monthStr);
      
      if (!response.success || !response.data || response.data.length === 0) {
        message.warning(`Không có dữ liệu bảng công tháng ${monthDisplay}`);
        return;
      }

      const data = response.data;
      const daysInMonth = response.daysInMonth || 31;

      // Ensure exported records include `department` and stable `stt`, `fullName`, `position`.
      // Prefer fields returned by the API (flat `fullName`/`department`), fallback to nested `user` when present.
      const formattedData = Array.isArray(data)
        ? data.map((rec: any, idx: number) => {
            const user = rec.user || {};
            return {
              ...rec,
              stt: rec.stt || idx + 1,
              fullName: rec.fullName || user.fullName || user.firstName || user.lastName || user.username || `User ${rec.userId || idx + 1}`,
              position: rec.position || user.position?.name || user.position || user.jobTitle || '-',
              department: rec.department || user.department?.name || '-',
            };
          })
        : [];

      // Build columns: STT, Họ và tên, Phòng ban, Chức vụ, Day1-31, Tổng ngày công
      const columns: any[] = [
        { title: 'STT', dataIndex: 'stt', width: 8 },
        { title: 'Họ và tên', dataIndex: 'fullName', width: 25 },
        { title: 'Phòng ban', dataIndex: 'department', width: 25 },
        { title: 'Chức vụ', dataIndex: 'position', width: 20 },
      ];
      
      // Add day columns
      for (let day = 1; day <= daysInMonth; day++) {
        columns.push({
          title: day.toString(),
          dataIndex: `day${day}`,
          width: 6,
        });
      }
      
      columns.push({
        title: 'Tổng ngày công',
        dataIndex: 'totalWorkingDays',
        width: 15,
      });

      // Xuất Excel (sử dụng dữ liệu đã format để có `department`)
      await exportToExcel({
        data: formattedData,
        columns,
        fileName: `BangCong_${monthStr}`,
        title: `BẢNG CHẤM CÔNG THEO NGÀY (THÁNG ${monthDisplay})`,
        description: `Ngày trong tháng (1-${daysInMonth})\nBáo cáo ngày ${dayjs().format('DD/MM/YYYY')}`,
      });

      message.success(`Đã xuất bảng công tháng ${monthDisplay} (${data.length} nhân viên)`);
    } catch (error: any) {
      console.error('Error exporting daily attendance:', error);
      message.error(error.message || 'Có lỗi khi xuất Excel');
    } finally {
      setLoadingAttendanceExport(false);
    }
  };

  // Wrapper to normalize paging keys for backend
  const fetchData = useCallback(async (params: any) => {
    const normalized = { ...params };
    // Hook sends `limit`; backend accepts both `pageSize` and `limit`
    if (normalized.limit && !normalized.pageSize) normalized.pageSize = normalized.limit;
    // Ensure page is present (frontend uses 1-based page)
    if (normalized.page === undefined && normalized.current !== undefined) normalized.page = normalized.current;

    // Lưu lại filters và sort để dùng cho export
    currentFiltersRef.current = {
      ...normalized,
      page: normalized.page,
      pageSize: normalized.pageSize, // Lưu pageSize hiện tại
    };
    
    // Lưu sort riêng
    if (normalized.sortField || normalized.sortOrder) {
      currentSortRef.current = {
        sortField: normalized.sortField,
        sortOrder: normalized.sortOrder,
      };
    }

    // Backend determines permissionKey based on route context, not from frontend
    const result = await attendanceService.getMonthlySummariesByScope(normalized);

    // NOTE: `useServerSideTable` (and ServerSideTable) will call onDataChange
    // with the current page rows. We keep `currentTableDataRef` in sync via
    // the ServerSideTable `onDataChange` prop (see below) instead of reading
    // result.data here because the API returns `{ results, total, page, pageSize }`.

    return result;
  }, []);

  const columns: ServerSideColumnType<any>[] = useMemo(() => [
    {
      title: 'Người dùng',
      dataIndex: ['user', 'fullName'],
      key: 'fullName',
      searchField: 'fullName',
      sortable: true,
      filterType: 'text',
      width: 180,
      render: (_: any, record: any) => {
        const u = record.user || {};
        return u.fullName || u.firstName || u.lastName || u.username || '—';
      }
    },
    {
      title: 'Username',
      dataIndex: ['user', 'username'],
      key: 'username',
      searchField: 'username',
      sortable: true,
      filterType: 'text',
      width: 150
    },
    {
      title: 'Phòng ban',
      dataIndex: ['user', 'department', 'name'],
      key: 'departmentName',
      searchField: 'departmentName',
      sortable: true,
      filterType: 'text',
      width: 180
    },
    {
      title: 'Tháng',
      dataIndex: 'month',
      key: 'month',
      searchField: 'month',
      sortable: true,
      filterType: 'text',
      width: 120,
      render: (val: string) => {
        if (!val) return '-';
        const parts = val.split('-');
        if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
        return dayjs(val).format('MM/YYYY');
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isApproved',
      key: 'isApproved',
      searchField: 'isApproved',
      sortable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Đã duyệt' },
        { value: 'false', label: 'Chưa duyệt' }
      ],
      width: 130,
      render: (v: any) => (
        v ? <Tag color="green">Đã duyệt</Tag> : <Tag color="red">Chưa duyệt</Tag>
      )
    },
    {
      title: 'Tổng ngày',
      dataIndex: 'totalScheduledDays',
      key: 'totalScheduledDays',
      searchField: 'totalScheduledDays',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'Ngày công',
      dataIndex: 'presentDays',
      key: 'presentDays',
      searchField: 'presentDays',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'Vắng',
      dataIndex: 'absentDays',
      key: 'absentDays',
      searchField: 'absentDays',
      sortable: true,
      filterType: 'number',
      width: 90
    },
    {
      title: 'Phép',
      dataIndex: 'approvedLeaveDays',
      key: 'approvedLeaveDays',
      searchField: 'approvedLeaveDays',
      sortable: true,
      filterType: 'number',
      width: 90
    },
    {
      title: 'Vắng KLĐ',
      dataIndex: 'unauthorizedAbsenceDays',
      key: 'unauthorizedAbsenceDays',
      searchField: 'unauthorizedAbsenceDays',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'Công tác',
      dataIndex: 'businessTripDays',
      key: 'businessTripDays',
      searchField: 'businessTripDays',
      sortable: true,
      filterType: 'number',
      width: 100
    },
    {
      title: 'Tổng giờ',
      dataIndex: 'totalWorkHours',
      key: 'totalWorkHours',
      searchField: 'totalWorkHours',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'TB giờ',
      dataIndex: 'averageWorkHours',
      key: 'averageWorkHours',
      searchField: 'averageWorkHours',
      sortable: true,
      filterType: 'number',
      width: 100
    },
    {
      title: 'Tổng công',
      dataIndex: 'totalWorkingUnits',
      key: 'totalWorkingUnits',
      searchField: 'totalWorkingUnits',
      sortable: true,
      filterType: 'number',
      width: 110
    },
    {
      title: 'OT (giờ)',
      dataIndex: 'totalOvertimeHours',
      key: 'totalOvertimeHours',
      searchField: 'totalOvertimeHours',
      sortable: true,
      filterType: 'number',
      width: 100
    },
    {
      title: 'OT (lương)',
      dataIndex: 'totalOvertimeSalary',
      key: 'totalOvertimeSalary',
      searchField: 'totalOvertimeSalary',
      sortable: true,
      filterType: 'number',
      width: 130
    },
    {
      title: 'Phạt muộn',
      dataIndex: 'totalLatePenalty',
      key: 'totalLatePenalty',
      searchField: 'totalLatePenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Phạt sớm',
      dataIndex: 'totalEarlyLeavePenalty',
      key: 'totalEarlyLeavePenalty',
      searchField: 'totalEarlyLeavePenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Phạt vắng',
      dataIndex: 'totalUnauthorizedAbsencePenalty',
      key: 'totalUnauthorizedAbsencePenalty',
      searchField: 'totalUnauthorizedAbsencePenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Tổng phạt',
      dataIndex: 'totalPenalty',
      key: 'totalPenalty',
      searchField: 'totalPenalty',
      sortable: true,
      filterType: 'number',
      width: 120
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          {!record.isApproved ? (
            <Tooltip title="Duyệt bảng chấm công">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined style={{ color: 'green' }} />}
                onClick={() => handleApproveAttendance(record.id)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Đã duyệt">
              <Button 
                type="text" 
                size="small"
                icon={<CheckCircleOutlined style={{ color: 'gray' }} />} 
                disabled 
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], []);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: any[]) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
    getCheckboxProps: (record: any) => ({
      disabled: Boolean(record?.isApproved),
      name: `select-${record?.id}`,
    }),
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: 16 }} wrap align="center">
        {/* Nút duyệt bảng chấm công - hiện modal chọn tháng */}
        <Tooltip title="Duyệt tất cả bảng chấm công (chưa duyệt) của tháng">
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => {
              setExportMonthSelection(dayjs());
              setShowApproveMonthModal(true);
            }}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Duyệt bảng chấm công
          </Button>
        </Tooltip>

        {/* Nút duyệt đã chọn - chỉ hiện khi có checkbox được chọn */}
        {selectedRowKeys.length > 0 && (
          <Button 
            type="default" 
            onClick={handleApproveSelected}
            style={{ marginLeft: 8 }}
          >
            <CheckOutlined /> Duyệt đã chọn ({selectedRowKeys.length})
          </Button>
        )}

        {/* Nút xuất Excel bảng duyệt - xuất trực tiếp không có modal */}
        <Tooltip title="Xuất toàn bộ dữ liệu trong bảng ra Excel">
          <Button
            type="default"
            icon={<FileExcelOutlined />}
            onClick={handleExportApprovalData}
            loading={loadingApprovalExport}
            style={{ backgroundColor: '#722ed1', color: 'white', borderColor: '#722ed1' }}
          >
            Xuất Excel Bảng Duyệt
          </Button>
        </Tooltip>

        {/* Nút xuất Excel bảng công chi tiết - có modal chọn tháng */}
        <Tooltip title="Xuất Excel bảng công chi tiết theo ngày">
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={() => {
              setExportMonthSelection(dayjs());
              setShowAttendanceMonthModal(true);
            }}
            style={{ backgroundColor: '#fa8c16', color: 'white', borderColor: '#fa8c16' }}
          >
            Xuất Excel Bảng Công
          </Button>
        </Tooltip>
      </Space>
      
      <ServerSideTable
        columns={columns}
        fetchData={fetchData}
        rowKey="id"
        defaultSortField="month"
        defaultSortOrder="desc"
        defaultPageSize={20}
        showSelection={true}
        onSelectionChange={(keys, rows) => {
          setSelectedRowKeys(keys);
          setSelectedRows(rows);
        }}
        onDataChange={(data: any[], pagination: any) => {
          // keep the ref updated so export button can use the current page data
          currentTableDataRef.current = Array.isArray(data) ? data : [];
          // also store current filters/pagination for possible full-export later
          currentFiltersRef.current = {
            ...currentFiltersRef.current,
            page: pagination?.current,
            pageSize: pagination?.pageSize,
          };
        }}
        getCheckboxProps={(record: any) => ({ disabled: Boolean(record?.isApproved), name: `select-${record?.id}` })}
        refreshTrigger={refreshTrigger}
        scroll={{ x: 'max-content' }}
        bordered
      />

      {/* Modal chọn tháng cho nút Duyệt bảng chấm công */}
      <Modal
        title="Chọn tháng duyệt bảng chấm công"
        open={showApproveMonthModal}
        onCancel={() => setShowApproveMonthModal(false)}
        onOk={() => handleApproveAllMonth(exportMonthSelection)}
        okText="Duyệt tất cả"
        cancelText="Hủy"
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: 16 }}>Chọn tháng bạn muốn duyệt tất cả bảng chấm công:</p>
          <DatePicker
            value={exportMonthSelection}
            onChange={(date) => date && setExportMonthSelection(date)}
            picker="month"
            format="MM/YYYY"
            style={{ width: '100%' }}
            locale={viVN}
            placeholder="Chọn tháng"
          />
          <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            Sẽ duyệt TẤT CẢ các bảng chấm công (chưa duyệt) của tháng đã chọn
          </p>
        </div>
      </Modal>

      {/* Modal chọn tháng xuất Bảng Công */}
      <Modal
        title="Chọn tháng xuất Bảng Công"
        open={showAttendanceMonthModal}
        onCancel={() => setShowAttendanceMonthModal(false)}
        onOk={() => handleExportDailyAttendanceData(exportMonthSelection)}
        okText="Xuất Excel"
        cancelText="Hủy"
        confirmLoading={loadingAttendanceExport}
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: 16 }}>Chọn tháng bạn muốn xuất bảng công chi tiết:</p>
          <DatePicker
            value={exportMonthSelection}
            onChange={(date) => date && setExportMonthSelection(date)}
            picker="month"
            format="MM/YYYY"
            style={{ width: '100%' }}
            locale={viVN}
            placeholder="Chọn tháng"
          />
          <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            Bảng công sẽ hiển thị chi tiết chấm công từng ngày (1-31) của tháng đã chọn
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceApprovalManagement;

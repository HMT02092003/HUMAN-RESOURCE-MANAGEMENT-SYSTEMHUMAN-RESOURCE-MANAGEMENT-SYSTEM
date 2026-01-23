"use client";

import React, { useState, useCallback } from 'react';
import { Button, message, Space, Row, Col, Modal } from 'antd';
import salaryService from '@/service/salaryService';
import { useRouter } from 'next/navigation';
import { DeleteOutlined, EditOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { ExcelExportButton } from '@/components/common/ExcelExport';
import type { ExcelColumn } from '@/components/common/ExcelExport';
import dayjs from 'dayjs';
import { ServerSideTable } from '@/components/common/ServerSideTable';
import type { ServerSideColumnType, TableQueryParams } from '@/components/common/ServerSideTable';

interface AllowanceType {
  id: number;
  name: string;
  default_amount: number;
  is_taxable: boolean;
  description: string;
}

const AdminAllowanceList: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<AllowanceType[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { confirm } = Modal;

  const fetchData = useCallback(async (params: TableQueryParams) => {
    try {
      const res = await salaryService.listAllowanceTypes(params);
      // Normalize response - backend returns { data, total, pagination }
      return {
        data: res.data || [],
        total: res.total || 0
      };
    } catch (err) {
      message.error('Không thể tải danh sách phụ cấp');
      return { data: [], total: 0 };
    }
  }, []);

  const handleEdit = (id: number) => {
    router.push(`/salary/allowances/edit/${id}`);
  };

  const handleDeleteOne = (id: number) => {
    confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa bản ghi này?',
      onOk: async () => {
        try {
          await salaryService.removeAllowanceType(id);
          message.success('Xóa thành công');
          setRefreshTrigger(prev => prev + 1);
        } catch (err) {
          message.error('Xóa thất bại');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) return message.info('Vui lòng chọn ít nhất 1 bản ghi');
    confirm({
      title: 'Xác nhận xóa nhiều',
      content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} bản ghi đã chọn?`,
      onOk: async () => {
        try {
          // perform sequential deletes; can be optimized to parallel if backend supports
          for (const k of selectedRowKeys) {
            await salaryService.removeAllowanceType(k);
          }
          message.success('Xóa thành công');
          setSelectedRowKeys([]);
          setSelectedRows([]);
          setRefreshTrigger(prev => prev + 1);
        } catch (err) {
          message.error('Xóa thất bại');
        }
      }
    });
  };

  const columns: ServerSideColumnType<AllowanceType>[] = [
    {
      title: 'Tên phụ cấp',
      dataIndex: 'name',
      key: 'name',
      searchField: 'name',
      filterType: 'text',
      sortable: true,
      searchPlaceholder: 'Tìm theo tên...'
    },
    {
      title: 'Tiền phụ cấp',
      dataIndex: 'default_amount',
      key: 'default_amount',
      searchField: 'default_amount',
      filterType: 'number',
      sortable: true,
      render: (_: any, r: AllowanceType) => r.default_amount?.toLocaleString('vi-VN') || '-'
    },
    {
      title: 'Có tính thuế TNCN',
      dataIndex: 'is_taxable',
      key: 'is_taxable',
      searchField: 'is_taxable',
      filterType: 'select',
      sortable: true,
      filterOptions: [
        { value: true, label: 'Có' },
        { value: false, label: 'Không' }
      ],
      render: (_: any, r: AllowanceType) => r.is_taxable ? 'Có' : 'Không'
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      searchField: 'description',
      filterType: 'text',
      sortable: true,
      searchPlaceholder: 'Tìm theo mô tả...'
    },
    {
      title: 'Hành động',
      key: 'actions',
      filterType: 'none',
      sortable: false,
      render: (_: any, record: AllowanceType) => (
        <div style={{ display: "flex", justifyItems: "row" }}>
          <Button type="text" onClick={() => handleEdit(record.id)}><EditOutlined /></Button>
          <Button type="text" danger onClick={() => handleDeleteOne(record.id)}><DeleteOutlined /></Button>
        </div>
      )
    }
  ];

  const excelColumns: ExcelColumn[] = [
    { title: 'Tên phụ cấp', dataIndex: 'name', width: 25 },
    { title: 'Tiền phụ cấp', dataIndex: 'default_amount', width: 15, render: (val: any) => val?.toLocaleString('vi-VN') || '-' },
    { title: 'Có tính thuế TNCN', dataIndex: 'is_taxable', width: 15, render: (val: any) => val ? 'Có' : 'Không' },
    { title: 'Mô tả', dataIndex: 'description', width: 35 }
  ];

  const handleExportExcel = async () => {
    // If rows are selected, export selected rows; otherwise fetch all data
    if (selectedRows.length > 0) {
      return;
    }

    try {
      setLoading(true);
      // Fetch all data for export (no pagination)
      const res = await salaryService.getAllowanceTypes();
      const allData = res?.data || res || [];

      // Create a temporary ExcelExportButton with all data
      const ExcelJS = require('exceljs');
      const { saveAs } = require('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');

      let currentRow = 1;

      // Add title
      const titleRow = worksheet.getRow(currentRow);
      titleRow.getCell(1).value = 'DANH SÁCH PHỤ CẤP';
      titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1F4788' } };
      titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.height = 30;
      worksheet.mergeCells(currentRow, 1, currentRow, excelColumns.length);
      currentRow++;

      // Add description
      const descRow = worksheet.getRow(currentRow);
      descRow.getCell(1).value = `Xuất ngày ${dayjs().format('DD/MM/YYYY')}`;
      descRow.getCell(1).font = { italic: true, size: 11 };
      descRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      descRow.height = 20;
      worksheet.mergeCells(currentRow, 1, currentRow, excelColumns.length);
      currentRow += 2;

      // Add headers
      const headerRow = worksheet.getRow(currentRow);
      excelColumns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.title;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4788' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      headerRow.height = 25;
      currentRow++;

      // Add data
      allData.forEach((record: any, recordIndex: number) => {
        const dataRow = worksheet.getRow(currentRow);
        excelColumns.forEach((col, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          let value = record[col.dataIndex as string];
          if (col.render) value = col.render(value, record, recordIndex);
          cell.value = value || '';
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
        currentRow++;
      });

      // Set column widths
      excelColumns.forEach((col, index) => {
        worksheet.getColumn(index + 1).width = col.width || 15;
      });

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `danh-sach-phu-cap-${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success('Xuất Excel thành công!');
    } catch (err) {
      console.error('Excel export error:', err);
      message.error('Không thể xuất Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" onClick={() => router.push('/salary/allowances/create')}>
            <PlusOutlined /> Tạo mới
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button danger onClick={handleBulkDelete}>
              Xóa đã chọn ({selectedRowKeys.length})
            </Button>
          )}
          {selectedRowKeys.length > 0 ? (
            <ExcelExportButton
              data={selectedRows}
              columns={excelColumns}
              fileName={`danh-sach-phu-cap-${dayjs().format('YYYY-MM-DD')}`}
              title="DANH SÁCH PHỤ CẤP"
              description={`Xuất ngày ${dayjs().format('DD/MM/YYYY')}`}
              buttonType="default"
              buttonStyle={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            />
          ) : (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              loading={loading}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            >
              Xuất Excel
            </Button>
          )}
        </Space>
      </Col>

      <Col span={24}>
        <ServerSideTable<AllowanceType>
          columns={columns}
          fetchData={fetchData}
          rowKey="id"
          defaultPageSize={10}
          showSelection={true}
          onSelectionChange={(keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
          }}
          refreshTrigger={refreshTrigger}
          showTotal={true}
        />
      </Col>
    </Row>
  );
};

export default AdminAllowanceList;

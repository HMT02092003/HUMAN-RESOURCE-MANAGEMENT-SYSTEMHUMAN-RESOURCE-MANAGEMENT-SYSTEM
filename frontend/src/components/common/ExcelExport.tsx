import React from 'react';
import { Button, ConfigProvider } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Column definition for Excel export - tương thích với Ant Design Table columns
 */
export interface ExcelColumn {
  title: string;
  dataIndex: string | string[];
  key?: string;
  width?: number;
  render?: (value: any, record: any, index: number) => any;
}

/**
 * Props for ExcelExportButton component
 */
export interface ExcelExportProps {
  /** Dữ liệu cần xuất (mảng objects giống data của Ant Design Table) */
  data: any[];
  /** Định nghĩa các cột (giống columns của Ant Design Table) */
  columns: ExcelColumn[];
  /** Tên file Excel (không cần đuôi .xlsx) */
  fileName?: string;
  /** Tiêu đề chính của báo cáo */
  title?: string;
  /** Mô tả/subtitle của báo cáo */
  description?: string;
  /** Text hiển thị trên button (children sẽ override nếu có) */
  buttonText?: string;
  /** Icon của button */
  buttonIcon?: React.ReactNode;
  /** Kiểu button (default, primary, dashed, text, link) */
  buttonType?: 'default' | 'primary' | 'dashed' | 'text' | 'link';
  /** Kích thước button */
  buttonSize?: 'small' | 'middle' | 'large';
  /** Custom style cho button */
  buttonStyle?: React.CSSProperties;
  /** Disable button */
  disabled?: boolean;
  /** Tên sheet trong file Excel */
  sheetName?: string;
  /** Callback khi bắt đầu export */
  onExportStart?: () => void;
  /** Callback khi export thành công */
  onExportSuccess?: () => void;
  /** Callback khi export lỗi */
  onExportError?: (error: Error) => void;
  /** Children (nội dung button, override buttonText) */
  children?: React.ReactNode;
  /** Type của button (alias cho buttonType) */
  type?: 'default' | 'primary' | 'dashed' | 'text' | 'link';
  /** Style của button (alias cho buttonStyle) */
  style?: React.CSSProperties;
  /** ClassName của button */
  className?: string;
}

/**
 * Component button để xuất dữ liệu ra Excel
 * 
 * @example
 * ```tsx
 * <ExcelExportButton
 *   data={users}
 *   columns={[
 *     { title: 'Họ tên', dataIndex: 'fullName', width: 30 },
 *     { title: 'Email', dataIndex: 'email', width: 35 },
 *     { title: 'Trạng thái', dataIndex: 'status', render: (val) => val ? 'Hoạt động' : 'Ngưng' }
 *   ]}
 *   fileName="danh-sach-nhan-vien"
 *   title="DANH SÁCH NHÂN VIÊN"
 *   description="Báo cáo tháng 12/2025"
 * />
 * ```
 */
export const ExcelExportButton: React.FC<ExcelExportProps> = ({
  data,
  columns,
  fileName = 'export',
  title,
  description,
  buttonText = 'Xuất Excel',
  buttonIcon = undefined,
  buttonType = 'primary',
  buttonSize = 'middle',
  buttonStyle,
  disabled,
  sheetName = 'Sheet1',
  onExportStart,
  onExportSuccess,
  onExportError,
  children,
  type,
  style,
  className,
}) => {
  /**
   * Lấy giá trị từ object theo dataIndex (hỗ trợ nested path)
   */
  const getValueByPath = (obj: any, path: string | string[]): any => {
    if (typeof path === 'string') {
      return obj[path];
    }
    // Hỗ trợ nested path như ['user', 'name']
    return path.reduce((acc, key) => acc?.[key], obj);
  };

  /**
   * Xuất dữ liệu ra file Excel
   */
  const handleExport = async () => {
    try {
      onExportStart?.();

      // Tạo workbook và worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Thiết lập metadata
      workbook.creator = 'HRMS System';
      workbook.created = new Date();
      workbook.modified = new Date();

      let currentRow = 1;

      // Thêm tiêu đề chính nếu có
      if (title) {
        const titleRow = worksheet.getRow(currentRow);
        titleRow.getCell(1).value = title;
        titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1F4788' } };
        titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 30;
        
        // Merge cells cho title
        worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
        currentRow++;
      }

      // Thêm mô tả nếu có
      if (description) {
        const descRow = worksheet.getRow(currentRow);
        descRow.getCell(1).value = description;
        descRow.getCell(1).font = { italic: true, size: 11 };
        descRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        descRow.height = 20;
        
        // Merge cells cho description
        worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
        currentRow++;
      }

      // Thêm dòng trống nếu có title hoặc description
      if (title || description) {
        currentRow++;
      }

      // Thêm header row
      const headerRow = worksheet.getRow(currentRow);
      columns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.title;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4788' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      headerRow.height = 25;
      currentRow++;

      // Thêm dữ liệu
      data.forEach((record, recordIndex) => {
        const dataRow = worksheet.getRow(currentRow);
        
        columns.forEach((col, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          
          // Lấy giá trị từ dataIndex
          let value = getValueByPath(record, col.dataIndex);
          
          // Áp dụng render function nếu có
          if (col.render && typeof col.render === 'function') {
            value = col.render(value, record, recordIndex);
          }
          
          // Format giá trị
          if (value === null || value === undefined) {
            cell.value = '';
          } else if (typeof value === 'boolean') {
            cell.value = value ? 'Có' : 'Không';
          } else if (value instanceof Date) {
            cell.value = value;
            cell.numFmt = 'dd/mm/yyyy';
          } else if (typeof value === 'number') {
            cell.value = value;
          } else {
            cell.value = String(value);
          }
          
          // Style cho data cells
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
        
        dataRow.height = 20;
        currentRow++;
      });

      // Thiết lập độ rộng cột
      columns.forEach((col, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = col.width || 20;
      });

      // Tự động điều chỉnh độ rộng cột nếu không có width được chỉ định
      worksheet.columns.forEach((column: any, index: number) => {
        if (!columns[index]?.width) {
          let maxLength = 10;
          const columnCells = column.values as any[];
          
          if (columnCells) {
            columnCells.forEach((cell) => {
              if (cell) {
                const cellLength = String(cell).length;
                if (cellLength > maxLength) {
                  maxLength = cellLength;
                }
              }
            });
          }
          
          column.width = Math.min(maxLength + 2, 50);
        }
      });

      // Thêm footer với thời gian xuất
      currentRow++;
      const footerRow = worksheet.getRow(currentRow);
      footerRow.getCell(1).value = `Xuất ngày: ${new Date().toLocaleString('vi-VN')}`;
      footerRow.getCell(1).font = { italic: true, size: 9 };
      footerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(currentRow, 1, currentRow, columns.length);

      // Tạo file và download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Tạo tên file với timestamp
      const timestamp = new Date().getTime();
      const finalFileName = `${fileName}_${timestamp}.xlsx`;
      
      saveAs(blob, finalFileName);

      onExportSuccess?.();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      onExportError?.(error as Error);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#52c41a', // Màu xanh lá cây của Ant Design
        },
      }}
    >
      <Button
        type={type || buttonType}
        icon={buttonIcon}
        onClick={handleExport}
        size={buttonSize}
        style={style || buttonStyle}
        className={className}
        disabled={disabled || !data || data.length === 0}
      >
        {children || buttonText}
      </Button>
    </ConfigProvider>
  );
};

/**
 * Hook để xuất Excel mà không cần button UI
 * 
 * @example
 * ```tsx
 * const { exportToExcel, isExporting } = useExcelExport();
 * 
 * const handleExport = () => {
 *   exportToExcel({
 *     data: users,
 *     columns: columns,
 *     fileName: 'users-report',
 *     title: 'User Report'
 *   });
 * };
 * ```
 */
export const useExcelExport = () => {
  const [isExporting, setIsExporting] = React.useState(false);

  const exportToExcel = async (options: Omit<ExcelExportProps, 'buttonText' | 'buttonIcon' | 'buttonType' | 'buttonSize' | 'buttonStyle'>) => {
    setIsExporting(true);
    
    try {
      const {
        data,
        columns,
        fileName = 'export',
        title,
        description,
        sheetName = 'Sheet1',
      } = options;

      // Tạo workbook và worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      workbook.creator = 'HRMS System';
      workbook.created = new Date();
      workbook.modified = new Date();

      let currentRow = 1;

      // Thêm tiêu đề chính nếu có
      if (title) {
        const titleRow = worksheet.getRow(currentRow);
        titleRow.getCell(1).value = title;
        titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1F4788' } };
        titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 30;
        worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
        currentRow++;
      }

      // Thêm mô tả nếu có
      if (description) {
        const descRow = worksheet.getRow(currentRow);
        descRow.getCell(1).value = description;
        descRow.getCell(1).font = { italic: true, size: 11 };
        descRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        descRow.height = 20;
        worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
        currentRow++;
      }

      if (title || description) {
        currentRow++;
      }

      // Thêm header row
      const headerRow = worksheet.getRow(currentRow);
      columns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.title;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4788' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      headerRow.height = 25;
      currentRow++;

      // Helper function
      const getValueByPath = (obj: any, path: string | string[]): any => {
        if (typeof path === 'string') {
          return obj[path];
        }
        return path.reduce((acc, key) => acc?.[key], obj);
      };

      // Thêm dữ liệu
      data.forEach((record, recordIndex) => {
        const dataRow = worksheet.getRow(currentRow);
        
        columns.forEach((col, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          let value = getValueByPath(record, col.dataIndex);
          
          if (col.render && typeof col.render === 'function') {
            value = col.render(value, record, recordIndex);
          }
          
          if (value === null || value === undefined) {
            cell.value = '';
          } else if (typeof value === 'boolean') {
            cell.value = value ? 'Có' : 'Không';
          } else if (value instanceof Date) {
            cell.value = value;
            cell.numFmt = 'dd/mm/yyyy';
          } else if (typeof value === 'number') {
            cell.value = value;
          } else {
            cell.value = String(value);
          }
          
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
        
        dataRow.height = 20;
        currentRow++;
      });

      // Thiết lập độ rộng cột
      columns.forEach((col, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = col.width || 20;
      });

      // Footer
      currentRow++;
      const footerRow = worksheet.getRow(currentRow);
      footerRow.getCell(1).value = `Xuất ngày: ${new Date().toLocaleString('vi-VN')}`;
      footerRow.getCell(1).font = { italic: true, size: 9 };
      footerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(currentRow, 1, currentRow, columns.length);

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const timestamp = new Date().getTime();
      const finalFileName = `${fileName}_${timestamp}.xlsx`;
      
      saveAs(blob, finalFileName);

      options.onExportSuccess?.();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      options.onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToExcel, isExporting };
};

export default ExcelExportButton;

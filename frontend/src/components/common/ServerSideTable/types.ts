import { TableProps } from 'antd';
import { ColumnType } from 'antd/es/table';
import { ReactNode } from 'react';

// Loại filter cho cột
export type ColumnFilterType = 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'none';

// Cấu hình cột mở rộng
export interface ServerSideColumnType<T = any> extends Omit<ColumnType<T>, 'filterDropdown' | 'filterIcon'> {
  // Tên field để gửi lên API (mặc định = dataIndex)
  searchField?: string;
  // Loại filter: text, select, date, dateRange, number
  filterType?: ColumnFilterType;
  // Options cho select filter
  filterOptions?: { value: any; label: ReactNode }[];
  // Có cho phép search không (mặc định = true nếu filterType !== 'none')
  searchable?: boolean;
  // Có cho phép sort không (mặc định = true)
  sortable?: boolean;
  // Placeholder cho input search
  searchPlaceholder?: string;
}

// State của table
export interface TableState {
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  sorter: {
    field?: string;
    order?: 'asc' | 'desc';
  };
  filters: Record<string, any>;
  searchValues: Record<string, any>;
}

// Params gửi lên API
export interface TableQueryParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  search_field?: string;
  [key: string]: any;
}

// Response từ API
export interface TableApiResponse<T = any> {
  data: T[];
  total: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  success?: boolean;
}

// Props của ServerSideTable
export interface ServerSideTableProps<T = any> extends Omit<TableProps<T>, 'columns' | 'dataSource' | 'loading' | 'pagination' | 'onChange'> {
  // Columns với config mở rộng
  columns: ServerSideColumnType<T>[];
  // Function gọi API
  // Accept flexible response shapes (some services return {results,total}, others {data,total})
  fetchData: (params: TableQueryParams) => Promise<any>;
  // Row key
  rowKey: string | ((record: T) => string);
  // Default sort field
  defaultSortField?: string;
  // Default sort order
  defaultSortOrder?: 'asc' | 'desc';
  // Default page size
  defaultPageSize?: number;
  // Có hiển thị row selection không
  showSelection?: boolean;
  // Callback khi selection thay đổi
  onSelectionChange?: (selectedKeys: React.Key[], selectedRows: T[]) => void;
  // Disabled row selection condition
  getCheckboxProps?: (record: T) => { disabled?: boolean };
  // Extra action buttons slot
  extraActions?: ReactNode;
  // Refresh trigger - khi thay đổi sẽ reload data
  refreshTrigger?: number;
  // Table title
  tableTitle?: string;
  // Show total
  showTotal?: boolean;
  // Optional callback to receive the current page's data and pagination when loaded
  onDataChange?: (data: T[], pagination: { current: number; pageSize: number; total: number }) => void;
}

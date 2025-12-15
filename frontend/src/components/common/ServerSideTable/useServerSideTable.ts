import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { TableState, TableQueryParams, TableApiResponse } from './types';

interface UseServerSideTableOptions<T> {
  fetchData: (params: TableQueryParams) => Promise<TableApiResponse<T>>;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  defaultPageSize?: number;
  refreshTrigger?: number;
}

export function useServerSideTable<T = any>(options: UseServerSideTableOptions<T>) {
  const {
    fetchData,
    defaultSortField = 'created_at',
    defaultSortOrder = 'desc',
    defaultPageSize = 10,
    refreshTrigger = 0,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  const [tableState, setTableState] = useState<TableState>({
    pagination: {
      current: 1,
      pageSize: defaultPageSize,
      total: 0,
    },
    sorter: {
      field: defaultSortField,
      order: defaultSortOrder,
    },
    filters: {},
    searchValues: {},
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const buildQueryParams = useCallback((): TableQueryParams => {
    const { pagination, sorter, filters, searchValues } = tableState;

    const params: TableQueryParams = {
      page: pagination.current,
      limit: pagination.pageSize,
      // include pageSize for backends that expect that param name
      pageSize: pagination.pageSize,
    };

    if (sorter.field) params.sort = sorter.field;
    if (sorter.order) params.order = sorter.order;
    // include sortField/sortOrder for backends that expect those names
    if (sorter.field) params.sortField = sorter.field;
    if (sorter.order) params.sortOrder = sorter.order;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });

    Object.entries(searchValues).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key.endsWith('_range') && typeof value === 'string' && value.includes(',')) {
          const [start, end] = value.split(',');
          const baseKey = key.replace('_range', '');
          params[`${baseKey}From`] = start;
          params[`${baseKey}To`] = end;
        } else {
          params[key] = value;
        }
      }
    });

    return params;
  }, [tableState]);

  const loadData = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      setLoading(true);
      try {
        const params = buildQueryParams();
        const response: any = await fetchData(params);

        if (!isMountedRef.current) return;

        let payload: any;
        if (Array.isArray(response)) {
          payload = { data: response, total: response.length };
        } else if (response && typeof response === 'object') {
          if ('status' in response && 'data' in response) {
            payload = response.data;
          } else if ('data' in response && ('pagination' in response || 'total' in response || 'success' in response)) {
            payload = response;
          } else if ('data' in response) {
            payload = response.data;
          } else {
            payload = response;
          }
        } else {
          payload = response;
        }

        const rows = Array.isArray(payload) ? payload : (payload?.results ?? payload?.data ?? payload?.items ?? []);
        const total = payload?.total ?? payload?.pagination?.total ?? (Array.isArray(rows) ? rows.length : 0);

        setData(Array.isArray(rows) ? rows : []);
        setTableState(prev => ({
          ...prev,
          pagination: {
            ...prev.pagination,
            total: typeof total === 'number' ? total : 0,
          },
        }));
        // loadData complete
      } catch (error: any) {
        if (isMountedRef.current) {
          message.error(error?.message || 'Lỗi khi tải dữ liệu');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, 150);
  }, [buildQueryParams, fetchData]);

  // tableState change (no-op logging in production)
  useEffect(() => {
    // intentionally left blank
  }, [tableState]);

  useEffect(() => {
    loadData();
  }, [
    tableState.pagination.current,
    tableState.pagination.pageSize,
    tableState.sorter.field,
    tableState.sorter.order,
    tableState.filters,
    tableState.searchValues,
    refreshTrigger,
  ]);

  useEffect(() => {
    // pagination state changed
  }, [tableState.pagination.current, tableState.pagination.pageSize, tableState.pagination.total]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    setTableState(prev => {
      const next = {
        ...prev,
        pagination: {
          ...prev.pagination,
          current: page,
          pageSize,
        },
      } as TableState;
      // computed next state
      return next;
    });
  }, []);

  const handleSorterChange = useCallback((field?: string, order?: 'asc' | 'desc' | undefined) => {
    setTableState(prev => ({
      ...prev,
      sorter: {
        field: field === undefined ? undefined : field,
        order: order === undefined ? undefined : order,
      },
      pagination: {
        ...prev.pagination,
        current: 1
      }
    }));
  }, []);

  const handleFilterChange = useCallback((field: string, value: any) => {
    setTableState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value,
      },
      pagination: {
        ...prev.pagination,
        current: 1,
      },
    }));
  }, []);

  const handleSearchChange = useCallback((field: string, value: any) => {
    setTableState(prev => ({
      ...prev,
      searchValues: {
        ...prev.searchValues,
        [field]: value,
      },
      pagination: {
        ...prev.pagination,
        current: 1,
      },
    }));
  }, []);

  const handleSelectionChange = useCallback((keys: React.Key[], rows: T[]) => {
    setSelectedRowKeys(keys);
    setSelectedRows(rows);
  }, []);

  const clearFilters = useCallback(() => {
    setTableState(prev => ({
      ...prev,
      filters: {},
      searchValues: {},
      pagination: {
        ...prev.pagination,
        current: 1,
      },
    }));
  }, []);

  const reload = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    tableState,
    selectedRowKeys,
    selectedRows,
    handlePaginationChange,
    handleSorterChange,
    handleFilterChange,
    handleSearchChange,
    handleSelectionChange,
    clearFilters,
    reload,
    setSelectedRowKeys,
    setSelectedRows,
  };
}

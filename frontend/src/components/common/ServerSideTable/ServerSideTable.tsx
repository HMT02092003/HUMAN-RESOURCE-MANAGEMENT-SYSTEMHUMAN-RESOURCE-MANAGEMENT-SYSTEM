"use client";

import React, { useMemo } from 'react';
import { Table, Input, Button, Space, Select, DatePicker } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnType, SortOrder } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { ServerSideTableProps, ServerSideColumnType, ColumnFilterType } from './types';
import { useServerSideTable } from './useServerSideTable';

const { RangePicker } = DatePicker;

/**
 * ServerSideTable - Wrapper component for Antd Table with server-side features
 * - Adds search/filter/sort UI per column
 * - Integrates with `useServerSideTable` hook for API calls
 * - Preserves backwards-compatible render signature by passing `pagination` as 4th arg
 */
function ServerSideTable<T extends Record<string, any> = any>(props: ServerSideTableProps<T>) {
  const {
    columns: columnConfigs,
    fetchData,
    rowKey,
    defaultSortField = 'created_at',
    defaultSortOrder = 'desc',
    defaultPageSize = 10,
    showSelection = false,
    onSelectionChange,
    getCheckboxProps,
    refreshTrigger,
    showTotal = true,
    ...restProps
  } = props;

  const {
    data,
    loading,
    tableState,
    selectedRowKeys,
    handlePaginationChange,
    handleSorterChange,
    handleFilterChange,
    handleSearchChange,
    handleSelectionChange,
  } = useServerSideTable<T>({
    fetchData,
    defaultSortField,
    defaultSortOrder,
    defaultPageSize,
    refreshTrigger,
  });

  const createFilterDropdown = (
    column: ServerSideColumnType<T>,
    searchField: string,
    filterType: ColumnFilterType
  ) => {
    const currentValue = tableState.searchValues[searchField] ?? tableState.filters[searchField];

    switch (filterType) {
      case 'text':
        return ({ confirm }: any) => {
          let localValue: any = currentValue ?? '';
          return (
            <div style={{ padding: 8, minWidth: 200 }}>
              <Input
                placeholder={column.searchPlaceholder || `Tìm ${column.title}`}
                defaultValue={currentValue ?? undefined}
                onChange={(e) => { localValue = e.target.value; }}
                onPressEnter={() => {
                  handleSearchChange(searchField, localValue);
                  confirm();
                }}
                style={{ marginBottom: 8, display: 'block' }}
                allowClear
              />
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    localValue = '';
                    handleSearchChange(searchField, '');
                    confirm();
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    handleSearchChange(searchField, localValue);
                    confirm();
                  }}
                >
                  Tìm
                </Button>
              </Space>
            </div>
          );
        };

      case 'select':
        return ({ confirm }: any) => {
          let localVal: any = currentValue;
          return (
            <div style={{ padding: 8, minWidth: 200 }}>
              <Select
                style={{ width: '100%', marginBottom: 8 }}
                placeholder={column.searchPlaceholder || `Chọn ${column.title}`}
                defaultValue={currentValue}
                onChange={(value) => { localVal = value; }}
                allowClear
                options={column.filterOptions || []}
              />
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    localVal = undefined;
                    handleFilterChange(searchField, undefined);
                    confirm();
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    handleFilterChange(searchField, localVal);
                    confirm();
                  }}
                >
                  Tìm
                </Button>
              </Space>
            </div>
          );
        };

      case 'date': {
        return ({ confirm }: any) => {
          let localDate = currentValue ? dayjs(currentValue) : null;
          
          return (
            <div style={{ padding: 8, minWidth: 200 }}>
              <DatePicker
                style={{ width: '100%', marginBottom: 8 }}
                format="DD/MM/YYYY"
                defaultValue={localDate}
                onChange={(date) => {
                  localDate = date;
                }}
                allowClear
              />
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    handleSearchChange(searchField, undefined);
                    confirm();
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    handleSearchChange(searchField, localDate?.format('YYYY-MM-DD'));
                    confirm();
                  }}
                >
                  Tìm
                </Button>
              </Space>
            </div>
          );
        };
      }

      case 'dateRange': {
        const rangeKey = `${searchField}_range`;
        const rangeValue = tableState.searchValues[rangeKey];
        const parsedRange = rangeValue?.split(',');

        return ({ confirm }: any) => {
          let localDates: [dayjs.Dayjs, dayjs.Dayjs] | null = parsedRange 
            ? [dayjs(parsedRange[0]), dayjs(parsedRange[1])] 
            : null;

          return (
            <div style={{ padding: 8, minWidth: 280 }}>
              <RangePicker
                style={{ width: '100%', marginBottom: 8 }}
                format="DD/MM/YYYY"
                defaultValue={localDates}
                onChange={(dates) => {
                  localDates = dates as [dayjs.Dayjs, dayjs.Dayjs] | null;
                }}
                allowClear
              />
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    handleSearchChange(rangeKey, undefined);
                    confirm();
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    if (localDates && localDates[0] && localDates[1]) {
                      const value = `${localDates[0].format('YYYY-MM-DD')},${localDates[1].format('YYYY-MM-DD')}`;
                      handleSearchChange(rangeKey, value);
                    } else {
                      handleSearchChange(rangeKey, undefined);
                    }
                    confirm();
                  }}
                >
                  Tìm
                </Button>
              </Space>
            </div>
          );
        };
      }
      
      default:
        return undefined;
    }
  };

  const processedColumns = useMemo(() => {
    return columnConfigs.map((col): ColumnType<T> => {
      const searchField = col.searchField || (Array.isArray(col.dataIndex)
        ? col.dataIndex.join('.')
        : (col.dataIndex as string));

      const filterType = col.filterType ?? 'text';
      const sortable = col.sortable !== false;
      const searchable = col.searchable !== false && filterType !== 'none';

      const processedCol: ColumnType<T> = { ...col };

      if (sortable && searchField) {
        processedCol.sorter = true;
        // Determine the actual dataIndex string (could be the real DB field)
        const dataIndexStr = Array.isArray(col.dataIndex) ? col.dataIndex.join('.') : (col.dataIndex as string);
        const activeField = tableState.sorter.field;
        const isActive = activeField === searchField || activeField === dataIndexStr;
        processedCol.sortOrder = (
          isActive
            ? (tableState.sorter.order === 'asc' ? 'ascend' : 'descend')
            : undefined
        ) as SortOrder;
      }

      if (searchable && searchField) {
        processedCol.filterDropdown = createFilterDropdown(col, searchField, filterType);

        const hasValue = filterType === 'dateRange'
          ? !!tableState.searchValues[`${searchField}_range`]
          : !!(tableState.searchValues[searchField] || tableState.filters[searchField]);

        processedCol.filterIcon = () => (
          filterType === 'select'
            ? <FilterOutlined style={{ color: hasValue ? '#1890ff' : undefined }} />
            : <SearchOutlined style={{ color: hasValue ? '#1890ff' : undefined }} />
        );
      }

      return processedCol;
    });
  }, [columnConfigs, tableState, handleSearchChange, handleFilterChange]);

  const finalColumns = useMemo(() => {
    return processedColumns.map((col) => {
      if (col.render && typeof col.render === 'function') {
        const origRender = col.render as any;
        const wrappedRender = (value: any, record: any, index: number) => {
          const paginationInfo = {
            current: tableState.pagination.current,
            pageSize: tableState.pagination.pageSize,
          };
          return origRender(value, record, index, paginationInfo);
        };
        return { ...col, render: wrappedRender } as ColumnType<T>;
      }
      return col;
    });
  }, [processedColumns, tableState.pagination.current, tableState.pagination.pageSize]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    console.log('[ServerSideTable] onChange pagination:', pagination, 'sorter:', sorter);
    if (pagination.current !== tableState.pagination.current ||
        pagination.pageSize !== tableState.pagination.pageSize) {
      handlePaginationChange(pagination.current, pagination.pageSize);
    }

    // Normalize sorter.field: Antd may pass an array for nested dataIndex
    const rawField = sorter && sorter.field;
    let normalizedField: string | undefined = undefined;
    if (Array.isArray(rawField)) {
      normalizedField = rawField.join('.');
    } else if (typeof rawField === 'string') {
      normalizedField = rawField;
    }

    if (sorter) {
      const order = sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : undefined;
      const currentSorter = tableState.sorter || {};

      if (normalizedField && order) {
        // Only update sorter (and reset to page 1) when the sorter actually changed
        if (currentSorter.field !== normalizedField || currentSorter.order !== order) {
          handleSorterChange(normalizedField as string, order as 'asc' | 'desc');
        }
      } else if (!order) {
        // If there was an active sorter previously, clear it
        if (currentSorter.field !== undefined || currentSorter.order !== undefined) {
          handleSorterChange(undefined as any, undefined as any);
        }
      }
    }
  };

  const rowSelection = showSelection
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[], rows: T[]) => {
          handleSelectionChange(keys, rows);
          onSelectionChange?.(keys, rows);
        },
        getCheckboxProps,
      }
    : undefined;

  return (
    // Debug: log the pagination props passed to AntD Table on each render
    <>
      {console.log('[ServerSideTable] render pagination prop ->', tableState.pagination)}
      <Table<T>
        {...restProps}
        columns={finalColumns}
        dataSource={data}
        loading={loading}
        rowKey={rowKey}
        rowSelection={rowSelection}
        onChange={handleTableChange}
        pagination={{
          current: tableState.pagination.current,
          pageSize: tableState.pagination.pageSize,
          total: tableState.pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: showTotal ? (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi` : undefined,
        }}
      />
    </>
  );
}

export default ServerSideTable;


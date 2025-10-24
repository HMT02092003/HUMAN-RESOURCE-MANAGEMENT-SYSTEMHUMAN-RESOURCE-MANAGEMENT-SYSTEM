import React from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const getNestedValue = (obj: any, path: string) => {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  return parts.reduce((acc: any, p: string) => (acc ? acc[p] : undefined), obj);
};

export const getColumnSearchProps = (dataIndex: string, placeholder: string = 'Tìm kiếm...') => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: any) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        placeholder={placeholder}
        value={selectedKeys && selectedKeys[0] ? selectedKeys[0] : ''}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => confirm()}
        style={{ marginBottom: 8, display: 'block' }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() => confirm()}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90 }}
        >
          Tìm
        </Button>
        <Button
          onClick={() => clearFilters && clearFilters()}
          size="small"
          style={{ width: 90 }}
        >
          Xóa
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => close?.()}
        >
          Đóng
        </Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered: boolean) => (
    <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
  ),
  onFilter: (value: any, record: any) => {
    try {
      const v = String(value || '').toLowerCase();
      const rv = getNestedValue(record, dataIndex) ?? '';
      return String(rv).toLowerCase().includes(v);
    } catch (e) {
      return false;
    }
  }
});

export default getColumnSearchProps;

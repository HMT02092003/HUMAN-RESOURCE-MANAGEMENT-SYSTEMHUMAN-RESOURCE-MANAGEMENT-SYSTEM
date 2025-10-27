"use client";

import React, { useEffect, useState } from 'react';
import { Button, Table, message, Space, Row, Col, Modal } from 'antd';
import salaryService from '@/service/salaryService';
import { useRouter } from 'next/navigation';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

const AdminAllowanceList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const router = useRouter();

  const { confirm } = Modal;

  const fetchData = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const res = await salaryService.listAllowanceTypes({ page: p, pageSize: ps });
      // backend returns { data, total } for paged list
      const list = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
      const t = (res && (res.total != null)) ? res.total : list.length;
      setData(list);
      setTotal(Number(t) || 0);
      setPage(p);
      setPageSize(ps);
    } catch (err) {
      message.error('Không thể tải danh sách phụ cấp');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(1, pageSize); }, []);

  const handleEdit = (id: number) => {
    router.push(`/salary/allowances/edit/${id}`);
  };

  const handleDeleteOne = (id: number) => {
    confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa bản ghi này?',
      onOk: async () => {
        try {
          setLoading(true);
          await salaryService.removeAllowanceType(id);
          message.success('Xóa thành công');
          fetchData();
        } catch (err) {
          message.error('Xóa thất bại');
        } finally { setLoading(false); }
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
          setLoading(true);
          // perform sequential deletes; can be optimized to parallel if backend supports
          for (const k of selectedRowKeys) {
            await salaryService.removeAllowanceType(k);
          }
          message.success('Xóa thành công');
          setSelectedRowKeys([]);
          fetchData();
        } catch (err) {
          message.error('Xóa thất bại');
        } finally { setLoading(false); }
      }
    });
  };

  const columns = [
    {
      title: 'Tên phụ cấp',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Tiền phụ cấp',
      dataIndex: 'default_amount',
      key: 'default_amount',
      render: (_: any, r: any) => r.default_amount || '-'
    },
    {
      title: 'Có tính thuế TNCN',
      dataIndex: 'is_taxable',
      key: 'is_taxable',
      render: (_: any, r: any) => r.is_taxable ? 'Có' : 'Không' 
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Hành động', key: 'actions', render: (_: any, record: any) => (
        <div>
          <Button type="text" onClick={() => handleEdit(record.id)}><EditOutlined /></Button>
          <Button type="text" danger onClick={() => handleDeleteOne(record.id)}><DeleteOutlined /></Button>
        </div>
      )
    }
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" onClick={() => router.push('/salary/allowances/create')}><PlusOutlined /> Tạo mới</Button>
          {selectedRowKeys.length > 0 && (
            <Button danger onClick={handleBulkDelete} disabled={selectedRowKeys.length === 0}>Xóa đã chọn</Button>
          )}
        </Space>
      </Col>

      <Col span={24}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          rowKey={(r: any) => r.id}
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            onChange: (p, ps) => fetchData(p, ps as number),
          }}
        />
      </Col>
    </Row>
  );
};

export default AdminAllowanceList;

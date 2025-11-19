'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  message,
  Tabs,
  Calendar,
  Switch,
  Badge,
  Popconfirm
} from 'antd';
import type { CalendarProps } from 'antd';
import { PlusOutlined, CalendarOutlined, UnorderedListOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const ShiftRegistrationManagement = () => {
  const [bulkForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [allowDifferent, setAllowDifferent] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const loadConfigurations = async () => {
    try {
      const response = await shiftService.getAllShiftConfigurations();
      if (response.data?.success) {
        setConfigurations(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách ca');
    }
  };

  const loadRegistrations = async (filters?: { status?: string }) => {
    try {
      setLoading(true);
      const response = await shiftService.getMyShiftRegistrations(filters);
      if (response.data?.success) {
        setRegistrations(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  // initial load on mount
  useEffect(() => {
    loadConfigurations();
    loadRegistrations();
  }, []);

  // When switching to the calendar tab, fetch approved schedules so calendar highlights only approved ones.
  useEffect(() => {
    if (activeTab === 'calendar') {
      // request only approved schedules to show on calendar
      loadRegistrations({ status: 'approved' });
    } else if (activeTab === 'list') {
      // load full list when returning to list view
      loadRegistrations();
    }
  }, [activeTab]);

  // Fetch a single registration by id and open edit modal
  const openEditRegistration = async (id: number) => {
    try {
      setLoading(true);
      const resp = await shiftService.getShiftRegistrationById(id);
      if (resp.data?.success) {
        setEditingRecord(resp.data.data);
        setEditModalVisible(true);
      } else {
        message.error(resp.data?.message || 'Không thể lấy thông tin lịch');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi lấy thông tin lịch');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegistration = async (values: any) => {
    if (!editingRecord) return;
    try {
      setLoading(true);
      const resp = await shiftService.updateShiftRegistration(editingRecord.id, values);
      if (resp.data?.success) {
        message.success('Cập nhật thành công');
        setEditModalVisible(false);
        setEditingRecord(null);
        loadRegistrations();
      } else {
        message.error(resp.data?.message || 'Không thể cập nhật');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editingRecord) {
      editForm.setFieldsValue({
        date: editingRecord.date ? dayjs(editingRecord.date) : undefined,
        shift_id: editingRecord.shift_id,
        notes: editingRecord.notes
      });
    } else {
      editForm.resetFields();
    }
  }, [editingRecord]);

  // Bulk delete (calls backend bulk delete) - also used for single-delete via passing array of one id
  const handleBulkDelete = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một đăng ký để xóa');
      return;
    }

    try {
      setLoading(true);
      const ids = selectedRowKeys.map(k => Number(k)).filter(n => !isNaN(n));
      const resp = await shiftService.bulkDeleteShiftRegistrations(ids);
      if (resp.data?.success) {
        message.success(resp.data.message || 'Xóa thành công');
        setSelectedRowKeys([]);
        loadRegistrations();
      } else {
        message.error(resp.data?.message || 'Không thể xóa');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBulkModal = () => {
    bulkForm.resetFields();
    setSelectedDates([]);
    setBulkModalVisible(true);
  };

  // single registration flow removed — use bulk modal for all registrations

  const handleBulkSubmit = async () => {
    try {
      await bulkForm.validateFields();

      const items = bulkForm.getFieldValue('items') || [];
      if (!items.length) {
        message.warning('Vui lòng thêm ít nhất một dòng (ngày + ca)');
        return;
      }

      setLoading(true);
      // Submit each line individually because backend bulk endpoint expects one shift_id + dates array
      const results = await Promise.allSettled(items.map((it: any) => {
        const payload = {
          shift_id: it.shift_id,
          date: it.date ? it.date.format('YYYY-MM-DD') : it.date,
          notes: it.notes
        };
        return shiftService.createShiftRegistration(payload);
      }));

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      message.success(`Đã đăng ký ${successCount} ca thành công${failCount ? `, ${failCount} ca thất bại` : ''}`);
      setBulkModalVisible(false);
      loadRegistrations();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      setLoading(true);
      await shiftService.cancelShiftRegistration(id);
      message.success('Đã hủy đăng ký');
      loadRegistrations();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể hủy đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const dateCellRender: CalendarProps<Dayjs>['cellRender'] = (date: Dayjs) => {
  const dateStr = date.format('YYYY-MM-DD');
  // Normalize registration dates to local YYYY-MM-DD to avoid timezone/time part mismatches
  const dayRegistrations = registrations.filter(r => dayjs(r.date).format('YYYY-MM-DD') === dateStr);

    const isSelected = selectedDates.includes(dateStr);

    return (
      <div style={{ position: 'relative', height: '100%' }}>
        {isSelected && (
          <Badge status="processing" style={{ position: 'absolute', top: 0, right: 0 }} />
        )}
        <div style={{ marginTop: 4 }}>
          {dayRegistrations.map(reg => (
            <div key={reg.id} style={{ marginBottom: 2 }}>
              <Tag
                color={shiftService.getShiftStatusColor(reg.status)}
                style={{ fontSize: 10, padding: '0 4px', marginRight: 0 }}
              >
                {reg.shift_name || 'Ca'}
              </Tag>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: 'Ngày làm việc',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Ca làm việc',
      key: 'shift',
      render: (_: any, record: any) => (
        <div style={{display:'flex', flexDirection:"column" }}>
          <span>{record.shift_name}</span>
          <Tag color="blue">{record.start_time?.substring(0, 5)} - {record.end_time?.substring(0, 5)}</Tag>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={shiftService.getShiftStatusColor(status)}>
          {shiftService.getShiftStatusLabel(status)}
        </Tag>
      )
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
                <Button type="text" icon={<EditOutlined />} onClick={() => openEditRegistration(record.id)} disabled={record.status !== 'pending'} />
          <Popconfirm title={`Xác nhận xóa lịch ${record.id}?`} onConfirm={async () => { await shiftService.bulkDeleteShiftRegistrations([record.id]); loadRegistrations(); }} okText="Xóa" cancelText="Hủy">
            <Button type="text" danger icon={<DeleteOutlined />} disabled={record.status !== 'pending'} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={handleOpenBulkModal}
            >
              Đăng ký nhiều ngày
            </Button>
          </Space>
        </Col>

        <Col span={24}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  <UnorderedListOutlined />
                  Danh sách đăng ký
                </span>
              }
              key="list"
            >
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {selectedRowKeys.length > 0 && (
                    <Space>
                      <Button danger onClick={handleBulkDelete}>Xóa {selectedRowKeys.length} đã chọn</Button>
                    </Space>
                  )}
                </div>
              </div>

              <Table
                columns={columns}
                dataSource={registrations}
                rowKey="id"
                loading={loading}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                  // disable checkbox for already-approved schedules
                  getCheckboxProps: (record: any) => ({ disabled: record.status === 'approved' })
                }}
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Tổng ${total} đăng ký`
                }}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <CalendarOutlined />
                  Lịch ca làm việc
                </span>
              }
              key="calendar"
            >
              <Calendar
                cellRender={dateCellRender as any}
              />
            </TabPane>
          </Tabs>
        </Col>
      </Row>

      {/* Single registration removed. Use bulk modal below for multi-day registrations (one shift per day) */}

      {/* Modal đăng ký nhiều ngày (primary) */}
      <Modal
        title="Đăng ký ca nhiều ngày"
        open={bulkModalVisible}
        onCancel={() => setBulkModalVisible(false)}
        onOk={handleBulkSubmit}
        confirmLoading={loading}
        width={800}
      >
        <Form form={bulkForm} layout="vertical">
          {/* Always use per-day entries: users add rows with date + shift */}
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                    <Form.Item {...field} name={[field.name, 'date']} rules={[{ required: true, message: 'Chọn ngày' }]}>
                      <DatePicker format="DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item {...field} name={[field.name, 'shift_id']} rules={[{ required: true, message: 'Chọn ca' }]}>
                      <Select style={{ width: 240 }}>
                        {configurations.map(c => (
                          <Select.Option key={c.id} value={c.id}>{c.name} ({c.start_time?.substring(0, 5)} - {c.end_time?.substring(0, 5)})</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item {...field} name={[field.name, 'notes']}>
                      <Input placeholder="Ghi chú (tùy chọn)" />
                    </Form.Item>

                    <Button danger onClick={() => remove(field.name)}>Xóa</Button>
                  </Space>
                ))}

                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm dòng</Button>
                </Form.Item>
              </div>
            )}
          </Form.List>

          <Form.Item label="Gợi ý: bạn có thể thêm nhiều dòng, mỗi dòng là 1 ngày + 1 ca">
            <div style={{ color: '#888' }}>Mỗi dòng chứa ngày, chọn ca tương ứng và ghi chú (nếu cần).</div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit single registration modal */}
      <Modal
        title={`Chỉnh sửa đăng ký ${editingRecord?.id ?? ''}`}
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingRecord(null); }}
        onOk={() => { editForm.validateFields().then(vals => handleUpdateRegistration({
          date: vals.date ? vals.date.format('YYYY-MM-DD') : vals.date,
          shift_id: vals.shift_id,
          notes: vals.notes
        })); }}
        confirmLoading={loading}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="date" label="Ngày" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="shift_id" label="Ca" rules={[{ required: true, message: 'Chọn ca' }]}>
            <Select>
              {configurations.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name} ({c.start_time?.substring(0,5)} - {c.end_time?.substring(0,5)})</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ShiftRegistrationManagement;

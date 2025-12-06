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
  Switch,
  Badge,
  Popconfirm,
  Typography
} from 'antd';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { PlusOutlined, CalendarOutlined, UnorderedListOutlined, EditOutlined, DeleteOutlined, CoffeeOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import shiftService from '@/service/shiftService';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

const { Text, Title } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// Màu nền cho các loại ca
const SHIFT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Hành chính (xanh dương nhạt)
  'hành chính': { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' },
  // Ca sáng (cam nhạt)
  'ca sáng': { bg: '#fff7e6', border: '#ffd591', text: '#fa8c16' },
  'sáng': { bg: '#fff7e6', border: '#ffd591', text: '#fa8c16' },
  // Ca chiều (tím nhạt)
  'ca chiều': { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' },
  'chiều': { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' },
  // Ca tối/đêm (xanh đậm)
  'ca tối': { bg: '#e6fffb', border: '#87e8de', text: '#13c2c2' },
  'tối': { bg: '#e6fffb', border: '#87e8de', text: '#13c2c2' },
  'ca đêm': { bg: '#1f1f1f', border: '#434343', text: '#ffffff' },
  'đêm': { bg: '#1f1f1f', border: '#434343', text: '#ffffff' },
  // Ca gãy (xanh lá)
  'ca gãy': { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' },
  'gãy': { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' },
  // Nghỉ ngày (xám)
  'nghỉ ngày': { bg: '#fafafa', border: '#d9d9d9', text: '#8c8c8c' },
  'nghỉ': { bg: '#fafafa', border: '#d9d9d9', text: '#8c8c8c' },
  // Default (xanh nhạt)
  'default': { bg: '#f0f5ff', border: '#adc6ff', text: '#2f54eb' }
};

// Hàm lấy màu theo tên ca
const getShiftColor = (shiftName: string) => {
  const name = shiftName.toLowerCase();
  for (const [key, colors] of Object.entries(SHIFT_COLORS)) {
    if (name.includes(key)) {
      return colors;
    }
  }
  return SHIFT_COLORS['default'];
};

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
  const [holidays, setHolidays] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState<Dayjs>(dayjs());

  // Load holidays cho tháng hiện tại
  const loadHolidays = async (date: Dayjs) => {
    try {
      const response = await shiftService.getHolidays(date.year(), date.month() + 1);
      if (response.data?.success) {
        setHolidays(response.data.data);
      }
    } catch (error) {
      console.error('Không thể tải danh sách ngày lễ:', error);
    }
  };

  // Helper để hiển thị tên ca (fix các tên bị thiếu dấu và format dài)
  const formatShiftDisplay = (name?: string, start?: string, end?: string) => {
    if (!name) return '';
    // fix common missing-accent case for 'Nghỉ ngày' (some seed data may contain 'Ngh?')
    let nm = name;
    if (/ngh[íi\?]/i.test(nm) || /ngh/i.test(nm) && /ngày/i.test(nm) === false && nm.trim().toLowerCase().startsWith('ngh')) {
      nm = nm.replace(/ngh[íi\?]/i, 'Nghỉ').replace(/ng\s*\?/i, 'Nghỉ');
    }
    // ensure proper spacing and format
    const timePart = start && end ? ` (${start.substring(0,5)} - ${end.substring(0,5)})` : '';
    return `${nm}${timePart}`;
  };

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
      loadHolidays(calendarMonth);
    } else if (activeTab === 'list') {
      // load full list when returning to list view
      loadRegistrations();
    }
  }, [activeTab]);

  // Load holidays khi đổi tháng trên calendar
  useEffect(() => {
    if (activeTab === 'calendar') {
      loadHolidays(calendarMonth);
    }
  }, [calendarMonth]);

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

  // Helper: Kiểm tra ngày có phải ngày lễ không
  const getHolidayForDate = (dateStr: string): any | null => {
    return holidays.find(h => {
      const startDate = dayjs(h.start_date).format('YYYY-MM-DD');
      const endDate = dayjs(h.end_date).format('YYYY-MM-DD');
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  // Helper: Kiểm tra có phải cuối tuần không (Thứ 7 hoặc Chủ nhật)
  const isWeekendDate = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Chủ nhật, 6 = Thứ 7
  };

  // Lấy thông tin ca cho ngày
  const getRegistrationForDate = (dateStr: string) => {
    return registrations.find(r => dayjs(r.date).format('YYYY-MM-DD') === dateStr);
  };

  // Render nội dung cho mỗi ô ngày trên calendar
  const renderTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const registration = getRegistrationForDate(dateStr);
    const holiday = getHolidayForDate(dateStr);
    const weekend = isWeekendDate(date);
    
    // Hiển thị ca mặc định (Hành chính) nếu không có đăng ký, không lễ, không cuối tuần
    const showDefaultShift = !registration && !holiday && !weekend;
    
    return (
      <div style={{ marginTop: 2, fontSize: 10, lineHeight: 1.3 }}>
        {holiday && (
          <div style={{ color: '#ff4d4f', fontWeight: 600 }}>
            🎉 {holiday.name}
          </div>
        )}
        {registration && (
          <div style={{ 
            color: getShiftColor(registration.shift_name || '').text,
            fontWeight: 500
          }}>
            {registration.shift_name}
          </div>
        )}
        {showDefaultShift && (
          <div style={{ color: '#8c8c8c', fontStyle: 'italic' }}>
            Hành chính
          </div>
        )}
      </div>
    );
  };

  // Style cho ô ngày - trả về className
  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const registration = getRegistrationForDate(dateStr);
    const holiday = getHolidayForDate(dateStr);
    const weekend = isWeekendDate(date);
    const isSelected = selectedDates.includes(dateStr);
    
    let classes = [];
    
    if (isSelected) classes.push('shift-tile-selected');
    if (holiday) classes.push('shift-tile-holiday');
    if (weekend && !holiday) classes.push('shift-tile-weekend');
    if (registration) {
      const shiftName = registration.shift_name?.toLowerCase() || '';
      if (shiftName.includes('hành chính')) classes.push('shift-tile-office');
      else if (shiftName.includes('sáng')) classes.push('shift-tile-morning');
      else if (shiftName.includes('chiều')) classes.push('shift-tile-afternoon');
      else if (shiftName.includes('tối') || shiftName.includes('đêm')) classes.push('shift-tile-night');
      else if (shiftName.includes('gãy')) classes.push('shift-tile-split');
      else if (shiftName.includes('nghỉ')) classes.push('shift-tile-dayoff');
      else classes.push('shift-tile-default');
    }
    
    return classes.join(' ');
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string) => (
        <div style={{ fontWeight: 500 }}>
          {dayjs(date).format('DD/MM/YYYY')}
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            {dayjs(date).format('dddd').charAt(0).toUpperCase() + dayjs(date).format('dddd').slice(1)}
          </div>
        </div>
      )
    },
    {
      title: 'Ca làm việc',
      key: 'shift',
      width: 180,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{record.shift_name}</div>
          <Tag color="blue" style={{ fontSize: 11 }}>
            {record.start_time?.substring(0, 5)} - {record.end_time?.substring(0, 5)}
          </Tag>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={shiftService.getShiftStatusColor(status)} style={{ fontWeight: 500 }}>
          {shiftService.getShiftStatusLabel(status)}
        </Tag>
      )
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || <span style={{ color: '#bfbfbf' }}>—</span>
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => (
        <span style={{ fontSize: 12, color: '#595959' }}>
          {dayjs(date).format('DD/MM/YYYY HH:mm')}
        </span>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => openEditRegistration(record.id)} 
            disabled={record.status !== 'pending'}
            title="Chỉnh sửa"
          />
          <Popconfirm 
            title="Xác nhận xóa đăng ký này?" 
            onConfirm={async () => { await shiftService.bulkDeleteShiftRegistrations([record.id]); loadRegistrations(); }} 
            okText="Xóa" 
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} disabled={record.status !== 'pending'} title="Xóa" />
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
              {/* Custom Navigation */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16,
                padding: '12px 16px',
                background: '#fafafa',
                borderRadius: 8
              }}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => setCalendarMonth(calendarMonth.subtract(1, 'month'))}
                >
                  Tháng trước
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                  Tháng {calendarMonth.format('MM/YYYY')}
                </Title>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => setCalendarMonth(calendarMonth.add(1, 'month'))}
                >
                  Tháng sau
                </Button>
              </div>

              {/* Legend */}
              <div style={{ 
                marginBottom: 16, 
                padding: 12, 
                background: '#fff', 
                borderRadius: 8,
                border: '1px solid #d9d9d9'
              }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>Chú thích:</Text>
                <Row gutter={[8, 8]}>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Hành chính</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Ca Sáng</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Ca Chiều</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#e6fffb', border: '1px solid #87e8de', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Ca Tối</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Ca Gãy</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Nghỉ ngày</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Ngày lễ</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: 16, height: 16, background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 4, marginRight: 8 }} />
                      <Text style={{ fontSize: 12 }}>Cuối tuần</Text>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* React Calendar */}
              <style jsx global>{`
                .shift-calendar .react-calendar {
                  width: 100%;
                  border: 1px solid #d9d9d9;
                  border-radius: 8px;
                  font-family: inherit;
                }
                .shift-calendar .react-calendar__tile {
                  height: 80px;
                  padding: 8px 4px;
                  vertical-align: top;
                }
                .shift-calendar .react-calendar__tile--now {
                  background: #e6f7ff !important;
                }
                .shift-calendar .shift-tile-selected {
                  border: 2px solid #1890ff !important;
                }
                .shift-calendar .shift-tile-holiday {
                  background: #fff1f0 !important;
                }
                .shift-calendar .shift-tile-weekend {
                  background: #f5f5f5 !important;
                }
                .shift-calendar .shift-tile-office {
                  background: #e6f7ff !important;
                }
                .shift-calendar .shift-tile-morning {
                  background: #fff7e6 !important;
                }
                .shift-calendar .shift-tile-afternoon {
                  background: #f9f0ff !important;
                }
                .shift-calendar .shift-tile-night {
                  background: #e6fffb !important;
                }
                .shift-calendar .shift-tile-split {
                  background: #f6ffed !important;
                }
                .shift-calendar .shift-tile-dayoff {
                  background: #fafafa !important;
                }
                .shift-calendar .shift-tile-default {
                  background: #f0f5ff !important;
                }
                .shift-calendar .react-calendar__navigation button {
                  display: none;
                }
                .shift-calendar .react-calendar__navigation {
                  display: none;
                }
              `}</style>
              <div className="shift-calendar">
                <Calendar
                  activeStartDate={calendarMonth.toDate()}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) {
                      setCalendarMonth(dayjs(activeStartDate));
                    }
                  }}
                  tileContent={renderTileContent}
                  tileClassName={getTileClassName}
                  locale="vi-VN"
                  showNavigation={false}
                />
              </div>
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
                      <Select
                        style={{ width: 360, maxWidth: '100%' }}
                        dropdownMatchSelectWidth={false}
                        dropdownStyle={{ whiteSpace: 'normal', minWidth: 360, maxWidth: 520 }}
                        optionLabelProp="label"
                      >
                        {configurations.map(c => (
                          <Select.Option key={c.id} value={c.id} label={formatShiftDisplay(c.name, c.start_time, c.end_time)}>
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{formatShiftDisplay(c.name, c.start_time, c.end_time)}</div>
                          </Select.Option>
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
            <Select
              style={{ width: '100%' }}
              dropdownMatchSelectWidth={false}
              dropdownStyle={{ whiteSpace: 'normal', minWidth: 360, maxWidth: 520 }}
              optionLabelProp="label"
            >
              {configurations.map(c => (
                <Select.Option key={c.id} value={c.id} label={formatShiftDisplay(c.name, c.start_time, c.end_time)}>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{formatShiftDisplay(c.name, c.start_time, c.end_time)}</div>
                </Select.Option>
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

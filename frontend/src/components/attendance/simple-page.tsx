'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Typography, Tag, Divider, Button, Space, Calendar, ConfigProvider, Select, message } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs, { Dayjs } from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/vi';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

dayjs.extend(localeData);
dayjs.locale('vi');
import { attendanceService, AttendanceData, MonthlyStats } from '@/src/service/attendanceService';

const AttendanceSimplePage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    earlyLeaveDays: 0,
    totalHours: 0,
    averageHours: 0,
    overtimeHours: 0
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Lấy dữ liệu chấm công từ API
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const userId = 1; // Sau này sẽ lấy từ auth context
        
        const [attendanceData, statsData] = await Promise.all([
          attendanceService.getUserAttendanceByMonth(userId, currentYear, currentMonth),
          attendanceService.getUserMonthlyStats(userId, currentYear, currentMonth)
        ]);
        
        setAttendanceData(attendanceData);
        setMonthlyStats(statsData);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        // Fallback to mock data if API fails
        const mockData: AttendanceData[] = [
          {
            id: 1,
            userId: 1,
            date: '2024-01-01',
            checkIn: '08:00',
            checkOut: '17:00',
            status: 'on_time',
            totalHours: 8,
            overtime: 0
          },
          {
            id: 2,
            userId: 1,
            date: '2024-01-02',
            checkIn: '08:30',
            checkOut: '17:00',
            status: 'late',
            totalHours: 7.5,
            overtime: 0
          },
          {
            id: 3,
            userId: 1,
            date: '2024-01-03',
            checkIn: '08:00',
            checkOut: '16:30',
            status: 'early_leave',
            totalHours: 7.5,
            overtime: 0
          },
          {
            id: 4,
            userId: 1,
            date: '2024-01-04',
            checkIn: '08:00',
            checkOut: '18:00',
            status: 'on_time',
            totalHours: 9,
            overtime: 1
          }
        ];
        
        setAttendanceData(mockData);
        // Tính thống kê cơ bản từ mock
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthData = mockData.filter(item => {
          const d = new Date(item.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
        const totalDays = new Date(year, month + 1, 0).getDate();
        const presentDays = monthData.length;
        const absentDays = totalDays - presentDays;
        const lateDays = monthData.filter(i => i.status === 'late').length;
        const earlyLeaveDays = monthData.filter(i => i.status === 'early_leave').length;
        const totalHours = monthData.reduce((s, i) => s + i.totalHours, 0);
        const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
        const overtimeHours = monthData.reduce((s, i) => s + i.overtime, 0);
        setMonthlyStats({ totalDays, presentDays, absentDays, lateDays, earlyLeaveDays, totalHours, averageHours, overtimeHours });
      }
    };

    fetchAttendanceData();
  }, [currentDate]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'on_time':
        return <Tag color="green">Đúng giờ</Tag>;
      case 'late':
        return <Tag color="gold">Đi muộn</Tag>;
      case 'early_leave':
        return <Tag color="red">Về sớm</Tag>;
      case 'absent':
        return <Tag>Vắng mặt</Tag>;
      default:
        return <Tag color="blue">Không xác định</Tag>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const { Title, Paragraph, Text } = Typography;

  // Map dữ liệu chấm công để truy xuất nhanh theo YYYY-MM-DD
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceData>();
    attendanceData.forEach((i) => map.set(i.date, i));
    return map;
  }, [attendanceData]);

  const cellStyle: React.CSSProperties = {
    padding: 8,
    textAlign: 'center',
    border: '1px solid #f0f0f0',
    cursor: 'pointer'
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    background: '#fafafa'
  };

  const goPrevMonth = () => {
    const next = calendarValue.subtract(1, 'month');
    setCalendarValue(next);
    setCurrentDate(next.toDate());
    setSelectedDate(null);
  };

  const goNextMonth = () => {
    const next = calendarValue.add(1, 'month');
    setCalendarValue(next);
    setCurrentDate(next.toDate());
    setSelectedDate(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        {/* Calendar Section - 70% */}
        <Col xs={24} lg={17}>
          <Card
            title={`Lịch chấm công tháng ${calendarValue.month() + 1}/${calendarValue.year()}`}
            extra={
              <Space>
                <Button size="small" onClick={goPrevMonth} icon={<LeftOutlined />}>Tháng trước</Button>
                <Button size="small" onClick={goNextMonth} icon={<RightOutlined />} iconPosition="end">Tháng sau</Button>
                <Select
                  size="small"
                  value={calendarValue.year()}
                  style={{ width: 100 }}
                  onChange={(y) => {
                    const v = calendarValue.year(y);
                    setCalendarValue(v);
                    setCurrentDate(v.toDate());
                  }}
                  options={Array.from({ length: 11 }, (_, i) => {
                    const base = dayjs().year();
                    const yr = base - 5 + i;
                    return { value: yr, label: yr };
                  })}
                />
                <Select
                  size="small"
                  value={calendarValue.month()}
                  style={{ width: 120 }}
                  onChange={(m) => {
                    const v = calendarValue.month(m);
                    setCalendarValue(v);
                    setCurrentDate(v.toDate());
                  }}
                  options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: `Tháng ${i + 1}` }))}
                />
              </Space>
            }
          >
            <ConfigProvider locale={viVN}>
              <Calendar
                value={calendarValue}
                onChange={(v) => setCalendarValue(v)}
                onPanelChange={(v) => {
                  setCalendarValue(v);
                  setCurrentDate(v.toDate());
                }}
                fullscreen
                headerRender={() => null}
                dateFullCellRender={(value) => {
                  const dateStr = value.format('YYYY-MM-DD');
                  const attendance = attendanceMap.get(dateStr);
                  const isCurrentMonth = value.month() === calendarValue.month();
                  return (
                    <div
                      style={{
                        padding: 8,
                        height: 90,
                        border: '1px solid #f0f0f0',
                        background: attendance ? '#e6f7ff' : undefined,
                        color: isCurrentMonth ? undefined : '#d9d9d9',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedDate(value.toDate())}
                    >
                      <div style={{ fontSize: 12, marginBottom: 4 }}>{value.date()}</div>
                      {attendance && (
                        <div style={{ fontSize: 11 }}>
                          {attendance.checkIn} - {attendance.checkOut}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </ConfigProvider>
          </Card>
        </Col>

        {/* Stats Section - 30% */}
        <Col xs={24} lg={7}>
          <Card title="Thống kê tháng" style={{ marginBottom: 16 }}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <div style={{ textAlign: 'center', background: '#f0f5ff', padding: 12, borderRadius: 8 }}>
                  <Title level={3} style={{ margin: 0, color: '#2f54eb' }}>{monthlyStats.presentDays}</Title>
                  <Text type="secondary">Ngày có mặt</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', background: '#fff1f0', padding: 12, borderRadius: 8 }}>
                  <Title level={3} style={{ margin: 0, color: '#cf1322' }}>{monthlyStats.absentDays}</Title>
                  <Text type="secondary">Ngày vắng</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', background: '#fff7e6', padding: 12, borderRadius: 8 }}>
                  <Title level={3} style={{ margin: 0, color: '#d48806' }}>{monthlyStats.lateDays}</Title>
                  <Text type="secondary">Đi muộn</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', background: '#fff7e6', padding: 12, borderRadius: 8 }}>
                  <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>{monthlyStats.earlyLeaveDays}</Title>
                  <Text type="secondary">Về sớm</Text>
                </div>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Tổng giờ làm:</Text>
                <Text strong>{monthlyStats.totalHours.toFixed(1)}h</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Trung bình/ngày:</Text>
                <Text strong>{monthlyStats.averageHours.toFixed(1)}h</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Giờ làm thêm:</Text>
                <Text strong style={{ color: '#389e0d' }}>{monthlyStats.overtimeHours.toFixed(1)}h</Text>
              </Col>
            </Row>
          </Card>

          <Card
            title="Chi tiết ngày"
            extra={
              <Button
                type="primary"
                size="small"
                onClick={async () => {
                  try {
                    const userId = 1; // TODO: lấy từ auth
                    const time = dayjs().format('HH:mm');
                    await attendanceService.checkIn(userId, { time });
                    message.success(`Đã chấm công vào lúc ${time}`);

                    // Cập nhật nhanh UI cho ngày hiện tại
                    const dateStr = dayjs().format('YYYY-MM-DD');
                    const exist = attendanceData.find((i) => i.date === dateStr);
                    if (exist) {
                      exist.checkIn = time;
                      setAttendanceData([...attendanceData]);
                    } else {
                      setAttendanceData([
                        ...attendanceData,
                        {
                          id: Date.now(),
                          userId,
                          date: dateStr,
                          checkIn: time,
                          checkOut: '',
                          status: 'on_time',
                          totalHours: 0,
                          overtime: 0,
                        },
                      ]);
                    }
                  } catch (e) {
                    message.error('Chấm công thất bại');
                  }
                }}
              >
                Chấm công vào (tạm)
              </Button>
            }
          >
            {selectedDate ? (
              (() => {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const selectedDateData = attendanceData.find(item => item.date === dateStr);
                return selectedDateData ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <Title level={5} style={{ margin: 0 }}>{formatDate(selectedDateData.date)}</Title>
                    </div>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary">Giờ vào:</Text>
                      <Text strong>{selectedDateData.checkIn}</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary">Giờ ra:</Text>
                      <Text strong>{selectedDateData.checkOut}</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary">Tổng giờ:</Text>
                      <Text strong>{selectedDateData.totalHours}h</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary">Làm thêm:</Text>
                      <Text strong style={{ color: '#389e0d' }}>{selectedDateData.overtime}h</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Trạng thái:</Text>
                      {getStatusTag(selectedDateData.status)}
                    </Row>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Text type="secondary">Không có dữ liệu chấm công cho ngày này</Text>
                  </div>
                );
              })()
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Text type="secondary">Chọn một ngày để xem chi tiết</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AttendanceSimplePage;

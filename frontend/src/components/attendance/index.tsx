'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Typography, Tag, Divider, Button, Space, Calendar, ConfigProvider, Select, message, Grid } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs, { Dayjs } from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/vi';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { attendanceService, AttendanceData, MonthlyStats } from '@/src/service/attendanceService';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/src/utils/decode-token';

// Configure dayjs plugins once
dayjs.extend(localeData);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(customParseFormat);
dayjs.locale('vi');

const AttendanceSimplePage = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
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
        // Lấy userId từ token
        const token = Cookies.get('token');
        const decoded = token ? getDecodedToken(token) : null;
        
        if (!decoded || !decoded.sub) {
          console.error('No valid token found');
          return;
        }
        
        const userId = parseInt(decoded.sub); // decoded.sub chứa user ID
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        console.log('📊 Fetching attendance data for user:', userId, 'Month:', `${currentYear}-${currentMonth}`);
        
        const [attendanceData, statsData] = await Promise.all([
          attendanceService.getUserAttendanceByMonth(userId, currentYear, currentMonth),
          attendanceService.getUserMonthlyStats(userId, currentYear, currentMonth)
        ]);
        
        console.log('✅ Attendance data loaded:', attendanceData);
        console.log('📈 Monthly stats loaded:', statsData);
        
        setAttendanceData(attendanceData);
        setMonthlyStats(statsData);
      } catch (error) {
        console.error('❌ Error fetching attendance data from API:', error);
        message.error('Không thể tải dữ liệu chấm công. Vui lòng thử lại sau.');
        
        // Set empty data instead of mock data to ensure only real DB data is shown
        setAttendanceData([]);
        setMonthlyStats({
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          earlyLeaveDays: 0,
          totalHours: 0,
          averageHours: 0,
          overtimeHours: 0
        });
      }
    };

    fetchAttendanceData();
  }, [currentDate]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'on_time':
        return <Tag color="green">Đúng giờ</Tag>;
      case 'absent':
        return <Tag color="red">Vắng mặt ❌</Tag>;
      default:
        return <Tag color="blue">Không xác định</Tag>;
    }
  };

  // Tính tổng số ngày bị phạt
  const getPenaltyDays = useMemo(() => {
    return monthlyStats.lateDays + monthlyStats.earlyLeaveDays + monthlyStats.absentDays;
  }, [monthlyStats]);

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

  // Kiểm tra xem ngày có bị phạt không
  const isPenaltyDay = (attendance: AttendanceData | undefined) => {
    if (!attendance) return false;
    return attendance.status === 'late' || 
           attendance.status === 'early_leave' || 
           attendance.status === 'absent' ||
           attendance.lateMinutes > 0 ||
           attendance.earlyDepartureMinutes > 0;
  };

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
    <div style={{ padding: isMobile ? 16 : 24 }}>
      <Row gutter={[16, 16]}>
        {/* Calendar Section - 70% */}
        <Col xs={24} lg={17}>
          <Card
            title={`Lịch chấm công tháng ${calendarValue.month() + 1}/${calendarValue.year()}`}
            extra={
              <Space direction={isMobile ? 'vertical' : 'horizontal'} size="small">
                <Row gutter={[8, 8]}>
                  <Col xs={12}>
                    <Button size="small" onClick={goPrevMonth} icon={<LeftOutlined />} style={{ width: '100%' }}>
                      {isMobile ? 'Trước' : 'Tháng trước'}
                    </Button>
                  </Col>
                  <Col xs={12}>
                    <Button size="small" onClick={goNextMonth} icon={<RightOutlined />} iconPosition="end" style={{ width: '100%' }}>
                      {isMobile ? 'Sau' : 'Tháng sau'}
                    </Button>
                  </Col>
                </Row>
                <Row gutter={[8, 8]}>
                  <Col xs={12}>
                    <Select
                      size="small"
                      value={calendarValue.year()}
                      style={{ width: '100%' }}
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
                  </Col>
                  <Col xs={12}>
                    <Select
                      size="small"
                      value={calendarValue.month()}
                      style={{ width: '100%' }}
                      onChange={(m) => {
                        const v = calendarValue.month(m);
                        setCalendarValue(v);
                        setCurrentDate(v.toDate());
                      }}
                      options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: `Tháng ${i + 1}` }))}
                    />
                  </Col>
                </Row>
              </Space>
            }
          >
            <ConfigProvider locale={viVN}>
              <Calendar
                className="attendance-calendar-improved"
                value={calendarValue}
                onChange={(v) => setCalendarValue(v as Dayjs)}
                onPanelChange={(v) => {
                  setCalendarValue(v as Dayjs);
                  setCurrentDate(v.toDate());
                }}
                fullscreen={!isMobile}
                headerRender={() => null}
                cellRender={(value, info) => {
                  if (info.type !== 'date') return info.originNode;
                  
                  const dateStr = value.format('YYYY-MM-DD');
                  const attendance = attendanceMap.get(dateStr);
                  const isCurrentMonth = value.month() === calendarValue.month();
                  const hasPenalty = isPenaltyDay(attendance);
                  
                  return (
                    <div
                      className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''}`}
                      onClick={() => setSelectedDate(value.toDate())}
                    >
                      {attendance && (
                        <div className="attendance-content">
                          <div className="time-info" style={{ color: hasPenalty ? '#ff4d4f' : '#666' }}>
                            <div className="check">{attendance.checkIn || '--:--'} - {attendance.checkOut || '--:--'}</div>
                          </div>
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
              <Col xs={12} sm={6} lg={12}>
                <div className="stats-card-present" style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 8 : 12, 
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #e6f4ff 0%, #e6f4ff 100%)',
                }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#2f54eb' }}>{monthlyStats.presentDays}</Title>
                  <Text style={{ fontSize: isMobile ? 11 : 12, color: '#2f54eb', fontWeight: 500 }}>Ngày có mặt</Text>
                </div>
              </Col>
              <Col xs={12} sm={6} lg={12}>
                <div className="stats-card-absent" style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 8 : 12, 
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #fff1f0 0%, #fff1f0 100%)',
                }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#cf1322' }}>{monthlyStats.absentDays}</Title>
                  <Text style={{ fontSize: isMobile ? 11 : 12, color: '#cf1322', fontWeight: 500 }}>
                    Ngày vắng 
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={6} lg={12}>
                <div className="stats-card-late" style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 8 : 12, 
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #fff7e6 0%, #fff7e6 100%)',
                }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#d48806' }}>{monthlyStats.lateDays}</Title>
                  <Text style={{ fontSize: isMobile ? 11 : 12, color: '#d48806', fontWeight: 500 }}>
                    Đi muộn
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={6} lg={12}>
                <div className="stats-card-early-leave" style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 8 : 12, 
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #fff2e8 0%, #fff2e8 100%)',
                }}>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#fa8c16' }}>{monthlyStats.earlyLeaveDays}</Title>
                  <Text style={{ fontSize: isMobile ? 11 : 12, color: '#fa8c16', fontWeight: 500 }}>
                    Về sớm
                  </Text>
                </div>
              </Col>
            </Row>
            
            {/* Thông báo cảnh báo tổng hợp */}
            <Divider style={{ margin: '12px 0' }} />
            
            <Divider style={{ margin: '12px 0' }} />
            <Row>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Tổng giờ làm:</Text>
                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{monthlyStats.totalHours.toFixed(1)}h</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Trung bình/ngày:</Text>
                <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{monthlyStats.averageHours.toFixed(1)}h</Text>
              </Col>
              <Col span={24} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Giờ làm thêm:</Text>
                <Text strong style={{ color: '#389e0d', fontSize: isMobile ? 12 : 14 }}>{monthlyStats.overtimeHours.toFixed(1)}h</Text>
              </Col>
            </Row>
          </Card>

          <Card
            title="Chi tiết ngày"
          >
            {selectedDate ? (
              (() => {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const selectedDateData = attendanceData.find(item => item.date === dateStr);
                return selectedDateData ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <Title level={isMobile ? 4 : 5} style={{ margin: 0 }}>{formatDate(selectedDateData.date)}</Title>
                    </div>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Giờ vào:</Text>
                      <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{selectedDateData.checkIn}</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Giờ ra:</Text>
                      <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{selectedDateData.checkOut}</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Tổng giờ:</Text>
                      <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{selectedDateData.totalHours}h</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Làm thêm:</Text>
                      <Text strong style={{ color: '#389e0d', fontSize: isMobile ? 12 : 14 }}>{selectedDateData.overtime}h</Text>
                    </Row>
                    <Row style={{ marginBottom: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Trạng thái:</Text>
                      {getStatusTag(selectedDateData.status)}
                    </Row>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Không có dữ liệu chấm công cho ngày này</Text>
                  </div>
                );
              })()
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Chọn một ngày để xem chi tiết</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AttendanceSimplePage;
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
import { 
  LeftOutlined, 
  RightOutlined, 
  ClockCircleOutlined, 
  UserOutlined,
  CalendarOutlined,
  HomeOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  FieldTimeOutlined,
  TrophyOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { attendanceService, AttendanceData, MonthlyStats } from '@/service/attendanceService';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';
import './penalty-styles.css';

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
    overtimeHours: 0,
    totalLatePenalty: 0,
    totalEarlyLeavePenalty: 0,
    totalPenalty: 0
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

        // Gọi song song 2 API: attendance data và monthly stats
        const [attendanceData, monthlyStatsData] = await Promise.all([
          attendanceService.getUserAttendanceByMonth(userId, currentYear, currentMonth),
          attendanceService.getUserMonthlyStats(userId, currentYear, currentMonth)
        ]);

        console.log('✅ Attendance data loaded:', attendanceData);
        console.log('� Monthly stats loaded:', monthlyStatsData);
        
        setAttendanceData(attendanceData);
        setMonthlyStats(monthlyStatsData);
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
          overtimeHours: 0,
          totalLatePenalty: 0,
          totalEarlyLeavePenalty: 0,
          totalPenalty: 0
        });
      }
    };

    fetchAttendanceData();
  }, [currentDate]);

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
                          <div className="time-info" style={{ color: hasPenalty ? '#ff4d4f' : '#666' , fontSize: isMobile ? 10 : 14}}>
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
        <Col xs={24} lg={7} style={{ height: '100vh', overflowY: 'auto'  }}>
          <Card title="Thống kê tháng" style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={12} lg={12}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 12 : 16, 
                  borderRadius: 8,
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                }}>
                  <CheckCircleOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#52c41a', marginBottom: 4 }} />
                  <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#52c41a' }}>{monthlyStats.presentDays}</Title>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: '#52c41a', fontWeight: 500 }}>
                      Có mặt
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={12} lg={12}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 12 : 16, 
                  borderRadius: 8,
                  background: '#fff1f0',
                  border: '1px solid #ffccc7',
                }}>
                  <ClockCircleOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#ff4d4f', marginBottom: 4 }} />
                  <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#ff4d4f' }}>{monthlyStats.lateDays}</Title>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: '#ff4d4f', fontWeight: 500 }}>
                      Đi muộn
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={12} lg={12}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 12 : 16, 
                  borderRadius: 8,
                  background: '#fff2e8',
                  border: '1px solid #ffd591',
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#fa8c16', marginBottom: 4 }} />
                  <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#fa8c16' }}>{monthlyStats.earlyLeaveDays}</Title>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: '#fa8c16', fontWeight: 500 }}>
                      Về sớm
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={12} lg={12}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 12 : 16, 
                  borderRadius: 8,
                  background: '#f0f0f0',
                  border: '1px solid #d9d9d9',
                }}>
                  <CloseCircleOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#8c8c8c', marginBottom: 4 }} />
                  <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#8c8c8c' }}>{monthlyStats.absentDays}</Title>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: '#8c8c8c', fontWeight: 500 }}>
                      Vắng mặt
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
            
            {/* Additional stats row */}
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} sm={12} lg={24}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 12 : 16, 
                  borderRadius: 8,
                  background: '#e6f7ff',
                  border: '1px solid #91d5ff',
                }}>
                  <FieldTimeOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#1890ff', marginBottom: 4 }} />
                  <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#1890ff' }}>{monthlyStats.totalHours.toFixed(1)}h</Title>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: '#1890ff', fontWeight: 500 }}>
                      Tổng giờ làm
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={24}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: isMobile ? 12 : 16, 
                  borderRadius: 8,
                  background: '#f9f0ff',
                  border: '1px solid #d3adf7',
                }}>
                  <TrophyOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#722ed1', marginBottom: 4 }} />
                  <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#722ed1' }}>{monthlyStats.overtimeHours.toFixed(1)}h</Title>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: '#722ed1', fontWeight: 500 }}>
                      Làm thêm
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
            
            {/* Thông tin tiền phạt */}
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ 
              background: '#fff2f0', 
              padding: isMobile ? 12 : 16, 
              borderRadius: 8,
              border: '1px solid #ffccc7'
            }}>
              <Row style={{ marginBottom: 12 }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarOutlined style={{ fontSize: isMobile ? 16 : 18, color: '#ff4d4f', marginRight: 8 }} />
                  <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#ff4d4f' }}>Tiền phạt tháng này</Text>
                </Col>
              </Row>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  <div style={{ 
                    textAlign: 'center',
                    padding: isMobile ? 8 : 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #ffccc7'
                  }}>
                    <WarningOutlined style={{ fontSize: isMobile ? 14 : 16, color: '#ff4d4f', marginBottom: 4 }} />
                    <div>
                      <Text style={{ fontSize: isMobile ? 10 : 11, color: '#8c8c8c', display: 'block' }}>Đi muộn</Text>
                      <Text strong style={{ color: '#ff4d4f', fontSize: isMobile ? 12 : 14 }}>
                        {monthlyStats.totalLatePenalty.toLocaleString('vi-VN')}đ
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ 
                    textAlign: 'center',
                    padding: isMobile ? 8 : 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #ffccc7'
                  }}>
                    <ExclamationCircleOutlined style={{ fontSize: isMobile ? 14 : 16, color: '#fa8c16', marginBottom: 4 }} />
                    <div>
                      <Text style={{ fontSize: isMobile ? 10 : 11, color: '#8c8c8c', display: 'block' }}>Về sớm</Text>
                      <Text strong style={{ color: '#fa8c16', fontSize: isMobile ? 12 : 14 }}>
                        {monthlyStats.totalEarlyLeavePenalty.toLocaleString('vi-VN')}đ
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
              <div style={{ 
                marginTop: 12, 
                paddingTop: 12, 
                borderTop: '1px solid #ffccc7',
                textAlign: 'center'
              }}>
                <Text style={{ fontSize: isMobile ? 11 : 12, color: '#8c8c8c' }}>Tổng cộng</Text>
                <div>
                  <Text strong style={{ color: '#ff4d4f', fontSize: isMobile ? 16 : 18 }}>
                    {monthlyStats.totalPenalty.toLocaleString('vi-VN')}đ
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Chi tiết ngày
              </div>
            }
          >
            {selectedDate ? (
              (() => {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const selectedDateData = attendanceData.find(item => item.date === dateStr);
                return selectedDateData ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#fafafa', borderRadius: 8 }}>
                      <CalendarOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 8 }} />
                      <Title level={isMobile ? 5 : 4} style={{ margin: 0, display: 'inline' }}>{formatDate(selectedDateData.date)}</Title>
                    </div>
                    
                    {/* Thời gian section */}
                    <div style={{ marginBottom: 16 }}>
                      <Row gutter={[12, 8]} style={{ marginBottom: 8 }}>
                        <Col span={24}>
                          <Text strong style={{ fontSize: isMobile ? 13 : 14, color: '#595959' }}>
                            <ClockCircleOutlined style={{ marginRight: 6 }} />
                            Thời gian làm việc
                          </Text>
                        </Col>
                      </Row>
                      <Row gutter={[12, 8]}>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#52c41a', display: 'block' }}>Vào làm</Text>
                            <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#52c41a' }}>
                              {selectedDateData.checkIn || '--:--'}
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#d48806', display: 'block' }}>Tan làm</Text>
                            <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#d48806' }}>
                              {selectedDateData.checkOut || '--:--'}
                            </Text>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    
                    {/* Thống kê section */}
                    <div style={{ marginBottom: 16 }}>
                      <Row gutter={[12, 8]} style={{ marginBottom: 8 }}>
                        <Col span={24}>
                          <Text strong style={{ fontSize: isMobile ? 13 : 14, color: '#595959' }}>
                            <FieldTimeOutlined style={{ marginRight: 6 }} />
                            Thống kê
                          </Text>
                        </Col>
                      </Row>
                      <Row gutter={[8, 8]}>
                        <Col xs={12} sm={6}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#1890ff', display: 'block' }}>Tổng giờ</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#1890ff' }}>
                              {selectedDateData.totalHours}h
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={6}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#f9f0ff', borderRadius: 6, border: '1px solid #d3adf7' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#722ed1', display: 'block' }}>Làm thêm</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#722ed1' }}>
                              {selectedDateData.overtime}h
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={6}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#ff4d4f', display: 'block' }}>Muộn</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#ff4d4f' }}>
                              {selectedDateData.lateMinutes}p
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={6}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff2e8', borderRadius: 6, border: '1px solid #ffd591' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#fa8c16', display: 'block' }}>Sớm</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#fa8c16' }}>
                              {selectedDateData.earlyDepartureMinutes}p
                            </Text>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    
                    {/* Thông tin tiền phạt cho ngày này */}
                    {(selectedDateData.lateArrivalPenalty > 0 || selectedDateData.earlyLeavePenalty > 0) && (
                      <div style={{ 
                        background: '#fff2f0', 
                        padding: isMobile ? 12 : 16, 
                        borderRadius: 8,
                        border: '1px solid #ffccc7',
                        marginBottom: 16
                      }}>
                        <Row style={{ marginBottom: 12 }}>
                          <Col span={24} style={{ textAlign: 'center' }}>
                            <DollarOutlined style={{ fontSize: isMobile ? 16 : 18, color: '#ff4d4f', marginRight: 8 }} />
                            <Text strong style={{ fontSize: isMobile ? 13 : 14, color: '#ff4d4f' }}>Tiền phạt ngày này</Text>
                          </Col>
                        </Row>
                        <Row gutter={[8, 8]}>
                          {selectedDateData.lateArrivalPenalty > 0 && (
                            <Col xs={24} sm={12}>
                              <div style={{ 
                                textAlign: 'center',
                                padding: isMobile ? 8 : 12,
                                background: 'white',
                                borderRadius: 6,
                                border: '1px solid #ffccc7'
                              }}>
                                <WarningOutlined style={{ fontSize: isMobile ? 14 : 16, color: '#ff4d4f', marginBottom: 4 }} />
                                <div>
                                  <Text style={{ fontSize: isMobile ? 10 : 11, color: '#8c8c8c', display: 'block' }}>Phạt đi muộn</Text>
                                  <Text strong style={{ color: '#ff4d4f', fontSize: isMobile ? 12 : 14 }}>
                                    {selectedDateData.lateArrivalPenalty.toLocaleString('vi-VN')}đ
                                  </Text>
                                </div>
                              </div>
                            </Col>
                          )}
                          {selectedDateData.earlyLeavePenalty > 0 && (
                            <Col xs={24} sm={12}>
                              <div style={{ 
                                textAlign: 'center',
                                padding: isMobile ? 8 : 12,
                                background: 'white',
                                borderRadius: 6,
                                border: '1px solid #ffccc7'
                              }}>
                                <ExclamationCircleOutlined style={{ fontSize: isMobile ? 14 : 16, color: '#fa8c16', marginBottom: 4 }} />
                                <div>
                                  <Text style={{ fontSize: isMobile ? 10 : 11, color: '#8c8c8c', display: 'block' }}>Phạt về sớm</Text>
                                  <Text strong style={{ color: '#fa8c16', fontSize: isMobile ? 12 : 14 }}>
                                    {selectedDateData.earlyLeavePenalty.toLocaleString('vi-VN')}đ
                                  </Text>
                                </div>
                              </div>
                            </Col>
                          )}
                        </Row>
                        <div style={{ 
                          marginTop: 12, 
                          paddingTop: 12, 
                          borderTop: '1px solid #ffccc7',
                          textAlign: 'center'
                        }}>
                          <Text style={{ fontSize: isMobile ? 11 : 12, color: '#8c8c8c' }}>Tổng cộng</Text>
                          <div>
                            <Text strong style={{ color: '#ff4d4f', fontSize: isMobile ? 16 : 18 }}>
                              {(selectedDateData.lateArrivalPenalty + selectedDateData.earlyLeavePenalty).toLocaleString('vi-VN')}đ
                            </Text>
                          </div>
                        </div>
                      </div>
                    )}
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
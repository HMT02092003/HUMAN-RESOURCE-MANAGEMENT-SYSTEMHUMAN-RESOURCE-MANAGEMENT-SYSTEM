'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Typography, Tag, Divider, Button, Space, ConfigProvider, Select, message, Grid, Modal } from 'antd';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './react-calendar-custom.css';
import dayjs, { Dayjs } from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from 'dayjs/plugin/updateLocale';
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
  FireOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import { attendanceService, AttendanceData, MonthlyStats, MonthlyAttendanceDetailResponse, DailyAttendanceDetail } from '@/service/attendanceService';
import SettingsService from '@/service/settingsService';
import shiftService from '@/service/shiftService';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';
import { useSearchParams } from 'next/navigation';
import constants from '@/config/constant';
import './penalty-styles.css';
import MonthlyStatsCard from './MonthlyStatsCard';

// Configure dayjs plugins once
dayjs.extend(localeData);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.extend(customParseFormat);
dayjs.extend(updateLocale);

// Set Vietnamese locale and configure week to start on Monday
dayjs.locale('vi');
dayjs.updateLocale('vi', {
  weekStart: 1, // Monday is the first day of the week (0 = Sunday, 1 = Monday)
});

// Helper function để format số tiền theo kiểu Việt Nam (dấu chấm ngăn cách)
const formatVND = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const AttendanceSimplePage = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams.get('userId'); // Lấy userId từ URL params

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [monthlyDetail, setMonthlyDetail] = useState<MonthlyAttendanceDetailResponse | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>({
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // OT rate từ settings (mặc định 1.5)
  const [otRate, setOtRate] = useState<number>(1.5);
  
  // Shifts và schedules cho hiển thị lịch ca
  const [shifts, setShifts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const defaultShift = { id: 1, name: 'Ca hành chính', start_time: '08:00', end_time: '17:00' };

  // Handler để mở modal chi tiết ngày
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDetailModalVisible(true);
  };

  // Kiểm tra xem có phải quản lý đang xem chấm công của nhân viên không
  const isManagerViewing = !!userIdFromUrl; // Có userId trong URL = quản lý đang xem

  // Handler cho nút duyệt bảng chấm công
  const handleApproveAttendance = async () => {
    if (!userIdFromUrl) return;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    Modal.confirm({
      title: 'Xác nhận duyệt bảng chấm công',
      content: `Bạn có chắc chắn muốn duyệt bảng chấm công của nhân viên này cho tháng ${currentMonth}/${currentYear}?`,
      okText: 'Duyệt',
      cancelText: 'Hủy',
      okButtonProps: {
        style: { background: '#52c41a', borderColor: '#52c41a' }
      },
      onOk: async () => {
        try {
          // Lấy thông tin user để biết departmentId
          const token = Cookies.get('token');
          const decoded = token ? getDecodedToken(token) : null;

          if (!decoded) {
            message.error('Không thể xác thực người dùng');
            return;
          }

          // TODO: Cần lấy departmentId của user được duyệt
          // Tạm thời dùng departmentId từ monthlyDetail nếu có
          const departmentId = 1; // Placeholder - cần lấy từ API hoặc state

          // ⭐ Gửi đầy đủ thông tin: monthlyStats + dailyData (chứa OT từng ngày)
          await attendanceService.approveAttendance({
            userId: parseInt(userIdFromUrl),
            month: monthStr,
            departmentId: departmentId,
            notes: `Duyệt bởi ${decoded.username || 'Quản lý'}`,
            monthlyStats,
            dailyData: monthlyDetail, // ⭐ Gửi kèm dailyData chứa OT từng ngày
          });

          message.success('Duyệt bảng chấm công thành công!');
        } catch (error: any) {
          message.error(error.message || 'Có lỗi xảy ra khi duyệt bảng chấm công');
          console.error('Error approving attendance:', error);
        }
      }
    });
  };

  // Fetch OT rate từ settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await SettingsService.getAllSettings();
        // Try OvertimeRateInUnits first (from attendance DB), then OvertimeRate
        const otSetting = settings.OvertimeRateInUnits || settings.OvertimeRate;
        if (otSetting && otSetting.rate) {
          setOtRate(otSetting.rate);
          console.log('📊 OT Rate loaded:', otSetting.rate);
        }
      } catch (error) {
        console.error('Error fetching OT rate settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Fetch shifts và schedules
  useEffect(() => {
    const fetchShiftsAndSchedules = async () => {
      try {
        // Fetch tất cả ca làm việc
        const shiftsRes = await shiftService.getAllShiftConfigurations();
        if (shiftsRes.data?.success) {
          setShifts(shiftsRes.data.data);
        }

        // Fetch lịch đăng ký ca của user (chỉ lấy approved)
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const fromDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const toDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;
        
        const schedulesRes = await shiftService.getMyShiftRegistrations({
          status: 'approved',
          fromDate,
          toDate
        });
        if (schedulesRes.data?.success) {
          setSchedules(schedulesRes.data.data);
          console.log('📅 Schedules loaded:', schedulesRes.data.data);
        }
      } catch (error) {
        console.error('Error fetching shifts/schedules:', error);
      }
    };
    fetchShiftsAndSchedules();
  }, [currentDate]);

  // Lấy dữ liệu chấm công từ API
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        let userId: number;

        // Nếu có userId trong URL, dùng nó. Nếu không, lấy từ token
        if (userIdFromUrl) {
          userId = parseInt(userIdFromUrl);
          console.log('Using userId from URL:', userId);
        } else {
          // Lấy userId từ token
          const token = Cookies.get('token');
          const decoded = token ? getDecodedToken(token) : null;

          if (!decoded || !decoded.sub) {
            console.error('No valid token found');
            return;
          }

          userId = parseInt(decoded.sub); // decoded.sub chứa user ID
          console.log('Using userId from token:', userId);
        }

        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        console.log('Fetching attendance data for user:', userId, 'Month:', `${currentYear}-${currentMonth}`);

        // 🚀 CHỈ GỌI 1 API DUY NHẤT: monthly-full
        // API này trả về đầy đủ: monthlyStats + dailyData (bao gồm dailyDetails và summary)
        const monthlyFullData = await attendanceService.getUserMonthlyAttendanceFull(userId, currentYear, currentMonth);

        console.log('📊 Attendance fetched for userId:', userId);
        console.log('� Monthly full data:', monthlyFullData);

        // Tách monthlyStats và dailyData từ response
        if (monthlyFullData) {
          let { monthlyStats, dailyData } = monthlyFullData;

          console.log('📅 Monthly detail data:', dailyData);

          // Normalize monthlyStats to support fields coming from `monthly_attendances` table
          const normalizedMonthlyStats = {
            totalDays: monthlyStats.totalDays ?? monthlyStats.totalScheduledDays ?? 0,
            presentDays: monthlyStats.presentDays ?? 0,
            absentDays: monthlyStats.absentDays ?? 0,
            lateDays: monthlyStats.lateDays ?? 0,
            earlyLeaveDays: monthlyStats.earlyLeaveDays ?? 0,
            totalHours: monthlyStats.totalHours ?? monthlyStats.totalWorkHours ?? 0,
            averageHours: monthlyStats.averageHours ?? monthlyStats.averageWorkHours ?? 0,
            overtimeHours: monthlyStats.overtimeHours ?? monthlyStats.totalOvertimeHours ?? 0,
            totalLatePenalty: monthlyStats.totalLatePenalty ?? 0,
            totalEarlyLeavePenalty: monthlyStats.totalEarlyLeavePenalty ?? 0,
            totalPenalty: monthlyStats.totalPenalty ?? 0,
            // overtime pay may come under either name
            totalOvertimePay: monthlyStats.totalOvertimePay ?? monthlyStats.totalOvertimeSalary ?? 0,
            totalWorkingUnits: monthlyStats.totalWorkingUnits ?? monthlyStats.totalWorkingUnits ?? 0,
            totalOtWorkingUnits: monthlyStats.totalOtWorkingUnits ?? monthlyStats.totalOtWorkingUnits ?? 0,
            totalEffectiveOtWorkingUnits: monthlyStats.totalEffectiveOtWorkingUnits ?? 0,
            totalLateMinutes: monthlyStats.totalLateMinutes ?? monthlyStats.totalLateMinutes ?? 0,
            totalEarlyLeaveMinutes: monthlyStats.totalEarlyLeaveMinutes ?? monthlyStats.totalEarlyLeaveMinutes ?? 0,
            unauthorizedAbsenceDays: monthlyStats.unauthorizedAbsenceDays ?? monthlyStats.unauthorizedAbsenceDays ?? 0,
            // Per-day penalty for unauthorized absence (required by MonthlyStats)
            unauthorizedAbsencePenaltyPerDay: monthlyStats.unauthorizedAbsencePenaltyPerDay ?? 0,
            totalUnauthorizedAbsencePenalty: monthlyStats.totalUnauthorizedAbsencePenalty ?? monthlyStats.totalUnauthorizedAbsencePenalty ?? 0,
            approvedLeaveDays: monthlyStats.approvedLeaveDays ?? monthlyStats.approvedLeaveDays ?? 0,
            businessTripDays: monthlyStats.businessTripDays ?? monthlyStats.businessTripDays ?? 0
          };

          monthlyStats = normalizedMonthlyStats;

          // Debug business trip days
          if (dailyData?.dailyDetails) {
            const businessTripDays = dailyData.dailyDetails.filter((d: any) => d.status === 'business_trip');
            console.log(`🚀 Found ${businessTripDays.length} business trip days:`, businessTripDays);
          }

          // Map dailyDetails to attendanceData format for backward compatibility
          const attendanceData = dailyData?.dailyDetails
            ?.filter((d: any) => d.attendanceData)
            .map((d: any) => d.attendanceData) || [];

          setAttendanceData(attendanceData);
          setMonthlyStats(monthlyStats);
          setMonthlyDetail(dailyData);
        } else {
          // Fallback if API failed
          setAttendanceData([]);
          setMonthlyDetail(null);
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
      } catch (error) {
        message.error('Không thể tải dữ liệu chấm công. Vui lòng thử lại sau.');

        // Set empty data instead of mock data to ensure only real DB data is shown
        setAttendanceData([]);
        setMonthlyDetail(null);
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
  }, [currentDate, userIdFromUrl]); // Thêm userIdFromUrl vào dependency array

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
  // Lấy attendanceData từ dailyDetails thay vì từ attendanceData cũ
  const attendanceMap = useMemo(() => {
    const map = new Map<string, any>();
    if (monthlyDetail?.dailyDetails) {
      monthlyDetail.dailyDetails.forEach((detail) => {
        if (detail.hasAttendance && detail.attendanceData) {
          const attData = detail.attendanceData as any; // Cast to any để access dynamic fields

          // Format checkIn/checkOut time để hiển thị
          const checkInTime = attData.checkInTime
            ? dayjs(attData.checkInTime).format('HH:mm')
            : null;
          const checkOutTime = attData.checkOutTime
            ? dayjs(attData.checkOutTime).format('HH:mm')
            : null;

          // ⭐ Format date to YYYY-MM-DD để khớp với tileClassName
          const dateKey = dayjs(detail.date).format('YYYY-MM-DD');

          // ⭐ Chuyển otMinutes (phút) sang giờ để hiển thị
          const otMinutes = parseFloat(attData.otMinutes || '0');
          const otHours = Math.round((otMinutes / 60) * 100) / 100; // Làm tròn 2 chữ số thập phân

          map.set(dateKey, {
            ...attData,
            date: detail.date,
            checkInTime,
            checkOutTime,
            // Map field names từ API sang format cũ của modal
            totalHours: parseFloat(attData.dailyTotalWorkHours || '0'),
            overtime: otHours, // ⭐ Chuyển đổi từ phút sang giờ
            otSalary: parseFloat(attData.otSalary || '0'), // ⭐ Lương OT
            lateMinutes: parseFloat(attData.lateMinutes || '0'),
            earlyDepartureMinutes: parseFloat(attData.earlyDepartureMinutes || '0'),
            lateArrivalPenalty: parseFloat(attData.lateArrivalPenalty || '0'),
            earlyLeavePenalty: parseFloat(attData.earlyLeavePenalty || '0')
          });
        }
      });
    }
    return map;
  }, [monthlyDetail]);

  // Map dữ liệu nghỉ không phép để truy xuất nhanh theo YYYY-MM-DD
  const dailyDetailMap = useMemo(() => {
    const map = new Map<string, DailyAttendanceDetail>();
    if (monthlyDetail?.dailyDetails) {
      monthlyDetail.dailyDetails.forEach((detail) => {
        // ⭐ Format date to YYYY-MM-DD để khớp với tileClassName
        const dateKey = dayjs(detail.date).format('YYYY-MM-DD');
        map.set(dateKey, detail);
      });
      console.log(`🗺️ dailyDetailMap created with ${map.size} entries`);

      // Debug: Show business trip and leave days
      const businessTripDays = Array.from(map.values()).filter(d => d.status === 'business_trip');
      const leaveDays = Array.from(map.values()).filter(d => d.status === 'approved_leave');
      console.log(`🟣 Business trip days: ${businessTripDays.length}`, businessTripDays.map(d => dayjs(d.date).format('YYYY-MM-DD')));
      console.log(`🟡 Leave days: ${leaveDays.length}`, leaveDays.map(d => dayjs(d.date).format('YYYY-MM-DD')));
    }
    return map;
  }, [monthlyDetail]);

  // Map lịch đăng ký ca theo ngày
  const scheduleMap = useMemo(() => {
    const map = new Map<string, any>();
    schedules.forEach((schedule) => {
      const dateKey = dayjs(schedule.date).format('YYYY-MM-DD');
      map.set(dateKey, schedule);
    });
    console.log(`📅 scheduleMap created with ${map.size} entries`);
    return map;
  }, [schedules]);

  // Hàm lấy ca làm việc cho ngày
  const getShiftForDate = (dateStr: string) => {
    const schedule = scheduleMap.get(dateStr);
    if (schedule) {
      // Có đăng ký ca -> trả về thông tin ca
      return {
        name: schedule.shift_name,
        start_time: schedule.start_time?.substring(0, 5),
        end_time: schedule.end_time?.substring(0, 5)
      };
    }
    // Mặc định là ca hành chính
    return defaultShift;
  };

  // Helper: Get cell style based on status
  const getCellStyle = (dailyDetail: DailyAttendanceDetail | undefined, isCurrentMonth: boolean) => {
    if (!dailyDetail || !isCurrentMonth) return { bgColor: 'transparent', borderColor: 'transparent' };

    // Nghỉ không phép (đỏ nhạt) - KHÔNG hiển thị đỏ nếu có chấm công đúng giờ hoặc có đơn
    if (dailyDetail.status === 'absent' && dailyDetail.statusText === 'Nghỉ') {
      return { bgColor: '#fff1f0', borderColor: '#ffccc7' };
    }

    // Công tác (tím nhạt)
    if (dailyDetail.status === 'business_trip') {
      return { bgColor: '#f9f0ff', borderColor: '#d3adf7' };
    }

    // Nghỉ phép (vàng nhạt)
    if (dailyDetail.status === 'approved_leave') {
      return { bgColor: '#fffbe6', borderColor: '#ffe58f' };
    }

    // Đã chấm công đúng giờ (xanh nhạt) - CHỈ khi không có penalty
    if (dailyDetail.status === 'working' && dailyDetail.isOnTime) {
      return { bgColor: '#f6ffed', borderColor: '#b7eb8f' };
    }

    // Đã chấm công nhưng có penalty (trắng - bình thường)
    if (dailyDetail.status === 'working') {
      return { bgColor: 'transparent', borderColor: 'transparent' };
    }

    // Weekend (xám nhạt)
    if (dailyDetail.status === 'weekend') {
      return { bgColor: '#fafafa', borderColor: '#d9d9d9' };
    }

    // Chưa đến ngày (xám nhạt)
    return { bgColor: '#fafafa', borderColor: '#d9d9d9' };
  };

  // Helper: Check if day has penalty
  const hasPenalty = (attendance: AttendanceData | undefined) => {
    if (!attendance) return false;
    return attendance.lateMinutes > 0 || attendance.earlyDepartureMinutes > 0;
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
      {/* Nút duyệt bảng chấm công - Chỉ hiển thị khi quản lý xem */}
      {isManagerViewing && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleApproveAttendance}
            style={{
              background: '#52c41a',
              borderColor: '#52c41a'
            }}
          >
            Duyệt bảng chấm công
          </Button>
        </div>
      )}

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
            {/* React Calendar với tuần bắt đầu từ Thứ 2 - Chuẩn ISO 8601 */}
            <Calendar
              value={calendarValue.toDate()}
              onChange={(date) => {
                if (date) {
                  const dayjsDate = dayjs(date as Date);
                  setCalendarValue(dayjsDate);
                  setCurrentDate(date as Date);
                }
              }}
              locale="vi-VN"
              calendarType="iso8601"
              showNeighboringMonth={true}
              formatShortWeekday={(locale, date) => {
                // ISO 8601: Monday=1, Tuesday=2, ..., Sunday=7
                // getDay(): Sunday=0, Monday=1, ..., Saturday=6
                const dayIndex = date.getDay();
                const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                return days[dayIndex];
              }}
              tileClassName={({ date, view }) => {
                if (view !== 'month') return '';

                const dateStr = dayjs(date).format('YYYY-MM-DD');
                const attendance = attendanceMap.get(dateStr);
                const dailyDetail = dailyDetailMap.get(dateStr);
                const isCurrentMonth = dayjs(date).month() === calendarValue.month();

                if (!isCurrentMonth) return 'other-month';

                // ✨ Kiểm tra ngày lễ từ holidayData object
                const isHoliday = dailyDetail?.holidayData?.isHoliday === true;
                const hasHolidayWork = isHoliday && (attendance || dailyDetail?.status === 'business_trip');

                // ✨ NGÀY LỄ CÓ CHẤM CÔNG / CÔNG TÁC -> nền navy-blue (ưu tiên cao nhất)
                if (hasHolidayWork) return 'status-holiday-work';

                // ✨ NGÀY LỄ LUÔN CÓ NỀN XANH (không có chấm công) (ưu tiên tiếp theo)
                if (isHoliday) return 'status-holiday';

                // Sau đó mới đến các trạng thái khác (nhưng ngày lễ đã có nền xanh rồi)
                // Công tác -> background tím
                if (dailyDetail?.status === 'business_trip') return 'status-business-trip';

                // Nghỉ phép -> background vàng
                if (dailyDetail?.status === 'approved_leave') return 'status-leave';

                // Kiểm tra ngày có phạt chấm công (đi muộn hoặc về sớm)
                const hasPenaltyTime = attendance && (attendance.lateMinutes > 0 || attendance.earlyDepartureMinutes > 0);

                // Ngày bị phạt chấm công -> background đỏ
                if (hasPenaltyTime) return 'status-penalty';

                // Ngày chấm công đúng giờ -> background xanh nhạt
                if (attendance && dailyDetail?.isOnTime) return 'status-working';

                // Nghỉ không phép -> KHÔNG có background (chỉ chữ đỏ)
                // Không cần CSS class cho ngày nghỉ không phép

                // Weekend -> background xám
                if (dailyDetail?.status === 'weekend') return 'status-weekend';

                return '';
              }}
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;

                const dateStr = dayjs(date).format('YYYY-MM-DD');
                const attendance = attendanceMap.get(dateStr);
                const dailyDetail = dailyDetailMap.get(dateStr);
                const isCurrentMonth = dayjs(date).month() === calendarValue.month();
                const hasTimePenalty = hasPenalty(attendance);
                const today = dayjs().format('YYYY-MM-DD');
                const isPastOrToday = dayjs(dateStr).isSameOrBefore(today, 'day');

                if (!isCurrentMonth) return null;

                // ✨ Kiểm tra ngày lễ từ holidayData object
                const isHoliday = dailyDetail?.holidayData?.isHoliday === true;
                const holidayName = dailyDetail?.holidayData?.holidayName || 'Ngày lễ';

                // Debug: Log attendance data for dates with attendance
                if (attendance) {
                  console.log(`📅 Date ${dateStr}:`, {
                    checkInTime: attendance.checkInTime,
                    checkOutTime: attendance.checkOutTime,
                    lateMinutes: attendance.lateMinutes,
                    earlyDepartureMinutes: attendance.earlyDepartureMinutes,
                    hasTimePenalty,
                    isHoliday,
                    holidayName
                  });
                }

                return (
                  <div className="calendar-cell-content" onClick={() => handleDateClick(date)}>
                    {/* ✨ Ưu tiên hiển thị: Công tác > Nghỉ phép > Nghỉ không phép > Chấm công > Tên ngày lễ (nếu không có gì) */}
                    {dailyDetail && dailyDetail.status === 'business_trip' ? (
                      // Công tác: chữ tím (nền xanh nếu là ngày lễ)
                <div style={{
                        textAlign: 'center',
                        padding: '2px',
                        fontSize: isMobile ? 9 : 11,
                        color: '#722ed1',
                        fontWeight: 500
                      }}>
                        Công tác
                </div>
                    ) : dailyDetail && dailyDetail.status === 'approved_leave' ? (
                      // Nghỉ phép: chữ vàng cam (nền xanh nếu là ngày lễ)
                <div style={{
                        textAlign: 'center',
                        padding: '2px',
                        fontSize: isMobile ? 9 : 11,
                        color: '#faad14',
                        fontWeight: 500
                      }}>
                        Nghỉ phép
                </div>
                    ) : dailyDetail && dailyDetail.status === 'absent' && isPastOrToday ? (
                      // Nghỉ không phép: chỉ hiển thị cho ngày <= hôm nay
                <div style={{
                        textAlign: 'center',
                        padding: '2px',
                        fontSize: isMobile ? 9 : 11,
                        color: '#ff4d4f',
                        fontWeight: 500
                      }}>
                        Nghỉ
                </div>
                    ) : attendance ? (
                      // Có chấm công: hiển thị giờ vào - giờ ra (nền xanh nếu là ngày lễ)
                <div className="calendar-cell-info">
                        {(attendance.effectiveOtWorkingUnit > 0 || attendance.otWorkingUnit > 0 || attendance.overtime > 0) && (
                          <div style={{ color: '#d97706', fontSize: isMobile ? 9 : 11, fontWeight: 'bold' }}>
                            +{(attendance.effectiveOtWorkingUnit || (attendance.otWorkingUnit || (attendance.overtime / 8)) * otRate).toFixed(2)}
                          </div>
                        )}
                        <div style={{ color: hasTimePenalty ? '#ff4d4f' : '#666', fontSize: isMobile ? 9 : 11 }}>
                          {attendance.checkInTime || '--:--'} - {attendance.checkOutTime || '--:--'}
                        </div>
                </div>
                    ) : isHoliday ? (
                      // ✨ Ngày lễ không có chấm công/công tác/nghỉ phép → hiển thị tên ngày lễ
                <div style={{
                        textAlign: 'center',
                        padding: '2px',
                        fontSize: isMobile ? 9 : 11,
                        color: '#13c2c2',
                        fontWeight: 600
                      }}>
                        {holidayName}
                </div>
                    ) : null}
                  </div>
                );
              }}
            />

            {/* Legend cho các màu sắc */}
            <div style={{
              marginTop: 16,
              padding: isMobile ? 12 : 16,
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #d9d9d9'
            }}>
              <Row gutter={[8, 8]}>
                <Col xs={24}>
                  <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>Chú thích:</Text>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: 4,
                      marginRight: 8
                    }} />
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Chấm công đúng giờ</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#fff1f0',
                      border: '1px solid #ffccc7',
                      borderRadius: 4,
                      marginRight: 8
                    }} />
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Bị phạt (muộn/sớm)</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: 4,
                      marginRight: 8
                    }} />
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Nghỉ phép</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#f9f0ff',
                      border: '1px solid #d3adf7',
                      borderRadius: 4,
                      marginRight: 8
                    }} />
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Công tác</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#e6fffb',
                      border: '1px solid #87e8de',
                      borderRadius: 4,
                      marginRight: 8
                    }} />
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Ngày lễ</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: 'white',
                      border: '1px solid #f0f0f0',
                      borderRadius: 4,
                      marginRight: 8,
                      position: 'relative'
                    }}>
                <Text style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#ff4d4f',
                        fontSize: 10,
                        fontWeight: 'bold'
                      }}>X</Text>
                    </div>
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Nghỉ không phép</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#fafafa',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      marginRight: 8
                    }} />
                    <Text style={{ fontSize: isMobile ? 11 : 12 }}>Ngày nghỉ</Text>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>

        {/* Stats Section - 30% */}
        <Col xs={24} lg={7} style={{ height: '100vh', overflowY: 'auto' }}>
          {/* New redesigned MonthlyStatsCard component */}
          <MonthlyStatsCard 
            monthlyStats={monthlyStats} 
            otRate={otRate} 
            isMobile={isMobile}
            defaultShift={defaultShift}
          />
        </Col>
      </Row>

      {/* Modal Chi tiết ngày */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Chi tiết ngày {selectedDate ? dayjs(selectedDate).format('DD/MM/YYYY') : ''}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={isMobile ? '95%' : 500}
        centered
      >
        {selectedDate && (() => {
          // Sử dụng dayjs để format date đúng timezone thay vì toISOString() 
          const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
          // Lấy dữ liệu từ attendanceMap và dailyDetailMap thay vì attendanceData cũ
          const selectedDateData = attendanceMap.get(dateStr);
          const dailyDetail = dailyDetailMap.get(dateStr);
          const shiftForDate = getShiftForDate(dateStr);

          console.log(`🔍 Modal clicked date:`, {
            selectedDate,
            dateStr,
            hasAttendanceData: !!selectedDateData,
            hasDailyDetail: !!dailyDetail,
            dailyDetailStatus: dailyDetail?.status
          });

          // Hiển thị thông tin dựa trên status
          if (dailyDetail) {
            // Case 1: Nghỉ phép
            if (dailyDetail.status === 'approved_leave' && dailyDetail.leaveData) {
              // ✨ Lấy thông tin loại nghỉ từ leaveData object
              const leaveTypeKey = dailyDetail.leaveData.leaveType || 'leave';
              const leaveConfig = constants.LeaveTypeConfig[leaveTypeKey as keyof typeof constants.LeaveTypeConfig];
              return (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#fffbe6', borderRadius: 8 }}>
                    <CheckCircleOutlined style={{ fontSize: 18, color: '#faad14', marginRight: 8 }} />
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0, display: 'inline', color: '#faad14' }}>
                      {formatDate(dateStr)}
                    </Title>
                  </div>

                  <div style={{
                    padding: 16,
                    background: '#fffbe6',
                          borderRadius: 8,
                          border: '1px solid #ffe58f',
                          marginBottom: 16
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <CheckCircleOutlined style={{ fontSize: 32, color: '#faad14' }} />
                          </div>
                          <Title level={5} style={{ textAlign: 'center', color: '#faad14', margin: 0 }}>
                            Nghỉ phép
                          </Title>
                          <Paragraph style={{ textAlign: 'center', margin: '8px 0 0 0', color: '#8c8c8c' }}>
                            {dailyDetail.statusText || 'Nghỉ phép'}
                          </Paragraph>

                          {/* Hiển thị loại nghỉ phép */}
                          {(() => {
                            // Prefer applicationCategory from leave object data when present
                            const leaveObj = dailyDetail.leaveData?.leave ?? (dailyDetail.leaveData?.leaveApplications && dailyDetail.leaveData.leaveApplications[0]);
                            const appCategory = leaveObj?.data?.applicationCategory ?? leaveObj?.data?.application_category ?? undefined;
                            // Map applicationCategory to leaveConfig key: assume 'regular' means unpaid else 'leave' as paid
                            const cfgKey = appCategory === 'regular' ? 'regular' : (appCategory === 'paid' ? 'leave' : (dailyDetail.leaveData?.leaveType || 'leave'));
                            const effectiveLeaveConfig = constants.LeaveTypeConfig[cfgKey as keyof typeof constants.LeaveTypeConfig] ?? leaveConfig;
                            return (
                              <div style={{
                                marginTop: 12,
                                padding: 12,
                                background: effectiveLeaveConfig.hasSalary ? '#f6ffed' : '#fff2e8',
                                borderRadius: 6,
                                border: effectiveLeaveConfig.hasSalary ? '1px solid #b7eb8f' : '1px solid #ffd591'
                              }}>
                                <div style={{ textAlign: 'center' }}>
                                  <Text strong style={{
                                    fontSize: 14,
                                    color: effectiveLeaveConfig.hasSalary ? '#52c41a' : '#fa8c16'
                                  }}>
                                    {effectiveLeaveConfig.label}
                                  </Text>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: 8 }}>
                                  <Tag color={effectiveLeaveConfig.hasSalary ? 'success' : 'warning'} style={{ fontSize: 12 }}>
                                    {effectiveLeaveConfig.hasSalary ? '✓ Có lương' : '✗ Không lương'}
                                  </Tag>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                </div>
                    );
                  }

                  // Case 2: Công tác
                  if (dailyDetail.status === 'business_trip' && dailyDetail.businessTripData) {
                    return (
                <div>
                        <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#f9f0ff', borderRadius: 8 }}>
                          <CalendarOutlined style={{ fontSize: 18, color: '#722ed1', marginRight: 8 }} />
                          <Title level={isMobile ? 5 : 4} style={{ margin: 0, display: 'inline', color: '#722ed1' }}>
                            {formatDate(dateStr)}
                          </Title>
                        </div>

                        <div style={{
                          padding: 16,
                          background: '#f9f0ff',
                          borderRadius: 8,
                          border: '1px solid #d3adf7',
                          marginBottom: 16
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <CalendarOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                          </div>
                          <Title level={5} style={{ textAlign: 'center', color: '#722ed1', margin: 0 }}>
                            Công tác
                          </Title>

                          {/* Địa điểm công tác, lý do và chi tiết đơn (nếu có) */}
                          {(() => {
                            const tripObj = dailyDetail.businessTripData?.businessTrip ?? (dailyDetail.businessTripData?.businessTripApplications && dailyDetail.businessTripData.businessTripApplications[0]);
                            const tripDestination = dailyDetail.businessTripData?.businessTripDestination ?? tripObj?.data?.destination ?? tripObj?.data?.location ?? undefined;
                            const tripReason = dailyDetail.businessTripData?.businessTripInfo ?? tripObj?.data?.reason ?? tripObj?.data?.title ?? undefined;

                            return (
                              <>
                                {tripDestination && (
                                  <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 6 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#722ed1' }}>
                                      <EnvironmentOutlined style={{ marginRight: 6 }} />
                                      Địa điểm:
                                    </Text>
                                    <Text style={{ fontSize: 14, color: '#262626' }}>{tripDestination}</Text>
                                  </div>
                                )}

                                {tripReason && (
                                  <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 6 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#722ed1' }}>
                                      <FileTextOutlined style={{ marginRight: 6 }} />
                                      Lý do:
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#595959' }}>{tripReason}</Text>
                                  </div>
                                )}

                                {tripObj && (
                                  <div style={{ marginTop: 12, padding: 12, background: '#ffffff', borderRadius: 6, border: '1px dashed #f0f0f0' }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#404040' }}>
                                      <InfoCircleOutlined style={{ marginRight: 6 }} />
                                      Chi tiết đơn công tác
                                    </Text>
                                    <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                                      <div><strong>ID:</strong> {tripObj.id}</div>
                                      <div><strong>Loại:</strong> {tripObj.type}</div>
                                      <div>
                                        <strong>Thời gian:</strong>{' '}
                                        {tripObj.data?.startDate ? dayjs(tripObj.data.startDate).format('YYYY-MM-DD') : ''}
                                        {tripObj.data?.endDate ? ` → ${dayjs(tripObj.data.endDate).format('YYYY-MM-DD')}` : ''}
                                      </div>
                                      {tripObj.data?.destination && <div><strong>Địa điểm:</strong> {tripObj.data.destination}</div>}
                                      {tripObj.approvedBy !== undefined && <div><strong>Duyệt bởi:</strong> {tripObj.approvedBy}</div>}
                                      {tripObj.approvedDate && <div><strong>Ngày duyệt:</strong> {dayjs(tripObj.approvedDate).format('YYYY-MM-DD')}</div>}
                                    </div>

                                    {/* Pretty-print full object for debugging / full detail */}
                                    <div style={{ marginTop: 8, background: '#fafafa', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 320 }}>
                                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, margin: 0 }}>
{JSON.stringify(tripObj, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
                            <Text style={{ fontSize: 12, color: '#52c41a', display: 'block', textAlign: 'center' }}>
                              <CheckCircleOutlined style={{ marginRight: 6 }} />
                              Ngày công tác được tính công
                            </Text>
                          </div>
                        </div>
                </div>
                    );
                  }

                  // Case 3: Nghỉ không phép
                  if (dailyDetail.status === 'absent') {
                    return (
                <div>
                        <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#fff1f0', borderRadius: 8 }}>
                          <CloseCircleOutlined style={{ fontSize: 18, color: '#ff4d4f', marginRight: 8 }} />
                          <Title level={isMobile ? 5 : 4} style={{ margin: 0, display: 'inline', color: '#ff4d4f' }}>
                            {formatDate(dateStr)}
                          </Title>
                        </div>

                        <div style={{
                          padding: 16,
                          background: '#fff1f0',
                          borderRadius: 8,
                          border: '1px solid #ffccc7',
                          marginBottom: 16
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <CloseCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
                          </div>
                          <Title level={5} style={{ textAlign: 'center', color: '#ff4d4f', margin: 0 }}>
                            Vắng mặt
                          </Title>
                          <Paragraph style={{ textAlign: 'center', margin: '8px 0 0 0', color: '#8c8c8c' }}>
                            {dailyDetail.statusText || 'Nghỉ không phép'}
                          </Paragraph>

                          {dailyDetail.unauthorizedAbsencePenalty > 0 && (
                            <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #ffa39e' }}>
                              <Text strong style={{ display: 'block', marginBottom: 8, color: '#ff4d4f' }}>
                                <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                                Phạt:
                              </Text>
                              <Text style={{ fontSize: 16, color: '#ff4d4f', fontWeight: 600 }}>
                                {dailyDetail.unauthorizedAbsencePenalty.toLocaleString('vi-VN')}đ
                              </Text>
                            </div>
                          )}
                        </div>
                </div>
                    );
                  }

                  // Case 4: Weekend
                  if (dailyDetail.status === 'weekend') {
                    return (
                <div>
                        <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#fafafa', borderRadius: 8 }}>
                          <CalendarOutlined style={{ fontSize: 18, color: '#8c8c8c', marginRight: 8 }} />
                          <Title level={isMobile ? 5 : 4} style={{ margin: 0, display: 'inline', color: '#8c8c8c' }}>
                            {formatDate(dateStr)}
                          </Title>
                        </div>

                        <div style={{
                          padding: 16,
                          background: '#fafafa',
                          borderRadius: 8,
                          border: '1px solid #d9d9d9',
                          marginBottom: 16
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <CalendarOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
                          </div>
                          <Title level={5} style={{ textAlign: 'center', color: '#8c8c8c', margin: 0 }}>
                            Cuối tuần
                          </Title>
                          <Paragraph style={{ textAlign: 'center', margin: '8px 0 0 0', color: '#8c8c8c' }}>
                            {dailyDetail.dayName}
                          </Paragraph>

                          {/* Nếu có chấm công vào cuối tuần thì hiển thị */}
                          {selectedDateData && (
                            <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
                              <Text strong style={{ display: 'block', marginBottom: 8, color: '#1890ff', textAlign: 'center' }}>
                                <CheckCircleOutlined style={{ marginRight: 6 }} />
                                Có chấm công
                              </Text>
                              <div style={{ textAlign: 'center' }}>
                                <Text style={{ fontSize: 14 }}>
                                  {selectedDateData.checkInTime} - {selectedDateData.checkOutTime}
                                </Text>
                              </div>
                            </div>
                          )}
                        </div>
                </div>
                    );
                  }
                }

                // Case 5: Có chấm công bình thường (working day)
                return selectedDateData ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px 0', background: '#fafafa', borderRadius: 8 }}>
                <CalendarOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 8 }} />
                <Title level={isMobile ? 5 : 4} style={{ margin: 0, display: 'inline' }}>{formatDate(selectedDateData.date)}</Title>
                    </div>

                    {/* Ca làm việc section */}
                    <div style={{ marginBottom: 16, padding: 12, background: shiftForDate ? '#e6f7ff' : '#f5f5f5', borderRadius: 8, border: shiftForDate ? '1px solid #91d5ff' : '1px solid #d9d9d9' }}>
                      <Row gutter={[12, 8]} align="middle">
                        <Col span={24}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ScheduleOutlined style={{ marginRight: 8, color: shiftForDate ? '#1890ff' : '#8c8c8c', fontSize: 16 }} />
                            <Text strong style={{ fontSize: isMobile ? 13 : 14, color: shiftForDate ? '#1890ff' : '#8c8c8c' }}>
                              Ca làm việc: {shiftForDate?.name || 'Hành chính'}
                            </Text>
                          </div>
                          {shiftForDate && (
                            <div style={{ textAlign: 'center', marginTop: 4 }}>
                              <Text style={{ fontSize: 12, color: '#595959' }}>
                                ({shiftForDate.start_time} - {shiftForDate.end_time})
                              </Text>
                            </div>
                          )}
                        </Col>
                      </Row>
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
                              {selectedDateData.checkInTime || '--:--'}
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#d48806', display: 'block' }}>Tan làm</Text>
                            <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#d48806' }}>
                              {selectedDateData.checkOutTime || '--:--'}
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
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#1890ff', display: 'block' }}>Tổng giờ</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#1890ff' }}>
                              {selectedDateData.totalHours}h
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#f9f0ff', borderRadius: 6, border: '1px solid #d3adf7' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#722ed1', display: 'block' }}>Làm thêm</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#722ed1' }}>
                              {selectedDateData.overtime}h
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#ff4d4f', display: 'block' }}>Muộn</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#ff4d4f' }}>
                              {selectedDateData.lateMinutes}p
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff2e8', borderRadius: 6, border: '1px solid #ffd591' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#fa8c16', display: 'block' }}>Sớm</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#fa8c16' }}>
                              {selectedDateData.earlyDepartureMinutes}p
                            </Text>
                          </div>
                        </Col>
                        {/* ✨ NEW: Working Units */}
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#d48806', display: 'block' }}>Số công</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#d48806' }}>
                              {((selectedDateData as any).dailyWorkingUnit || (selectedDateData as any).totalWorkingUnit || 0).toFixed(2)}
                            </Text>
                          </div>
                        </Col>
                        <Col xs={12} sm={12}>
                          <div style={{ textAlign: 'center', padding: 8, background: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                            <Text style={{ fontSize: isMobile ? 10 : 11, color: '#cf1322', display: 'block' }}>Công OT (đã nhân hệ số)</Text>
                            <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#cf1322' }}>
                              {((selectedDateData as any).effectiveOtWorkingUnit || (selectedDateData as any).otWorkingUnit || 0).toFixed(2)}
                            </Text>
                          </div>
                        </Col>
                </Row>
                    </div>

                    {selectedDateData.overtime > 0 ? (
                <div style={{ marginBottom: 16 }}>
                        <Row gutter={[12, 8]} style={{ marginBottom: 8 }}>
                          <Col span={24}>
                            <Text strong style={{ fontSize: isMobile ? 13 : 14, color: '#595959' }}>
                              <InfoCircleOutlined style={{ marginRight: 6 }} />
                              Thông tin tăng ca
                            </Text>
                          </Col>
                        </Row>
                        <Row gutter={[8, 8]}>
                          <Col xs={12} sm={12}>
                            <div style={{ textAlign: 'center', padding: 8, background: '#f9f0ff', borderRadius: 6, border: '1px solid #d3adf7' }}>
                              <Text style={{ fontSize: isMobile ? 10 : 11, color: '#722ed1', display: 'block' }}>Thời gian tăng ca</Text>
                              <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#722ed1' }}>
                                {selectedDateData.overtime || 0} h
                              </Text>
                            </div>
                          </Col>
                          <Col xs={12} sm={12}>
                            <div style={{ textAlign: 'center', padding: 8, background: '#e6fffb', borderRadius: 6, border: '1px solid #87e8de' }}>
                              <Text style={{ fontSize: isMobile ? 10 : 11, color: '#13c2c2', display: 'block' }}>Lương tăng ca</Text>
                              <Text strong style={{ fontSize: isMobile ? 12 : 14, color: '#13c2c2' }}>
                                {formatVND(selectedDateData.otSalary || 0)}đ
                              </Text>
                            </div>
                          </Col>
                        </Row>
                </div>
                    ) : null}

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
              })()}
      </Modal>
    </div>
  );
};

export default AttendanceSimplePage;
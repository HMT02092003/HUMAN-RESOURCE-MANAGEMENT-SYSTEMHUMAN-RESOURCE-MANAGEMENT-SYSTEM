import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  IconButton,
  Modal,
  Portal,
  Button,
  Divider,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AttendanceService from '../../services/AttendanceService';
import { useAuth } from '../../services/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_PADDING = 8;
const CELL_SIZE = (SCREEN_WIDTH - 32 - CALENDAR_PADDING * 2) / 7;

// ==================== HELPER FUNCTIONS ====================
const formatVND = (amount) => {
  if (!amount) return '0';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  // 0 = Sunday, 1 = Monday, ...
  // Convert to Monday-first: 0 = Monday, 6 = Sunday
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const formatDateVN = (dateString) => {
  const date = new Date(dateString);
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return `${weekdays[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

// ==================== STATUS COLORS ====================
const STATUS_COLORS = {
  working: { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' },
  penalty: { bg: '#fff1f0', border: '#ffccc7', text: '#ff4d4f' },
  leave: { bg: '#fffbe6', border: '#ffe58f', text: '#faad14' },
  business_trip: { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' },
  absent: { bg: 'transparent', border: 'transparent', text: '#ff4d4f' },
  weekend: { bg: '#fafafa', border: '#d9d9d9', text: '#8c8c8c' },
  holiday: { bg: '#e6fffb', border: '#87e8de', text: '#13c2c2' },
  holiday_work: { bg: '#1890ff', border: '#1890ff', text: '#ffffff' },
};

// ==================== MAIN COMPONENT ====================
const AttendanceListScreen = ({ route }) => {
  const theme = useTheme();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [dailyDetails, setDailyDetails] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Có thể xem chấm công của user khác (cho manager)
  const viewingUserId = route?.params?.userId || user?.id;
  const isManagerViewing = route?.params?.userId && route?.params?.userId !== user?.id;

  // ==================== FETCH DATA ====================
  const fetchAttendanceData = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      console.log('📊 [App] Fetching attendance for user:', viewingUserId, 'Month:', `${year}-${month}`);

      const fullData = await AttendanceService.getUserMonthlyAttendanceFull(viewingUserId, year, month);

      if (fullData) {
        const normalizedStats = AttendanceService.normalizeMonthlyStats(fullData.monthlyStats);
        setMonthlyStats(normalizedStats);
        setDailyDetails(fullData.dailyData?.dailyDetails || []);
        console.log('✅ [App] Data loaded:', { stats: normalizedStats, days: fullData.dailyData?.dailyDetails?.length });
      } else {
        setMonthlyStats(null);
        setDailyDetails([]);
      }
    } catch (error) {
      console.error('❌ [App] Error fetching attendance:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu chấm công');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate, viewingUserId]);

  useEffect(() => {
    setLoading(true);
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
  };

  // ==================== CALENDAR DATA MAP ====================
  const attendanceMap = useMemo(() => {
    const map = new Map();
    dailyDetails.forEach((detail) => {
      const dateKey = detail.date?.split('T')[0];
      if (dateKey) {
        // Format check-in/check-out time
        let checkInTime = null;
        let checkOutTime = null;
        
        if (detail.attendanceData) {
          const att = detail.attendanceData;
          if (att.checkInTime) {
            const d = new Date(att.checkInTime);
            checkInTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          }
          if (att.checkOutTime) {
            const d = new Date(att.checkOutTime);
            checkOutTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          }
        }

        map.set(dateKey, {
          ...detail,
          checkInTime,
          checkOutTime,
          overtime: detail.attendanceData?.otMinutes ? Math.round((parseFloat(detail.attendanceData.otMinutes) / 60) * 100) / 100 : 0,
          lateMinutes: parseFloat(detail.attendanceData?.lateMinutes || 0),
          earlyDepartureMinutes: parseFloat(detail.attendanceData?.earlyDepartureMinutes || 0),
        });
      }
    });
    return map;
  }, [dailyDetails]);

  // ==================== NAVIGATION ====================
  const goPrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
  };

  const goNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
  };

  // ==================== APPROVE ATTENDANCE (Manager) ====================
  const handleApproveAttendance = async () => {
    Alert.alert(
      'Xác nhận duyệt',
      `Bạn có chắc chắn muốn duyệt bảng chấm công tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          style: 'default',
          onPress: async () => {
            try {
              const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
              await AttendanceService.approveAttendance({
                userId: viewingUserId,
                month: monthStr,
                departmentId: 1, // TODO: Get from user data
                notes: `Duyệt bởi ${user?.username || 'Quản lý'}`,
                monthlyStats,
                dailyData: { dailyDetails },
              });
              Alert.alert('Thành công', 'Đã duyệt bảng chấm công');
            } catch (error) {
              Alert.alert('Lỗi', error.message || 'Không thể duyệt bảng chấm công');
            }
          },
        },
      ]
    );
  };

  // ==================== RENDER CALENDAR ====================
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <View key={`empty-${i}`} style={styles.calendarCell} />
      );
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = attendanceMap.get(dateStr);
      const isToday = dateStr === todayStr;
      const isPast = new Date(dateStr) <= today;

      // Determine status and colors
      let cellStyle = {};
      let statusContent = null;

      if (data) {
        const isHoliday = data.holidayData?.isHoliday;
        const hasAttendance = data.hasAttendance && data.attendanceData;
        const hasPenalty = data.lateMinutes > 0 || data.earlyDepartureMinutes > 0;

        // Holiday with work
        if (isHoliday && (hasAttendance || data.status === 'business_trip')) {
          cellStyle = { backgroundColor: STATUS_COLORS.holiday_work.bg };
          if (data.checkInTime) {
            statusContent = (
              <Text style={[styles.cellTime, { color: '#fff' }]} numberOfLines={1}>
                {data.checkInTime}
              </Text>
            );
          }
        }
        // Holiday
        else if (isHoliday) {
          cellStyle = { backgroundColor: STATUS_COLORS.holiday.bg, borderColor: STATUS_COLORS.holiday.border, borderWidth: 1 };
          statusContent = (
            <Text style={[styles.cellStatus, { color: STATUS_COLORS.holiday.text }]} numberOfLines={1}>
              {data.holidayData?.holidayName?.substring(0, 4) || 'Lễ'}
            </Text>
          );
        }
        // Business trip
        else if (data.status === 'business_trip') {
          cellStyle = { backgroundColor: STATUS_COLORS.business_trip.bg, borderColor: STATUS_COLORS.business_trip.border, borderWidth: 1 };
          statusContent = (
            <Text style={[styles.cellStatus, { color: STATUS_COLORS.business_trip.text }]} numberOfLines={1}>
              C.tác
            </Text>
          );
        }
        // Approved leave
        else if (data.status === 'approved_leave') {
          cellStyle = { backgroundColor: STATUS_COLORS.leave.bg, borderColor: STATUS_COLORS.leave.border, borderWidth: 1 };
          statusContent = (
            <Text style={[styles.cellStatus, { color: STATUS_COLORS.leave.text }]} numberOfLines={1}>
              Nghỉ
            </Text>
          );
        }
        // Has penalty
        else if (hasAttendance && hasPenalty) {
          cellStyle = { backgroundColor: STATUS_COLORS.penalty.bg, borderColor: STATUS_COLORS.penalty.border, borderWidth: 1 };
          statusContent = (
            <View style={styles.cellTimeContainer}>
              {data.overtime > 0 && (
                <Text style={[styles.cellOT, { color: '#52c41a' }]}>+{data.overtime.toFixed(1)}</Text>
              )}
              <Text style={[styles.cellTime, { color: STATUS_COLORS.penalty.text }]} numberOfLines={1}>
                {data.checkInTime || '--:--'}
              </Text>
            </View>
          );
        }
        // Working on time
        else if (hasAttendance) {
          cellStyle = { backgroundColor: STATUS_COLORS.working.bg, borderColor: STATUS_COLORS.working.border, borderWidth: 1 };
          statusContent = (
            <View style={styles.cellTimeContainer}>
              {data.overtime > 0 && (
                <Text style={[styles.cellOT, { color: '#52c41a' }]}>+{data.overtime.toFixed(1)}</Text>
              )}
              <Text style={[styles.cellTime, { color: '#666' }]} numberOfLines={1}>
                {data.checkInTime || '--:--'}
              </Text>
            </View>
          );
        }
        // Absent (no attendance on working day)
        else if (data.status === 'absent' && isPast) {
          statusContent = (
            <Text style={[styles.cellStatus, { color: STATUS_COLORS.absent.text }]} numberOfLines={1}>
              Nghỉ
            </Text>
          );
        }
        // Weekend
        else if (data.status === 'weekend') {
          cellStyle = { backgroundColor: STATUS_COLORS.weekend.bg };
        }
      }

      cells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarCell,
            cellStyle,
            isToday && styles.todayCell,
          ]}
          onPress={() => {
            setSelectedDate(dateStr);
            setModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dayNumber,
            isToday && styles.todayText,
          ]}>
            {day}
          </Text>
          {statusContent}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        {/* Week header */}
        <View style={styles.weekHeader}>
          {weekDays.map((d, i) => (
            <View key={i} style={styles.weekHeaderCell}>
              <Text style={[styles.weekHeaderText, i >= 5 && { color: '#ff4d4f' }]}>{d}</Text>
            </View>
          ))}
        </View>
        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {cells}
        </View>
      </View>
    );
  };

  // ==================== RENDER STATS ====================
  const renderStats = () => {
    if (!monthlyStats) return null;

    const statsItems = [
      { label: 'Tổng ngày làm việc', value: monthlyStats.totalDays, icon: 'calendar', color: '#faad14', bg: '#fffbe6' },
      { label: 'Ngày đã làm', value: monthlyStats.presentDays, icon: 'check-circle', color: '#52c41a', bg: '#f6ffed' },
      { label: 'Đi muộn', value: monthlyStats.lateDays, icon: 'clock-alert', color: '#ff4d4f', bg: '#fff1f0' },
      { label: 'Về sớm', value: monthlyStats.earlyLeaveDays, icon: 'clock-fast', color: '#fa8c16', bg: '#fff2e8' },
      { label: 'Nghỉ phép', value: monthlyStats.approvedLeaveDays, icon: 'calendar-check', color: '#faad14', bg: '#fffbe6' },
      { label: 'Nghỉ không phép', value: monthlyStats.unauthorizedAbsenceDays, icon: 'calendar-remove', color: '#cf1322', bg: '#fff1f0' },
      { label: 'Tổng giờ làm', value: `${(monthlyStats.totalHours || 0).toFixed(1)}h`, icon: 'clock-outline', color: '#1890ff', bg: '#e6f7ff' },
      { label: 'Giờ tăng ca', value: `${(monthlyStats.overtimeHours || 0).toFixed(1)}h`, icon: 'clock-plus', color: '#13c2c2', bg: '#e6fffb' },
      { label: 'Tổng công', value: (monthlyStats.totalWorkingUnits || 0).toFixed(2), icon: 'trophy', color: '#fa8c16', bg: '#fff7e6' },
      { label: 'Công OT', value: (monthlyStats.totalOtWorkingUnits || 0).toFixed(2), icon: 'fire', color: '#ff4d4f', bg: '#fff1f0' },
    ];

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          {statsItems.map((item, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ==================== RENDER PENALTY INFO ====================
  const renderPenaltyInfo = () => {
    if (!monthlyStats) return null;

    return (
      <Card style={styles.penaltyCard}>
        <Card.Title title="Tiền phạt tháng này" titleStyle={styles.penaltyTitle} />
        <Card.Content>
          <View style={styles.penaltyGrid}>
            <View style={styles.penaltyItem}>
              <MaterialCommunityIcons name="clock-alert" size={20} color="#ff4d4f" />
              <Text style={styles.penaltyLabel}>Đi muộn</Text>
              <Text style={[styles.penaltyValue, { color: '#ff4d4f' }]}>
                {formatVND(monthlyStats.totalLatePenalty)}đ
              </Text>
            </View>
            <View style={styles.penaltyItem}>
              <MaterialCommunityIcons name="clock-fast" size={20} color="#fa8c16" />
              <Text style={styles.penaltyLabel}>Về sớm</Text>
              <Text style={[styles.penaltyValue, { color: '#fa8c16' }]}>
                {formatVND(monthlyStats.totalEarlyLeavePenalty)}đ
              </Text>
            </View>
            <View style={styles.penaltyItem}>
              <MaterialCommunityIcons name="calendar-remove" size={20} color="#cf1322" />
              <Text style={styles.penaltyLabel}>Nghỉ KP</Text>
              <Text style={[styles.penaltyValue, { color: '#cf1322' }]}>
                {formatVND(monthlyStats.totalUnauthorizedAbsencePenalty)}đ
              </Text>
            </View>
          </View>
          <Divider style={{ marginVertical: 12 }} />
          <View style={styles.penaltyTotal}>
            <Text style={styles.penaltyTotalLabel}>Tổng cộng</Text>
            <Text style={styles.penaltyTotalValue}>
              {formatVND(monthlyStats.totalPenalty)}đ
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ==================== RENDER LEGEND ====================
  const renderLegend = () => {
    const legends = [
      { label: 'Đúng giờ', bg: '#f6ffed', border: '#b7eb8f' },
      { label: 'Bị phạt', bg: '#fff1f0', border: '#ffccc7' },
      { label: 'Nghỉ phép', bg: '#fffbe6', border: '#ffe58f' },
      { label: 'Công tác', bg: '#f9f0ff', border: '#d3adf7' },
      { label: 'Ngày lễ', bg: '#e6fffb', border: '#87e8de' },
      { label: 'Ngày nghỉ', bg: '#fafafa', border: '#d9d9d9' },
    ];

    return (
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Chú thích:</Text>
        <View style={styles.legendGrid}>
          {legends.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.bg, borderColor: item.border }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ==================== RENDER DAY DETAIL MODAL ====================
  const renderDayDetailModal = () => {
    const data = selectedDate ? attendanceMap.get(selectedDate) : null;

    return (
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết ngày</Text>
              <IconButton icon="close" size={20} onPress={() => setModalVisible(false)} />
            </View>

            {selectedDate && (
              <View style={styles.modalDateHeader}>
                <MaterialCommunityIcons name="calendar" size={20} color="#1890ff" />
                <Text style={styles.modalDateText}>{formatDateVN(selectedDate)}</Text>
              </View>
            )}

            {data ? (
              <View style={styles.modalContent}>
                {/* Status */}
                {data.status === 'approved_leave' && (
                  <View style={[styles.statusBanner, { backgroundColor: '#fffbe6', borderColor: '#ffe58f' }]}>
                    <MaterialCommunityIcons name="calendar-check" size={28} color="#faad14" />
                    <Text style={[styles.statusText, { color: '#faad14' }]}>Nghỉ phép</Text>
                    {data.leaveData?.leaveType && (
                      <Chip mode="outlined" style={{ marginTop: 8 }}>
                        {data.leaveData.leaveType === 'leave' ? 'Nghỉ có lương' : 'Nghỉ không lương'}
                      </Chip>
                    )}
                  </View>
                )}

                {data.status === 'business_trip' && (
                  <View style={[styles.statusBanner, { backgroundColor: '#f9f0ff', borderColor: '#d3adf7' }]}>
                    <MaterialCommunityIcons name="airplane" size={28} color="#722ed1" />
                    <Text style={[styles.statusText, { color: '#722ed1' }]}>Công tác</Text>
                    {data.businessTripData?.businessTripDestination && (
                      <Text style={styles.tripLocation}>
                        📍 {data.businessTripData.businessTripDestination}
                      </Text>
                    )}
                  </View>
                )}

                {data.status === 'absent' && (
                  <View style={[styles.statusBanner, { backgroundColor: '#fff1f0', borderColor: '#ffccc7' }]}>
                    <MaterialCommunityIcons name="close-circle" size={28} color="#ff4d4f" />
                    <Text style={[styles.statusText, { color: '#ff4d4f' }]}>Nghỉ không phép</Text>
                  </View>
                )}

                {/* Attendance Info */}
                {data.hasAttendance && data.attendanceData && (
                  <>
                    <View style={styles.timeSection}>
                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="login" size={24} color="#52c41a" />
                          <Text style={styles.timeLabel}>Check-in</Text>
                          <Text style={styles.timeValue}>{data.checkInTime || '--:--'}</Text>
                        </View>
                        <View style={styles.timeDivider} />
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="logout" size={24} color="#f5222d" />
                          <Text style={styles.timeLabel}>Check-out</Text>
                          <Text style={styles.timeValue}>{data.checkOutTime || '--:--'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Work Hours */}
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Thông tin công</Text>
                      <View style={styles.detailGrid}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Giờ làm việc</Text>
                          <Text style={styles.detailValue}>
                            {(parseFloat(data.attendanceData.dailyTotalWorkHours) || 0).toFixed(1)}h
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Tăng ca</Text>
                          <Text style={[styles.detailValue, { color: '#52c41a' }]}>
                            {(data.overtime || 0).toFixed(1)}h
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Công ngày</Text>
                          <Text style={styles.detailValue}>
                            {(parseFloat(data.attendanceData.dailyWorkingUnit) || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Penalty Info */}
                    {(data.lateMinutes > 0 || data.earlyDepartureMinutes > 0) && (
                      <View style={[styles.detailSection, { backgroundColor: '#fff1f0' }]}>
                        <Text style={[styles.sectionTitle, { color: '#ff4d4f' }]}>Thông tin phạt</Text>
                        <View style={styles.detailGrid}>
                          {data.lateMinutes > 0 && (
                            <>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Đi muộn</Text>
                                <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                                  {data.lateMinutes} phút
                                </Text>
                              </View>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Tiền phạt</Text>
                                <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                                  {formatVND(parseFloat(data.attendanceData.lateArrivalPenalty) || 0)}đ
                                </Text>
                              </View>
                            </>
                          )}
                          {data.earlyDepartureMinutes > 0 && (
                            <>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Về sớm</Text>
                                <Text style={[styles.detailValue, { color: '#fa8c16' }]}>
                                  {data.earlyDepartureMinutes} phút
                                </Text>
                              </View>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Tiền phạt</Text>
                                <Text style={[styles.detailValue, { color: '#fa8c16' }]}>
                                  {formatVND(parseFloat(data.attendanceData.earlyLeavePenalty) || 0)}đ
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Holiday Info */}
                {data.holidayData?.isHoliday && (
                  <View style={[styles.detailSection, { backgroundColor: '#e6fffb' }]}>
                    <MaterialCommunityIcons name="party-popper" size={24} color="#13c2c2" />
                    <Text style={[styles.statusText, { color: '#13c2c2' }]}>
                      {data.holidayData.holidayName || 'Ngày lễ'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#d9d9d9" />
                <Text style={styles.noDataText}>Không có dữ liệu chấm công</Text>
              </View>
            )}

            <Button
              mode="contained"
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              Đóng
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải dữ liệu chấm công...</Text>
      </View>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation */}
        <Surface style={styles.monthNav} elevation={1}>
          <IconButton icon="chevron-left" size={24} onPress={goPrevMonth} />
          <Text style={styles.monthTitle}>
            Tháng {currentDate.getMonth() + 1}/{currentDate.getFullYear()}
          </Text>
          <IconButton icon="chevron-right" size={24} onPress={goNextMonth} />
        </Surface>

        {/* Calendar */}
        <Card style={styles.calendarCard}>
          <Card.Content>
            {renderCalendar()}
            {renderLegend()}
          </Card.Content>
        </Card>

        {/* Monthly Stats */}
        <Card style={styles.card}>
          <Card.Title title="Thống kê tháng" titleStyle={styles.cardTitle} />
          <Card.Content>
            {renderStats()}
          </Card.Content>
        </Card>

        {/* Penalty Info */}
        {renderPenaltyInfo()}

        {/* Approve Button (Manager only) */}
        {isManagerViewing && (
          <Button
            mode="contained"
            icon="check-circle"
            onPress={handleApproveAttendance}
            style={styles.approveButton}
            buttonColor="#52c41a"
          >
            Duyệt bảng chấm công
          </Button>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Day Detail Modal */}
      {renderDayDetailModal()}
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },
  
  // Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },

  // Calendar
  calendarCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  card: {
    marginHorizontal: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    padding: CALENDAR_PADDING,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekHeaderCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c8c8c',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#262626',
  },
  todayText: {
    color: '#1890ff',
    fontWeight: '700',
  },
  cellTimeContainer: {
    alignItems: 'center',
  },
  cellTime: {
    fontSize: 9,
    marginTop: 2,
  },
  cellOT: {
    fontSize: 8,
    fontWeight: '600',
  },
  cellStatus: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '500',
  },

  // Legend
  legendContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c8c8c',
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#595959',
  },

  // Stats
  statsContainer: {
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    textAlign: 'center',
    marginTop: 2,
  },

  // Penalty Card
  penaltyCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    backgroundColor: '#fff2f0',
  },
  penaltyTitle: {
    color: '#ff4d4f',
    fontSize: 16,
    fontWeight: '600',
  },
  penaltyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  penaltyItem: {
    alignItems: 'center',
    flex: 1,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  penaltyLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 4,
  },
  penaltyValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  penaltyTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  penaltyTotalLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  penaltyTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff4d4f',
  },

  // Approve Button
  approveButton: {
    marginHorizontal: 8,
    marginTop: 8,
  },

  // Modal
  modalContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  modalDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalDateText: {
    fontSize: 14,
    color: '#1890ff',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalContent: {},
  statusBanner: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  tripLocation: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 8,
  },
  timeSection: {
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 8,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#d9d9d9',
  },
  timeLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginTop: 2,
  },
  detailSection: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginTop: 2,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 12,
  },
  closeButton: {
    marginTop: 16,
  },
});

export default AttendanceListScreen;

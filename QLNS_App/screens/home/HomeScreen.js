import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { Surface, IconButton, useTheme, ActivityIndicator, Divider, Menu, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import AuthTokenManager from '../../services/AuthTokenManager';
import apiService from '../../services/apiService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const StatCard = ({ icon, title, value, color, suffix = '', onPress }) => {
  const theme = useTheme();

  return (
    <Surface style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]} elevation={2}>
      <View style={styles.statIconContainer}>
        <View style={[styles.statIconCircle, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon} size={28} color={color} />
        </View>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>
          {value != null ? value.toLocaleString('vi-VN') : '0'}{suffix}
        </Text>
      </View>
    </Surface>
  );
};

const HomeScreen = () => {
  const [userData, setUserData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [yearMenuVisible, setYearMenuVisible] = useState(false);
  const [monthMenuVisible, setMonthMenuVisible] = useState(false);
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AuthTokenManager.getUser();
      setUserData(data);
      // After loading user, fetch dashboard stats
      fetchDashboardStats(data?.id);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (userId) => {
    try {
      console.log(`📊 [HomeScreen] Fetching dashboard stats for year=${selectedYear}, month=${selectedMonth}`);

      const resp = await apiService.get('/dashboard/stats', {
        params: { year: selectedYear, month: selectedMonth }
      });

      if (resp?.data?.success) {
        setDashboardData(resp.data.data);
      } else if (resp?.data) {
        setDashboardData(resp.data);
      }
    } catch (err) {
      console.error(' [HomeScreen] Error fetching dashboard stats:', err);
    }
  };

  const handleSearch = () => {
    setRefreshing(true);
    fetchDashboardStats(userData?.id);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text style={styles.userName}>{userData?.fullName || userData?.username || 'User'}</Text>
          </View>
          <IconButton
            icon="account-circle"
            size={32}
            iconColor={theme.colors.primary}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </Surface>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Date Selector */}
        <Surface style={styles.dateSelector} elevation={1}>
          <Text style={styles.dateSelectorTitle}>Chọn thời gian:</Text>
          <View style={styles.datePickerRow}>
            <Menu
              visible={yearMenuVisible}
              onDismiss={() => setYearMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setYearMenuVisible(true)}
                  style={styles.dateButton}
                  icon="calendar"
                >
                  {selectedYear}
                </Button>
              }
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <Menu.Item
                  key={year}
                  onPress={() => {
                    setSelectedYear(year);
                    setYearMenuVisible(false);
                  }}
                  title={year.toString()}
                />
              ))}
            </Menu>

            <Menu
              visible={monthMenuVisible}
              onDismiss={() => setMonthMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMonthMenuVisible(true)}
                  style={styles.dateButton}
                  icon="calendar-month"
                >
                  Tháng {selectedMonth}
                </Button>
              }
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <Menu.Item
                  key={month}
                  onPress={() => {
                    setSelectedMonth(month);
                    setMonthMenuVisible(false);
                  }}
                  title={`Tháng ${month}`}
                />
              ))}
            </Menu>

            <Button
              mode="contained"
              onPress={handleSearch}
              style={styles.searchButton}
              loading={refreshing}
            >
              Tìm
            </Button>
          </View>
        </Surface>

        {/* Applications Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đơn từ</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="file-document-multiple"
              title="Tổng đơn từ"
              value={dashboardData?.applications?.summary?.totalApplications ?? 0}
              color="#1890ff"
            />
            <StatCard
              icon="check"
              title="Đơn đã duyệt"
              value={dashboardData?.applications?.summary?.totalApproved ?? 0}
              color="#52c41a"
            />
            <StatCard
              icon="clock-outline"
              title="Đơn chờ duyệt"
              value={dashboardData?.applications?.summary?.totalPending ?? 0}
              color="#fa8c16"
            />
            <StatCard
              icon="close"
              title="Đơn bị từ chối"
              value={dashboardData?.applications?.summary?.totalRejected ?? 0}
              color="#ff4d4f"
            />
          </View>
        </View>

        {/* Attendance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chấm công</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="clock-outline"
              title="Tổng đi muộn"
              value={dashboardData?.attendance?.summary?.totalLate ?? 0}
              color="#fa8c16"
            />
            <StatCard
              icon="clock-start"
              title="Tổng về sớm"
              value={dashboardData?.attendance?.summary?.totalEarlyLeave ?? 0}
              color="#fa8c16"
            />
            <StatCard
              icon="close"
              title="Vắng mặt"
              value={dashboardData?.attendance?.summary?.totalAbsent ?? 0}
              color="#ff4d4f"
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Charts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biểu đồ chấm công</Text>
          <Surface style={styles.chartContainer} elevation={1}>
            {dashboardData?.attendance?.chartData && dashboardData.attendance.chartData.length > 0 ? (
              (() => {
                const labels = dashboardData.attendance.chartData.map(i => {
                  const d = new Date(i.date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                });

                const onTime = dashboardData.attendance.chartData.map(i => i.onTime ?? i.on_time ?? 0);
                const late = dashboardData.attendance.chartData.map(i => i.late ?? 0);
                const absent = dashboardData.attendance.chartData.map(i => i.absent ?? 0);

                const data = {
                  labels,
                  datasets: [
                    { data: onTime, color: () => '#10b981', strokeWidth: 2 },
                    { data: late, color: () => '#f59e0b', strokeWidth: 2 },
                    { data: absent, color: () => '#ef4444', strokeWidth: 2 },
                  ],
                  legend: ["Đúng giờ", "Đi muộn", "Vắng"]
                };

                return (
                  <LineChart
                    data={data}
                    width={Math.min(width - 40, 700)}
                    height={220}
                    chartConfig={{
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      color: (opacity = 1) => `rgba(24, 144, 255, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      decimalPlaces: 0,
                    }}
                    bezier
                    style={{ borderRadius: 8 }}
                  />
                );
              })()
            ) : (
              <Text style={styles.placeholderText}>Không có dữ liệu chấm công</Text>
            )}
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biểu đồ đơn từ</Text>
          <Surface style={styles.chartContainer} elevation={1}>
            {dashboardData?.applications?.chartData && dashboardData.applications.chartData.length > 0 ? (
              (() => {
                const labels = dashboardData.applications.chartData.map(i => {
                  const d = new Date(i.date);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                });
                const approved = dashboardData.applications.chartData.map(i => i.approved ?? 0);
                const pending = dashboardData.applications.chartData.map(i => i.pending ?? 0);
                const rejected = dashboardData.applications.chartData.map(i => i.rejected ?? 0);

                const data = {
                  labels,
                  datasets: [
                    { data: approved, color: () => '#10b981', strokeWidth: 2 },
                    { data: pending, color: () => '#f59e0b', strokeWidth: 2 },
                    { data: rejected, color: () => '#ef4444', strokeWidth: 2 },
                  ],
                  legend: ["Duyệt", "Chờ", "Từ chối"]
                };

                return (
                  <LineChart
                    data={data}
                    width={Math.min(width - 40, 700)}
                    height={220}
                    chartConfig={{
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      color: (opacity = 1) => `rgba(24, 144, 255, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      decimalPlaces: 0,
                    }}
                    bezier
                    style={{ borderRadius: 8 }}
                  />
                );
              })()
            ) : (
              <Text style={styles.placeholderText}>Không có dữ liệu đơn từ</Text>
            )}
          </Surface>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 HR Management System</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Matched AppLayout
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    marginLeft: 4,
  },
  dateSelector: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dateSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#595959',
    marginBottom: 12,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateButton: {
    flex: 1,
    borderRadius: 8,
    minWidth: 100,
  },
  searchButton: {
    borderRadius: 8,
    minWidth: 80,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: { // Fixed width issue
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: isTablet ? '32%' : '48%',
    minWidth: 150,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#e8e8e8',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
    padding: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default HomeScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Surface, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AuthTokenManager from '../../services/AuthTokenManager';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const FAKE_STATS = {
  totalEmployees: 156,
  totalDepartments: 12,
  attendanceRate: 94.5,
  pendingApplications: 8,
  activeContracts: 142,
  monthlySalary: 3250000000,
};

const FAKE_ACTIVITIES = [
  { id: 1, icon: 'file-document-outline', title: 'Nguyễn Văn A nộp đơn xin nghỉ phép', time: '10 phút trước', type: 'application' },
  { id: 2, icon: 'check-circle-outline', title: 'HR duyệt hợp đồng cho Trần Thị B', time: '25 phút trước', type: 'contract' },
  { id: 3, icon: 'account-plus-outline', title: 'Nhân viên mới Lê Văn C được thêm vào hệ thống', time: '1 giờ trước', type: 'user' },
  { id: 4, icon: 'clock-alert-outline', title: 'Phạm Thị D chấm công muộn 15 phút', time: '2 giờ trước', type: 'attendance' },
  { id: 5, icon: 'briefcase-outline', title: 'Dự án "Website mới" được tạo bởi Hoàng Văn E', time: '3 giờ trước', type: 'project' },
];

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
          {value.toLocaleString('vi-VN')}{suffix}
        </Text>
      </View>
    </Surface>
  );
};

const ActivityItem = ({ activity }) => {
  const theme = useTheme();
  
  const getActivityColor = (type) => {
    switch (type) {
      case 'application': return theme.colors.primary;
      case 'contract': return '#52c41a';
      case 'user': return '#722ed1';
      case 'attendance': return '#fa8c16';
      case 'project': return '#13c2c2';
      default: return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIconContainer, { backgroundColor: getActivityColor(activity.type) + '20' }]}>
        <MaterialCommunityIcons name={activity.icon} size={20} color={getActivityColor(activity.type)} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={2}>{activity.title}</Text>
        <Text style={styles.activityTime}>{activity.time}</Text>
      </View>
    </View>
  );
};

const HomeScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AuthTokenManager.getUser();
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
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
      <Surface style={styles.header} elevation={2}>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thống kê tổng quan</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="account-group"
              title="Tổng nhân viên"
              value={FAKE_STATS.totalEmployees}
              color="#1890ff"
            />
            <StatCard
              icon="office-building"
              title="Phòng ban"
              value={FAKE_STATS.totalDepartments}
              color="#722ed1"
            />
            <StatCard
              icon="clock-check"
              title="Tỷ lệ chấm công"
              value={FAKE_STATS.attendanceRate}
              suffix="%"
              color="#52c41a"
            />
            <StatCard
              icon="file-document-multiple"
              title="Đơn từ chờ duyệt"
              value={FAKE_STATS.pendingApplications}
              color="#fa8c16"
            />
            <StatCard
              icon="file-document-outline"
              title="Hợp đồng hiện tại"
              value={FAKE_STATS.activeContracts}
              color="#13c2c2"
            />
            <StatCard
              icon="cash-multiple"
              title="Tổng lương tháng"
              value={FAKE_STATS.monthlySalary / 1000000}
              suffix=" triệu"
              color="#eb2f96"
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
            <IconButton
              icon="refresh"
              size={20}
              iconColor={theme.colors.primary}
              onPress={onRefresh}
              style={styles.refreshButton}
            />
          </View>
          <Surface style={styles.activitiesContainer} elevation={1}>
            {FAKE_ACTIVITIES.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ActivityItem activity={activity} />
                {index < FAKE_ACTIVITIES.length - 1 && <Divider style={styles.activityDivider} />}
              </React.Fragment>
            ))}
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch làm việc</Text>
          <Surface style={styles.calendarPlaceholder} elevation={1}>
            <MaterialCommunityIcons name="calendar-month" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.placeholderText}>Lịch làm việc sẽ được hiển thị ở đây</Text>
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
    backgroundColor: '#f5f7fa',
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
    color: '#262626',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 12,
  },
  refreshButton: {
    margin: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 12,
    width: isTablet ? 'calc(33.333% - 12px)' : 'calc(50% - 12px)',
    minWidth: isTablet ? 200 : 150,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#e8e8e8',
  },
  activitiesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  activityDivider: {
    marginVertical: 4,
    backgroundColor: '#f0f0f0',
  },
  calendarPlaceholder: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8c8c8c',
  },
});

export default HomeScreen;

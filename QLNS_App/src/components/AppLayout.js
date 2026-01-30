import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation, DrawerActions, useNavigationState, CommonActions } from '@react-navigation/native';
import { Avatar, Divider, useTheme, MD3LightTheme, Provider as PaperProvider, Surface, ActivityIndicator, List, Portal, Dialog, Button, Paragraph, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthTokenManager from '../../services/AuthTokenManager';
import { useAuth } from '../../services/AuthContext';
import { decodePermissions } from '../utils/decodePermission';
import NotificationService from '../../services/NotificationService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const DRAWER_WIDTH_EXPANDED = isTablet ? 280 : 280; // Widen for better look
const DRAWER_WIDTH_COLLAPSED = 80;

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Import Screens
import HomeScreen from '../../screens/home/HomeScreen';
import RoleListScreen from '../../screens/roles/RoleListScreen';
import RoleNavigator from '../navigation/RoleNavigator';

import ContractListScreen from '../../screens/contracts/ContractListScreen';
import AttendanceListScreen from '../../screens/attendance/AttendanceListScreen';
import AttendanceApprovalScreen from '../../screens/attendance/AttendanceApprovalScreen';
import HolidayScreen from '../../screens/attendance/HolidayScreen'; // New Placeholder
import DailyAttendanceScreen from '../../screens/attendance/DailyAttendanceScreen';
import AttendanceHistoryScreen from '../../screens/attendance/AttendanceHistoryScreen';
import SettingsScreen from '../../screens/settings/SettingsScreen';
import SalaryListScreen from '../../screens/salary/SalaryListScreen';
import AllowanceListScreen from '../../screens/salary/AllowanceListScreen';
import AllowanceFormScreen from '../../screens/salary/AllowanceFormScreen';
import SalaryManagementScreen from '../../screens/salary/SalaryManagementScreen';
import MyPayslipScreen from '../../screens/salary/MyPayslipScreen';
import CVListScreen from '../../screens/cvs/CVListScreen';
import ProjectListScreen from '../../screens/projects/ProjectListScreen';
import ProjectDetailScreen from '../../screens/projects/ProjectDetailScreen';
import ProjectFormScreen from '../../screens/projects/ProjectFormScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import KpiListScreen from '../../screens/kpi/KpiListScreen';
import KpiDetailScreen from '../../screens/kpi/KpiDetailScreen';
import NotificationListScreen from '../../screens/notifications/NotificationListScreen';

// Stack Navigators
import DepartmentNavigator from '../navigation/DepartmentNavigator';
import UserNavigator from '../navigation/UserNavigator';
import { MyApplicationNavigator, ApplicationManagementNavigator } from '../navigation/ApplicationNavigator';
import ChevronNavigator from '../navigation/ChevronNavigator';
import ContractTypeNavigator from '../navigation/ContractTypeNavigator';
import { ShiftRegistrationNavigator, ShiftApprovalNavigator, ShiftConfigurationNavigator } from '../navigation/ShiftNavigator';

const Drawer = createDrawerNavigator();

// Map back buttons for nested screens
const backNavigationMap = {
  'Chi tiết dự án': 'Dự án',
  'Tạo dự án': 'Dự án',
  'Sửa dự án': 'Dự án',
  'Tạo phụ cấp': 'Cấu hình phụ cấp',
  'Sửa phụ cấp': 'Cấu hình phụ cấp',
  'UserDetail': 'Quản lý người dùng',
  'UserForm': 'Quản lý người dùng',
  'UserCreate': 'Quản lý người dùng',
  'UserEdit': 'Quản lý người dùng',
  'Profile': 'Dashboard',
  'Chi tiết KPI': 'Quản lý KPI',
};

// --- Header Components ---
const HeaderBackButton = ({ navigation, routeName }) => (
  <TouchableOpacity
    onPress={() => {
      const targetScreen = backNavigationMap[routeName];
      if (targetScreen) {
        navigation.navigate(targetScreen);
      } else {
        navigation.goBack();
      }
    }}
    style={styles.headerButton}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
  </TouchableOpacity>
);

const HeaderMenuButton = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => navigation.toggleDrawer()}
    style={styles.headerButton}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons name="menu" size={24} color="#1F2937" />
  </TouchableOpacity>
);

const NotificationBellButton = () => {
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await NotificationService.getUnreadCount();
      setUnreadCount(response.data?.data?.unread_count || 0);
    } catch (error) {
      // console.error('Failed to load unread count');
    }
  };

  const loadNotifications = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await NotificationService.getNotifications({ limit: 10, offset: 0 });
      const data = response.data?.data?.notifications || response.data?.data || [];
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellPress = () => {
    setShowPopup(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await NotificationService.markAsRead(notif.notification_id);
      setNotifications(prev =>
        prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
    }
  };

  const handleViewAll = () => {
    setShowPopup(false);
    navigation.navigate('Thông báo');
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
      onPress={() => handleMarkAsRead(item)}
    >
      <View style={[styles.notifIcon, { backgroundColor: item.is_read ? '#f0f0f0' : '#e6f7ff' }]}>
        <MaterialCommunityIcons
          name="bell"
          size={18}
          color={item.is_read ? '#bfbfbf' : theme.colors.primary}
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.is_read && { fontWeight: '700' }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.content && (
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.content}
          </Text>
        )}
        <Text style={styles.notifTime}>{formatTimeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.notifBadgeDot} />}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        onPress={handleBellPress}
        style={styles.headerButton}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="bell-outline" size={24} color="#1F2937" />
        {unreadCount > 0 && (
          <Badge size={16} style={styles.bellBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </TouchableOpacity>

      <Modal
        visible={showPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
        <TouchableOpacity
          style={styles.notifModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPopup(false)}
        >
          <Surface style={styles.notifPopup} elevation={5}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifHeaderTitle}>Thông báo</Text>
              {unreadCount > 0 && (
                <View style={styles.headerBadgeContainer}>
                  <Text style={styles.headerBadgeText}>{unreadCount} mới</Text>
                </View>
              )}
            </View>
            <Divider />
            {loading ? (
              <View style={styles.notifLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <MaterialCommunityIcons name="bell-off-outline" size={48} color="#d9d9d9" />
                <Text style={styles.notifEmptyText}>Chưa có thông báo</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => String(item.notification_id)}
                style={styles.notifList}
                showsVerticalScrollIndicator={false}
              />
            )}
            <Divider />
            <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>Xem tất cả</Text>
            </TouchableOpacity>
          </Surface>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1890FF', // Modern Blue
    secondary: '#722ED1', // Purple accent
    error: '#FF4D4F',
    background: '#F0F2F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onSurface: '#1F2937',
    onSurfaceVariant: '#6B7280',
    primaryContainer: '#E6F7FF', // Light blue background for active
    onPrimaryContainer: '#1890FF',
    outline: '#E5E7EB',
  },
  roundness: 12,
};

// --- MENU DATA Definitions (Exact match with Web) ---
// Structure:
// key: string, label: string, icon: string, route?: string (if leaf),
// permissions?: string[] (array of required permissions - OR logic by default unless requireAllPermissions)
// requireAllPermissions?: boolean
// requirePermission?: 'create'|'read'|'update'|'delete'|'approve' (specific flag check)
// children?: []
// permission?: string (legacy single permission key)

const BASE_MENU_ITEMS = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', route: 'Dashboard' },
  {
    key: 'account_management_parent',
    label: 'Quản lí tài khoản',
    icon: 'account-group-outline',
    children: [
      { key: 'users', label: 'Quản lý người dùng', icon: 'account-outline', route: 'Quản lý người dùng', permission: 'users' },
      { key: 'roles', label: 'Quản lý vai trò', icon: 'shield-account-outline', route: 'Quản lý vai trò', permission: 'roles' },
    ],
    permissions: ['users', 'roles'],
    requireAllPermissions: false
  },
  { key: 'departments', label: 'Quản lý phòng ban', icon: 'office-building-outline', route: 'Quản lý phòng ban', permission: 'departments' },
  { key: 'positions', label: 'Quản lý chức vụ', icon: 'badge-account-horizontal-outline', route: 'Quản lý chức vụ', permission: 'chevrons' },
  { key: 'contractTypes', label: 'Quản lý loại hợp đồng', icon: 'file-document-edit-outline', route: 'Quản lý loại hợp đồng', permission: 'contractTypes' },
  { key: 'contracts', label: 'Quản lý hợp đồng', icon: 'file-document-outline', route: 'Quản lý hợp đồng', permission: 'contracts' }, // Web might not have 'contracts' explicit permission on menu item? Web: 'contractTypes' is there. 'contracts' is... wait. Web: getItem('Quản lí hợp đồng', 'contractTypes', ...). Note: Web only has 'contractTypes' menu item which leads to managing TYPES?
  // User check: Web menu item 'Quản lí hợp đồng' (contractTypes) maps to 'contractTypes' permission.
  // App has SEPARATE 'contracts' (Quản lý hợp đồng) and 'contractTypes' (Quản lý loại hợp đồng).
  // I will keep App structure but fix permissions.

  {
    key: 'applications_parent',
    label: 'Danh sách đơn từ',
    icon: 'file-multiple-outline',
    children: [
      { key: 'myApplications', label: 'Đơn từ cá nhân', icon: 'file-account-outline', route: 'Đơn từ cá nhân', permission: 'applications' },
      { key: 'manageApplications', label: 'Quản lý đơn từ', icon: 'file-check-outline', route: 'Quản lý đơn từ', permission: 'applications', requirePermission: 'approve' },
      // Shift items
      { key: 'shiftRegistration', label: 'Đăng ký ca', icon: 'calendar-plus', route: 'Đăng ký ca', permission: 'shiftRegistration', requirePermission: 'create' },
      { key: 'shiftApproval', label: 'Duyệt đơn đăng ký ca', icon: 'calendar-check-outline', route: 'Duyệt đơn đăng ký ca', permission: 'shiftApproval', requirePermission: 'approve' },
      { key: 'shiftConfiguration', label: 'Cấu hình ca', icon: 'cog-outline', route: 'Cấu hình ca', permission: 'shiftConfiguration', requirePermission: 'read' },
    ],
    permissions: ['applications'] // Web uses ONLY 'applications' for parent visibility check? 
    // Web: permissions: ['applications']. So if I have shiftRegistration but NOT applications, Web shows parent?
    // Web logic: "If item has children, and filteredChildren > 0, return parent". match!
    // "If filteredChildren is 0, check item.permissions".
    // So if I have 'shiftRegistration', I see the child. Thus filteredChildren > 0. Thus Parent shows.
    // If I have no children access, Parent checks 'applications' permission. If fail, hidden.
    // So this is correct.
  },
  {
    key: 'attendance_parent',
    label: 'Chấm công',
    icon: 'calendar-clock-outline',
    children: [
      { key: 'attendance', label: 'Bảng chấm công', icon: 'calendar-month-outline', route: 'Chấm công', permission: 'timeAttendance' },
      { key: 'attendanceApproval', label: 'Duyệt bảng chấm công', icon: 'check-decagram-outline', route: 'Duyệt bảng chấm công', permission: 'timeAttendance', requirePermission: 'approve' },
      { key: 'dailyAttendance', label: 'Chấm công hàng ngày', icon: 'calendar-check', route: 'Chấm công hàng ngày', permission: 'dailyAttendance' },
      { key: 'attendanceHistory', label: 'Lịch sử chấm công', icon: 'history', route: 'Lịch sử chấm công', permission: 'timeAttendance' },
      { key: 'holidays', label: 'Quản lý ngày lễ', icon: 'calendar-star-outline', route: 'Quản lý ngày lễ', permission: 'settings' },
    ],
    permissions: ['timeAttendance', 'settings', 'dailyAttendance']
  },
  { key: 'settings', label: 'Cài đặt hệ thống', icon: 'cog-outline', route: 'Cài đặt hệ thống', permission: 'settings' },
  {
    key: 'salary_parent',
    label: 'Quản lý lương',
    icon: 'cash-multiple',
    children: [
      { key: 'salary_allowances', label: 'Cấu hình phụ cấp', icon: 'currency-usd', route: 'Cấu hình phụ cấp', permission: 'salary_allowances' },
      { key: 'salaries', label: 'Quản lý bảng lương', icon: 'file-table-outline', route: 'Quản lý bảng lương', permission: 'salaries' },
      { key: 'personal_salary_info', label: 'Bảng lương cá nhân', icon: 'cash-fast', route: 'Bảng lương cá nhân', permission: 'personal_salary_info' },
    ],
    permissions: ['salary_allowances']
  },
  {
    key: 'job_management_parent',
    label: 'Quản lý công việc',
    icon: 'briefcase-outline',
    children: [
      { key: 'CV', label: 'Quản lý hồ sơ/CV', icon: 'file-account-details-outline', route: 'Hồ sơ/CV', permission: 'CV' },
      { key: 'projects', label: 'Danh sách dự án', icon: 'folder-outline', route: 'Dự án', permission: 'projects' },
      { key: 'kpiManagement', label: 'Quản lý KPI', icon: 'chart-line', route: 'Quản lý KPI', permission: 'kpiManagement' },
    ],
    permissions: [] // Web has no permissions for this parent!
  },
];

const CustomDrawerContent = ({ isCollapsed, setIsCollapsed, userPermissions, userData, ...props }) => {
  const [expandedKeys, setExpandedKeys] = useState({});
  const theme = useTheme();
  const currentRoute = useNavigationState((state) => state?.routes[state.index]?.name);
  const { logout } = useAuth();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const toggleExpand = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filterMenuItems = useCallback((items) => {
    if (!items) return [];

    // ADMIN Override: Role ID 1 sees ALL
    const isAdmin = userData?.roleId === 1 || userData?.user?.roleId === 1;

    return items.flatMap(item => {
      // 1. Process Children first
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children);

        // If has valid children, ALWAYS show parent
        if (filteredChildren.length > 0) {
          return [{ ...item, children: filteredChildren }];
        }

        // If children are empty, check if Parent itself has explicit permission to be shown alone or as empty container
        // Web Logic: 
        // if (item.permissions && item.permissions.length > 0) { ifHasAccess -> return parentWithEmptyChildren }
        // else if (parentPermissionKey) { ifHasAccess -> return parentWithEmptyChildren }
        // else return [] (Hide)

        if (isAdmin) return [{ ...item, children: [] }]; // Admin sees empty parents? Maybe not desired, but "sees all".
        // Actually web says: Admin returns [item]. So yes.

        // Check Permissions Array
        if (item.permissions && item.permissions.length > 0) {
          const requireAll = item.requireAllPermissions || false;
          // Check logic
          const hasAccess = item.permissions.some(key => {
            const val = userPermissions[key];
            if (!val) return false;
            // Simple read check for existence
            return decodePermissions(parseInt(val)).read;
          });

          if (hasAccess) return [{ ...item, children: [] }];
        }

        // Check Single Permission Legacy
        if (item.permission) {
          const val = userPermissions[item.permission];
          if (val && decodePermissions(parseInt(val)).read) {
            return [{ ...item, children: [] }];
          }
        }

        // If NO permissions specified for parent and NO children -> HIDE
        return [];
      }

      // 2. Process Leaf Item
      // Admin Check
      if (isAdmin) return [item];

      // Check requirePermission (e.g. 'approve', 'create')
      if (item.requirePermission) {
        const key = item.permission;
        if (!key) return [];
        const val = userPermissions[key];
        if (!val) return [];
        const decoded = decodePermissions(parseInt(val));
        if (!decoded.read || !decoded[item.requirePermission]) return [];
        return [item];
      }

      // Check Permissions Array (rare for leaf, but possible)
      if (item.permissions && item.permissions.length > 0) {
        // Logic for array on leaf? Usually implies ONE of them is enough (unless requireAll)
        const hasAccess = item.permissions.some(key => {
          const val = userPermissions[key];
          if (!val) return false;
          return decodePermissions(parseInt(val)).read;
        });
        return hasAccess ? [item] : [];
      }

      // Check Single Permission (Read)
      if (item.permission) {
        const val = userPermissions[item.permission];
        if (!val) return [];
        const decoded = decodePermissions(parseInt(val));
        return decoded.read ? [item] : [];
      }

      // If no permission requirements -> Public item (like Dashboard)
      return [item];
    });
  }, [userPermissions, userData]);

  const filteredMenuItems = useMemo(() => filterMenuItems(BASE_MENU_ITEMS), [filterMenuItems]);

  // Hook Rule Fix: Moved useEffect to component level, out of renderMenuItem
  useEffect(() => {
    if (!currentRoute || !filteredMenuItems) return;

    const newExpandedKeys = {};
    let shouldUpdate = false;

    const checkExpand = (items) => {
      items.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.route === currentRoute);
          if (hasActiveChild) {
            newExpandedKeys[item.key] = true;
            if (!expandedKeys[item.key]) {
              shouldUpdate = true;
            }
          }
          checkExpand(item.children);
        }
      });
    };

    checkExpand(filteredMenuItems);

    if (shouldUpdate) {
      setExpandedKeys(prev => ({ ...prev, ...newExpandedKeys }));
    }
  }, [currentRoute, filteredMenuItems]);


  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => setLogoutDialogVisible(true);
  const confirmLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

  const renderMenuItem = (item, level = 0) => {
    const isParent = !!item.children;
    const isExpanded = expandedKeys[item.key];
    const isActive = props.state?.routeNames[props.state.index] === item.route;

    // Removed nested useEffect

    if (isParent) {
      return (
        <View key={item.key} style={styles.menuGroup}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemParent]}
            onPress={() => toggleExpand(item.key)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={item.icon} size={22} color={theme.colors.onSurfaceVariant} />
            {!isCollapsed && (
              <>
                <Text style={styles.menuItemText}>{item.label}</Text>
                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-down" : "chevron-right"}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </>
            )}
          </TouchableOpacity>
          {isExpanded && !isCollapsed && (
            <View style={styles.subMenuContainer}>
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </View>
          )}
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.menuItem,
          isActive && styles.menuItemActive,
          level > 0 && styles.menuItemNested
        ]}
        onPress={() => {
          if (item.route) {
            props.navigation.navigate(item.route);
            if (!isTablet) props.navigation.closeDrawer();
          }
        }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={22}
          color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
        {!isCollapsed && (
          <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
            {item.label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Surface style={styles.drawerContent} elevation={0}>
      {/* Header */}
      <View style={[styles.drawerHeader, isCollapsed && { justifyContent: 'center' }]}>
        <MaterialCommunityIcons name="briefcase-account" size={32} color={theme.colors.primary} />
        {!isCollapsed && <Text style={styles.appName}>HR System</Text>}
      </View>

      {/* User Info */}
      {!isCollapsed ? (
        <Surface style={styles.userCard} elevation={1}>
          <Avatar.Text size={42} label={getUserInitials(userData?.username || userData?.fullName)} style={{ backgroundColor: theme.colors.primary }} />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{userData?.username || userData?.fullName || 'User'}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{userData?.role || 'Staff'}</Text>
          </View>
        </Surface>
      ) : (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <Avatar.Text size={40} label={getUserInitials(userData?.username)} style={{ backgroundColor: theme.colors.primary }} />
        </View>
      )}

      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </ScrollView>

      <Divider style={styles.divider} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={22} color={theme.colors.error} />
        {!isCollapsed && <Text style={styles.logoutText}>Đăng xuất</Text>}
      </TouchableOpacity>

      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Xác nhận</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn đăng xuất không?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Hủy</Button>
            <Button onPress={confirmLogout} textColor={theme.colors.error}>Đăng xuất</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
};

const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const data = await AuthTokenManager.getUser();
      setUserData(data);
      setUserPermissions(data?.permissions || {});
    } catch (error) {
      console.error('Error loading user data', error);
    }
  };

  return (
    <PaperProvider theme={AppTheme}>
      <View style={{ flex: 1, backgroundColor: AppTheme.colors.background }}>
        <Drawer.Navigator
          drawerContent={(props) => (
            <CustomDrawerContent
              {...props}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              userPermissions={userPermissions}
              userData={userData}
            />
          )}
          screenOptions={{
            headerShown: true,
            headerStyle: {
              backgroundColor: '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#F0F0F0',
              height: 60,
            },
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
              color: '#1F2937'
            },
            headerLeft: () => null, // We use custom buttons in screens or default
            drawerType: isTablet ? 'permanent' : 'front',
            drawerStyle: {
              width: isTablet ? (isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED) : DRAWER_WIDTH_EXPANDED,
              backgroundColor: '#FFFFFF',
              borderRightWidth: 1,
              borderRightColor: '#F0F0F0',
            },
            overlayColor: 'rgba(0,0,0,0.4)',
          }}
        >
          {/* Main Screens */}
          <Drawer.Screen name="Dashboard" component={HomeScreen} options={({ navigation }) => ({
            headerLeft: () => <HeaderMenuButton navigation={navigation} />,
            headerRight: () => <NotificationBellButton />
          })} />

          <Drawer.Screen name="Quản lý người dùng" component={UserNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý vai trò" component={RoleNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý phòng ban" component={DepartmentNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý chức vụ" component={ChevronNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý loại hợp đồng" component={ContractTypeNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý hợp đồng" component={ContractListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />

          <Drawer.Screen name="Đơn từ cá nhân" component={MyApplicationNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý đơn từ" component={ApplicationManagementNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Đăng ký ca" component={ShiftRegistrationNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Duyệt đơn đăng ký ca" component={ShiftApprovalNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Cấu hình ca" component={ShiftConfigurationNavigator} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />

          <Drawer.Screen name="Chấm công" component={AttendanceListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Duyệt bảng chấm công" component={AttendanceApprovalScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý ngày lễ" component={HolidayScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Chấm công hàng ngày" component={DailyAttendanceScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Lịch sử chấm công" component={AttendanceHistoryScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />

          <Drawer.Screen name="Cấu hình phụ cấp" component={AllowanceListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý bảng lương" component={SalaryManagementScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Bảng lương cá nhân" component={MyPayslipScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />

          <Drawer.Screen name="Hồ sơ/CV" component={CVListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Dự án" component={ProjectListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Quản lý KPI" component={KpiListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />

          <Drawer.Screen name="Cài đặt hệ thống" component={SettingsScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />
          <Drawer.Screen name="Thông báo" component={NotificationListScreen} options={({ navigation }) => ({ headerLeft: () => <HeaderMenuButton navigation={navigation} />, headerRight: () => <NotificationBellButton /> })} />

          {/* Hidden Detail Screens */}
          <Drawer.Screen name="Profile" component={ProfileScreen} options={({ navigation }) => ({ title: 'Hồ sơ cá nhân', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Profile" /> })} />
          <Drawer.Screen name="Chi tiết dự án" component={ProjectDetailScreen} options={({ navigation }) => ({ title: 'Chi tiết dự án', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Chi tiết dự án" /> })} />
          <Drawer.Screen name="Tạo dự án" component={ProjectFormScreen} options={({ navigation }) => ({ title: 'Tạo dự án', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Tạo dự án" /> })} />
          <Drawer.Screen name="Sửa dự án" component={ProjectFormScreen} options={({ navigation }) => ({ title: 'Sửa dự án', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Sửa dự án" /> })} />
          <Drawer.Screen name="Tạo phụ cấp" component={AllowanceFormScreen} options={({ navigation }) => ({ title: 'Tạo phụ cấp', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Tạo phụ cấp" /> })} />
          <Drawer.Screen name="Sửa phụ cấp" component={AllowanceFormScreen} options={({ navigation }) => ({ title: 'Sửa phụ cấp', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Sửa phụ cấp" /> })} />
          <Drawer.Screen name="Chi tiết KPI" component={KpiDetailScreen} options={({ navigation }) => ({ title: 'Chi tiết KPI', drawerItemStyle: { display: 'none' }, headerLeft: () => <HeaderBackButton navigation={navigation} routeName="Chi tiết KPI" /> })} />

        </Drawer.Navigator>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  drawerContent: { flex: 1, backgroundColor: '#FFFFFF' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 30 },
  appName: { fontSize: 22, fontWeight: '800', color: '#1890FF', marginLeft: 12 },
  userCard: { margin: 16, padding: 12, borderRadius: 12, backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center' },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  userRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  menuList: { flex: 1, paddingHorizontal: 12 },
  divider: { marginVertical: 8, backgroundColor: '#E5E7EB' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16, borderRadius: 8, marginHorizontal: 12 },
  logoutText: { color: '#FF4D4F', fontWeight: '600', marginLeft: 12 },

  menuGroup: { marginBottom: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginVertical: 2 },
  menuItemActive: { backgroundColor: '#E6F7FF' },
  menuItemText: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#4B5563' },
  menuItemTextActive: { color: '#1890FF', fontWeight: '700' },
  menuItemParent: {},
  menuItemNested: { marginLeft: 12 },
  subMenuContainer: { marginLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E5E7EB', paddingLeft: 4 },

  headerButton: { padding: 8, marginHorizontal: 4 },
  bellBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FF4D4F', fontSize: 10 },

  // Notification Popup Styles
  notifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
  notifPopup: { width: 360, backgroundColor: 'white', borderRadius: 12, maxHeight: 600, overflow: 'hidden' },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  notifHeaderTitle: { fontSize: 18, fontWeight: '700' },
  headerBadgeContainer: { backgroundColor: '#E6F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  headerBadgeText: { color: '#1890FF', fontSize: 12, fontWeight: '600' },
  notifLoading: { padding: 20, alignItems: 'center' },
  notifEmpty: { padding: 30, alignItems: 'center' },
  notifEmptyText: { marginTop: 10, color: '#9CA3AF' },
  notifList: { maxHeight: 400 },
  notifItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  notifItemUnread: { backgroundColor: '#FAFAFA' },
  notifIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, color: '#1F2937', marginBottom: 4 },
  notifBody: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  notifTime: { fontSize: 12, color: '#9CA3AF' },
  notifBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1890FF', marginTop: 6, marginLeft: 6 },
  viewAllButton: { padding: 16, alignItems: 'center' },
  viewAllText: { fontWeight: '600', fontSize: 14 },
});

export default AppLayout;

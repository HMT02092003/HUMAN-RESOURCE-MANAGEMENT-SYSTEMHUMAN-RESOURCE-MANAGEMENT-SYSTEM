import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation, DrawerActions, useNavigationState, CommonActions } from '@react-navigation/native';
import { Avatar, Divider, useTheme, MD3LightTheme, Provider as PaperProvider, Surface, ActivityIndicator, List, Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthTokenManager from '../../services/AuthTokenManager';
import { useAuth } from '../../services/AuthContext';
import { decodePermissions } from '../utils/decodePermission';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const DRAWER_WIDTH_EXPANDED = isTablet ? 280 : 260;
const DRAWER_WIDTH_COLLAPSED = 72;

import HomeScreen from '../../screens/home/HomeScreen';
import UserManagementScreen from '../../screens/users/UserManagementScreen';
import UserDetailScreen from '../../screens/users/UserDetailScreen';
import UserFormScreen from '../../screens/users/UserFormScreen';
import RoleListScreen from '../../screens/roles/RoleListScreen';
import DepartmentListScreen from '../../screens/departments/DepartmentListScreen';
import PositionListScreen from '../../screens/positions/PositionListScreen';
import ContractListScreen from '../../screens/contracts/ContractListScreen';
import ApplicationListScreen from '../../screens/applications/ApplicationListScreen';
import AttendanceListScreen from '../../screens/attendance/AttendanceListScreen';
import SettingsScreen from '../../screens/settings/SettingsScreen';
import SalaryListScreen from '../../screens/salary/SalaryListScreen';
import CVListScreen from '../../screens/cvs/CVListScreen';
import ProjectListScreen from '../../screens/projects/ProjectListScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';

const Drawer = createDrawerNavigator();

// Header Buttons Components - Isolated to avoid Reanimated conflicts
const HeaderBackButton = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => {
      console.log('⬅️ [Navigation] Back button pressed');
      navigation.goBack();
    }}
    style={{ paddingHorizontal: 16, paddingVertical: 8 }}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
  </TouchableOpacity>
);

const HeaderMenuButton = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => navigation.toggleDrawer()}
    style={{ paddingHorizontal: 16, paddingVertical: 8 }}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons name="menu" size={24} color="#ffffff" />
  </TouchableOpacity>
);

const AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1890ff',
    error: '#ff4d4f',
    background: '#f5f7fa',
    surface: '#ffffff',
    surfaceVariant: '#f0f2f5',
    onSurface: '#262626',
    onSurfaceVariant: '#8c8c8c',
    primaryContainer: 'rgba(24, 144, 255, 0.08)',
  },
};



const BASE_MENU_ITEMS = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'view-dashboard', route: 'Dashboard' },
  {
    key: 'account_management_parent',
    label: 'Quản lí tài khoản',
    icon: 'account-group',
    children: [
      { key: 'users', label: 'Quản lý người dùng', icon: 'account-multiple', route: 'Quản lý người dùng', permission: 'users' },
      { key: 'roles', label: 'Quản lý vai trò', icon: 'shield-account', route: 'Quản lý vai trò', permission: 'roles' },
    ],
    permissions: ['users', 'roles'],
    requireAllPermissions: false
  },
  { key: 'departments', label: 'Quản lý phòng ban', icon: 'office-building', route: 'Quản lý phòng ban', permission: 'departments' },
  { key: 'positions', label: 'Quản lý chức vụ', icon: 'badge-account-horizontal', route: 'Quản lý chức vụ', permission: 'chevrons' },
  { key: 'contracts', label: 'Quản lý hợp đồng', icon: 'file-document', route: 'Quản lý hợp đồng', permission: 'contractTypes' },
  {
    key: 'applications_parent',
    label: 'Danh sách đơn từ',
    icon: 'file-multiple',
    children: [
      { key: 'applications', label: 'Danh sách đơn từ', icon: 'file-document-edit', route: 'Danh sách đơn từ', permission: 'applications' },
    ],
    permissions: ['applications']
  },
  {
    key: 'attendance_parent',
    label: 'Chấm công',
    icon: 'clock-check',
    children: [
      { key: 'attendance', label: 'Chấm công', icon: 'calendar-clock', route: 'Chấm công', permission: 'timeAttendance' },
    ],
    permissions: ['timeAttendance']
  },
  {
    key: 'salary_parent',
    label: 'Quản lý lương',
    icon: 'cash-multiple',
    children: [
      { key: 'salary', label: 'Quản lý lương', icon: 'cash', route: 'Quản lý lương', permission: 'salaries' },
    ],
    permissions: ['salaries', 'salary_allowances', 'personal_salary_info'],
    requireAllPermissions: false
  },
  {
    key: 'job_management_parent',
    label: 'Quản lý công việc',
    icon: 'briefcase',
    children: [
      { key: 'cv', label: 'Hồ sơ/CV', icon: 'file-account', route: 'Hồ sơ/CV' },
      { key: 'projects', label: 'Dự án', icon: 'folder-multiple', route: 'Dự án' },
    ]
  },
  { key: 'settings', label: 'Cài đặt hệ thống', icon: 'cog', route: 'Cài đặt hệ thống', permission: 'settings' },
];

const CustomDrawerContent = ({ isCollapsed, setIsCollapsed, userPermissions, ...props }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const navigation = useNavigation();
  const theme = useTheme();
  const currentRoute = useNavigationState((state) => state?.routes[state.index]?.name);
  
  // Sử dụng AuthContext để logout
  const { logout } = useAuth();

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

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    console.log('🔴 [LOGOUT] Nút đăng xuất được bấm!');
    console.log('🔴 [LOGOUT] Hiển thị dialog xác nhận...');
    setLogoutDialogVisible(true);
  };

  const confirmLogout = async () => {
    console.log('🔴 [LOGOUT] Người dùng xác nhận đăng xuất');
    setLogoutDialogVisible(false);
    
    console.log('🔴 [LOGOUT] Bắt đầu quá trình đăng xuất...');
    
    try {
      console.log('🔴 [LOGOUT] Calling logout from AuthContext...');
      // Gọi logout từ AuthContext - nó sẽ xóa tokens và update auth state
      await logout();
      console.log('✅ [LOGOUT] Logout successful - AuthContext will handle navigation to Login');
      // Không cần navigate thủ công - AuthContext sẽ tự động chuyển về Login
    } catch (error) {
      console.error('❌ [LOGOUT] Lỗi:', error);
      console.error('❌ [LOGOUT] Stack:', error.stack);
    }
  };

  const cancelLogout = () => {
    console.log('🔴 [LOGOUT] Người dùng hủy đăng xuất');
    setLogoutDialogVisible(false);
  };

  const filterMenuItems = useCallback((items) => {
    return items.flatMap(item => {
      // Helper to check permissions
      const hasPermissionAccess = (permissionKeys, requireAll = false) => {
        if (!permissionKeys || permissionKeys.length === 0) return false;

        const permissionChecks = permissionKeys.map(key => {
          const permissionValue = userPermissions[key];
          if (permissionValue === undefined || permissionValue === null || permissionValue === '') {
            return false;
          }
          try {
            const hasRead = decodePermissions(parseInt(permissionValue)).read;
            return hasRead;
          } catch (e) {
            return false;
          }
        });

        return requireAll ?
          permissionChecks.every(check => check) :
          permissionChecks.some(check => check);
      };

      // Handle children
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children);

        if (filteredChildren.length > 0) {
          return [{ ...item, children: filteredChildren }];
        }

        if (item.permissions && item.permissions.length > 0) {
          const requireAll = item.requireAllPermissions || false;
          if (hasPermissionAccess(item.permissions, requireAll)) {
            return [{ ...item, children: filteredChildren }];
          }
          return [];
        }

        // Check parent permission if no specific permissions array
        const parentPermissionKey = item.permission;
        if (parentPermissionKey) {
          const permVal = userPermissions[parentPermissionKey];
          if (permVal && decodePermissions(parseInt(permVal)).read) {
            return [{ ...item, children: filteredChildren }];
          }
          return [];
        }

        // If no permissions required for group, but has children
        // If children are all filtered out, we usually hide the group
        return [];
      }

      // Handle single item

      // Check requirePermission (e.g. 'approve')
      if (item.requirePermission) {
        const permKey = item.permission;
        if (!permKey) return [];
        const permVal = userPermissions[permKey];
        if (!permVal) return [];

        try {
          const decoded = decodePermissions(parseInt(permVal));
          if (!decoded.read || !decoded[item.requirePermission]) return [];
          return [item];
        } catch (e) {
          return [];
        }
      }

      // Check permissions array
      if (item.permissions && item.permissions.length > 0) {
        const requireAll = item.requireAllPermissions || false;
        return hasPermissionAccess(item.permissions, requireAll) ? [item] : [];
      }

      // Check single permission
      const permissionKey = item.permission;
      if (!permissionKey) return [item];

      const permissionValue = userPermissions[permissionKey];
      if (!permissionValue) return [];

      try {
        const decoded = decodePermissions(parseInt(permissionValue));
        return decoded.read ? [item] : [];
      } catch (e) {
        return [];
      }
    });
  }, [userPermissions]);

  const filteredMenuItems = useMemo(() => filterMenuItems(BASE_MENU_ITEMS), [filterMenuItems]);

  const handleNavigation = (route) => {
    if (route) {
      props.navigation.navigate(route);
      if (!isTablet) props.navigation.dispatch(DrawerActions.closeDrawer());
    }
  };

  const renderMenuItem = (item, isNested = false) => {
    const isActive = currentRoute === item.route;

    if (item.children) {
      return (
        <List.Accordion
          key={item.key}
          title={item.label}
          left={() => (
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name={item.icon} size={22} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          style={styles.menuItem}
          titleStyle={styles.menuItemText}
        >
          {item.children.map(child => renderMenuItem(child, true))}
        </List.Accordion>
      );
    }

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.menuItem, isActive && styles.menuItemActive, isNested && styles.menuItemNested]}
        onPress={() => handleNavigation(item.route)}
      >
        <View style={styles.menuItemContent}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name={item.icon} size={22} color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          </View>
          {!isCollapsed && <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>{item.label}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Surface style={[styles.drawerContainer, isCollapsed && styles.drawerContainerCollapsed]}>
      <View style={[styles.drawerHeader, isCollapsed && styles.drawerHeaderCollapsed]}>
        {!isCollapsed ? (
          <>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="briefcase-account" size={32} color={theme.colors.primary} />
              <Text style={styles.logoText}>HR System</Text>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={() => setIsCollapsed(false)} style={{ padding: 8 }}>
            <MaterialCommunityIcons name="menu" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        {/* Only show collapse button on Tablet/Desktop */}
        {isTablet && !isCollapsed && (
          <TouchableOpacity onPress={() => setIsCollapsed(true)} style={styles.collapseButton}>
            <MaterialCommunityIcons name="menu-open" size={24} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
      <Divider />
      {!isCollapsed && (
        <Surface style={styles.userSection} elevation={1}>
          <Avatar.Text size={48} label={userData ? getUserInitials(userData.username || userData.fullName) : 'U'} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{(userData && (userData.username || userData.fullName)) || 'User'}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{(userData && userData.role) || 'Role'}</Text>
          </View>
        </Surface>
      )}
      {isCollapsed && userData && (
        <View style={styles.userSectionCollapsed}>
          <Avatar.Text size={40} label={getUserInitials(userData.username || userData.fullName)} style={styles.avatar} />
        </View>
      )}
      <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          filteredMenuItems.map((item) => renderMenuItem(item))
        )}
      </ScrollView>
      <Divider />
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => {
          console.log('🟢 [UI] Nút Đăng xuất được bấm từ TouchableOpacity');
          handleLogout();
        }}
      >
        <MaterialCommunityIcons name="logout" size={22} color={theme.colors.error} />
        {!isCollapsed && <Text style={styles.logoutText}>Đăng xuất</Text>}
      </TouchableOpacity>
      
      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={cancelLogout}>
          <Dialog.Title>Xác nhận đăng xuất</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn đăng xuất?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelLogout}>Hủy</Button>
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

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    try {
      const userData = await AuthTokenManager.getUser();
      const permissions = userData?.permissions || {};
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  return (
    <PaperProvider theme={AppTheme}>
      <View style={styles.container}>
        <Drawer.Navigator
          useLegacyImplementation={false}
          drawerContent={(props) => (
            <CustomDrawerContent {...props} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} userPermissions={userPermissions} />
          )}
          screenOptions={({ navigation, route }) => {
            // Check if this is a hidden screen (detail/form screens)
            const isHiddenScreen = ['UserDetail', 'UserForm', 'Profile'].includes(route.name);
            
            return {
              drawerType: isTablet ? 'permanent' : 'front',
              drawerStyle: {
                width: isTablet && isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED,
                backgroundColor: AppTheme.colors.surface
              },
              headerShown: true,
              headerStyle: {
                backgroundColor: AppTheme.colors.primary,
              },
              headerTintColor: '#ffffff',
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
              },
              // Use back button for hidden screens, menu button for main screens
              headerLeft: isHiddenScreen 
                ? () => <HeaderBackButton navigation={navigation} />
                : () => <HeaderMenuButton navigation={navigation} />,
              headerRight: null,
              swipeEnabled: !isTablet,
              overlayColor: 'rgba(0, 0, 0, 0.5)',
              animationEnabled: true,
            };
          }}
        >
          <Drawer.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Trang chủ', headerShown: true }} />
          <Drawer.Screen name="Quản lý người dùng" component={UserManagementScreen} />
          <Drawer.Screen name="UserDetail" component={UserDetailScreen} options={{ drawerItemStyle: { display: 'none' }, title: 'Chi tiết người dùng' }} />
          <Drawer.Screen name="UserForm" component={UserFormScreen} options={{ drawerItemStyle: { display: 'none' }, title: 'Người dùng' }} />
          <Drawer.Screen name="Quản lý vai trò" component={RoleListScreen} />
          <Drawer.Screen name="Quản lý phòng ban" component={DepartmentListScreen} />
          <Drawer.Screen name="Quản lý chức vụ" component={PositionListScreen} />
          <Drawer.Screen name="Quản lý hợp đồng" component={ContractListScreen} />
          <Drawer.Screen name="Danh sách đơn từ" component={ApplicationListScreen} />
          <Drawer.Screen name="Chấm công" component={AttendanceListScreen} />
          <Drawer.Screen name="Quản lý lương" component={SalaryListScreen} />
          <Drawer.Screen name="Hồ sơ/CV" component={CVListScreen} />
          <Drawer.Screen name="Dự án" component={ProjectListScreen} />
          <Drawer.Screen name="Cài đặt hệ thống" component={SettingsScreen} />
          <Drawer.Screen name="Profile" component={ProfileScreen} options={{ drawerItemStyle: { display: 'none' }, title: 'Hồ sơ cá nhân' }} />
        </Drawer.Navigator>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  drawerContainer: { flex: 1, backgroundColor: AppTheme.colors.surface },
  drawerContainerCollapsed: { alignItems: 'center' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, minHeight: 70 },
  drawerHeaderCollapsed: { justifyContent: 'center', paddingHorizontal: 8 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { marginLeft: 8, fontSize: 18, fontWeight: '700', color: AppTheme.colors.primary },
  collapseButton: { padding: 8 },
  userSection: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 12, marginVertical: 8, borderRadius: 12, backgroundColor: AppTheme.colors.surfaceVariant },
  userSectionCollapsed: { alignItems: 'center', paddingVertical: 12 },
  avatar: { backgroundColor: AppTheme.colors.primary },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: AppTheme.colors.onSurface, marginBottom: 2 },
  userRole: { fontSize: 13, color: AppTheme.colors.onSurfaceVariant },
  menuScrollView: { flex: 1 },
  menuContentContainer: { paddingVertical: 8, paddingHorizontal: 8 },
  loadingContainer: { padding: 24, alignItems: 'center' },
  menuItem: { borderRadius: 8, marginVertical: 2, overflow: 'hidden' },
  menuItemActive: { backgroundColor: AppTheme.colors.primaryContainer },
  menuItemContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: AppTheme.colors.onSurface, marginLeft: 12, flex: 1 },
  menuItemTextActive: { color: AppTheme.colors.primary, fontWeight: '600' },
  expandIcon: { marginLeft: 'auto' },
  submenuContainer: { marginTop: 4 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginTop: 8 },
  logoutText: { fontSize: 14, fontWeight: '600', color: AppTheme.colors.error, marginLeft: 16 },
  iconWrapper: { width: 36, alignItems: 'center', justifyContent: 'center' },
  menuItemNested: { paddingLeft: 20 },
});

export default AppLayout;

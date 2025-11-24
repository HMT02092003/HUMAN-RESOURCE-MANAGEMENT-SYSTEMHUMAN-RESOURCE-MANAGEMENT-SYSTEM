import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  Alert, 
  Dimensions,
  StatusBar 
} from 'react-native';
import { 
  Surface, 
  Text, 
  Searchbar, 
  FAB, 
  Card, 
  Avatar, 
  Chip, 
  IconButton,
  useTheme,
  ActivityIndicator,
  Badge,
  Divider,
  Portal,
  Button
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UserService from '../../services/UserService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const PAGE_SIZE = 10;

const UserManagementScreen = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    loadUsers(1, true);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.username?.toLowerCase().includes(query) ||
          user.fullName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.role?.name?.toLowerCase().includes(query) ||
          user.department?.name?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const loadUsers = async (pageNumber = 1, isRefresh = false) => {
    if (loading) return;
    if (!hasMore && !isRefresh && pageNumber > 1) return;

    try {
      setLoading(true);
      console.log('📥 [UserManagement] Loading users page:', pageNumber);
      
      const response = await UserService.getAllUsers({
        page: pageNumber,
        pageSize: PAGE_SIZE
      });

      const newUsers = response.results || [];
      const total = response.total || 0;

      console.log('✅ [UserManagement] Loaded', newUsers.length, 'users, total:', total);

      if (isRefresh) {
        setUsers(newUsers);
        setPage(1);
        setHasMore(newUsers.length < total);
      } else {
        setUsers((prevUsers) => [...prevUsers, ...newUsers]);
        setPage(pageNumber);
        setHasMore(users.length + newUsers.length < total);
      }

      setTotalUsers(total);
    } catch (error) {
      console.error('❌ [UserManagement] Error loading users:', error);
      Alert.alert(
        'Lỗi tải dữ liệu',
        error.response?.data?.message || 'Không thể tải danh sách người dùng. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('🔄 [UserManagement] Refreshing...');
    setRefreshing(true);
    setHasMore(true);
    loadUsers(1, true);
  }, []);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      console.log('📄 [UserManagement] Loading more...');
      loadUsers(page + 1, false);
    }
  };

  const handleDeleteUser = (userId, userName) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa người dùng "${userName}"?\n\nThao tác này không thể hoàn tác.`,
      [
        { 
          text: 'Hủy', 
          style: 'cancel',
          onPress: () => console.log('❌ Delete cancelled')
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [UserManagement] Deleting user:', userId);
              await UserService.deleteUser(userId);
              Alert.alert('✅ Thành công', 'Đã xóa người dùng');
              onRefresh();
            } catch (error) {
              console.error('❌ [UserManagement] Delete failed:', error);
              Alert.alert(
                'Lỗi', 
                error.response?.data?.message || 'Không thể xóa người dùng'
              );
            }
          }
        }
      ]
    );
  };

  const handleChangeStatus = async (userId, currentStatus, userName) => {
    // API dùng "1" = active, "0" = inactive
    const newStatus = (currentStatus === '1' || currentStatus === 'active') ? '0' : '1';
    const statusText = newStatus === '1' ? 'kích hoạt' : 'vô hiệu hóa';
    const statusEmoji = newStatus === '1' ? '✅' : '🚫';

    Alert.alert(
      `${statusEmoji} Xác nhận`,
      `Bạn có chắc chắn muốn ${statusText} người dùng "${userName}"?`,
      [
        { 
          text: 'Hủy', 
          style: 'cancel',
          onPress: () => console.log('❌ Status change cancelled')
        },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              console.log('🔄 [UserManagement] Changing status:', userId, '->', newStatus);
              await UserService.changeUserStatus(userId, newStatus);
              Alert.alert('✅ Thành công', `Đã ${statusText} người dùng`);
              onRefresh();
            } catch (error) {
              console.error('❌ [UserManagement] Status change failed:', error);
              Alert.alert(
                'Lỗi', 
                error.response?.data?.message || `Không thể ${statusText} người dùng`
              );
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    // API trả về status: "1" = active, "0" = inactive
    if (status === '1' || status === 'active') {
      return '#52c41a';
    }
    return '#ff4d4f';
  };

  const getStatusText = (status) => {
    if (status === '1' || status === 'active') {
      return 'Hoạt động';
    }
    return 'Ngưng hoạt động';
  };

  const getRoleColor = (roleName) => {
    const roleColorMap = {
      'admin': '#f5222d',
      'manager': '#fa8c16',
      'employee': '#1890ff',
      'hr': '#722ed1',
    };
    return roleColorMap[roleName?.toLowerCase()] || '#1890ff';
  };

  const getAvatarColor = (index) => {
    const colors = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2'];
    return colors[index % colors.length];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getGenderText = (gender) => {
    return gender === 1 ? 'Nam' : gender === 2 ? 'Nữ' : 'Khác';
  };

  const renderUserCard = ({ item, index }) => (
    <Card style={styles.userCard} mode="elevated" elevation={3}>
      <TouchableOpacity 
        onPress={() => {
          console.log('👤 [UserManagement] User card tapped:', item.username);
          Alert.alert(
            'Thông tin chi tiết',
            `Họ tên: ${item.fullName}\nEmail: ${item.email}\nSĐT: ${item.phone || 'N/A'}\nNgày sinh: ${formatDate(item.birthday)}\nGiới tính: ${getGenderText(item.gender)}\n\nVai trò: ${item.role?.name || 'N/A'}\nPhòng ban: ${item.department?.name || 'N/A'}\nChức vụ: ${item.chevron?.name || 'N/A'}\n\nNgày vào: ${formatDate(item.startDate)}\nSố ngày nghỉ: ${item.monthly_leave_balance || 0}`,
            [{ text: 'Đóng' }]
          );
        }}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <Card.Content style={styles.cardContent}>
            {/* ROW 1: AVATAR + MAIN INFO + ACTIONS */}
            <View style={styles.mainRow}>
              {/* COL 1: AVATAR */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <Avatar.Text 
                    size={isTablet ? 64 : 56}
                    label={item.fullName?.substring(0, 2).toUpperCase() || 'NA'}
                    style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}
                    labelStyle={styles.avatarLabel}
                  />
                  <Badge
                    size={16}
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) }
                    ]}
                  />
                </View>
              </View>
              
              {/* COL 2: USER INFO */}
              <View style={styles.infoSection}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.fullName || 'N/A'}
                </Text>
                
                {/* Username & Gender */}
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons 
                    name={item.gender === 1 ? "gender-male" : "gender-female"} 
                    size={14} 
                    color={item.gender === 1 ? "#1890ff" : "#eb2f96"} 
                  />
                  <Text style={styles.userUsername}>@{item.username}</Text>
                </View>
                
                {/* Email */}
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="email" size={14} color="#52c41a" />
                  <Text style={styles.infoText} numberOfLines={1}>{item.email}</Text>
                </View>
                
                {/* Phone */}
                {item.phone && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone" size={14} color="#fa8c16" />
                    <Text style={styles.infoText}>{item.phone}</Text>
                  </View>
                )}
              </View>
              
              {/* COL 3: ACTION BUTTONS */}
              <View style={styles.actionSection}>
                <IconButton
                  icon="eye"
                  size={20}
                  iconColor="#1890ff"
                  containerColor="#e6f7ff"
                  style={styles.iconButton}
                  onPress={() => {
                    console.log('👁️ View user:', item.id);
                    Alert.alert('Chi tiết', JSON.stringify(item, null, 2));
                  }}
                />
                <IconButton
                  icon={item.status === '1' ? 'pause-circle' : 'play-circle'}
                  size={20}
                  iconColor={item.status === '1' ? '#ff9800' : '#52c41a'}
                  containerColor={item.status === '1' ? '#fff7e6' : '#f6ffed'}
                  style={styles.iconButton}
                  onPress={() => handleChangeStatus(item.id, item.status === '1' ? 'active' : 'inactive', item.fullName)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#ff4d4f"
                  containerColor="#fff1f0"
                  style={styles.iconButton}
                  onPress={() => handleDeleteUser(item.id, item.fullName)}
                />
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* ROW 2: TAGS & INFO GRID */}
            <View style={styles.tagsRow}>
              {/* Role Tag */}
              <Chip 
                mode="flat" 
                compact 
                icon="shield-account"
                style={[styles.chip, { backgroundColor: getRoleColor(item.role?.name) + '15' }]}
                textStyle={[styles.chipText, { color: getRoleColor(item.role?.name) }]}
              >
                {item.role?.name || 'N/A'}
              </Chip>
              
              {/* Department Tag */}
              {item.department && (
                <Chip 
                  mode="flat" 
                  compact 
                  icon="office-building"
                  style={[styles.chip, { backgroundColor: '#52c41a15' }]}
                  textStyle={[styles.chipText, { color: '#52c41a' }]}
                >
                  {item.department.name}
                </Chip>
              )}
              
              {/* Chevron Tag */}
              {item.chevron && (
                <Chip 
                  mode="flat" 
                  compact 
                  icon="badge-account"
                  style={[styles.chip, { backgroundColor: '#fa8c1615' }]}
                  textStyle={[styles.chipText, { color: '#fa8c16' }]}
                >
                  {item.chevron.name}
                </Chip>
              )}
            </View>

            {/* ROW 3: ADDITIONAL INFO GRID */}
            <View style={styles.gridRow}>
              {/* Birthday */}
              {item.birthday && (
                <View style={styles.gridItem}>
                  <MaterialCommunityIcons name="cake-variant" size={14} color="#722ed1" />
                  <Text style={styles.gridText}>{formatDate(item.birthday)}</Text>
                </View>
              )}
              
              {/* Start Date */}
              {item.startDate && (
                <View style={styles.gridItem}>
                  <MaterialCommunityIcons name="calendar-check" size={14} color="#13c2c2" />
                  <Text style={styles.gridText}>{formatDate(item.startDate)}</Text>
                </View>
              )}
              
              {/* Leave Balance */}
              <View style={styles.gridItem}>
                <MaterialCommunityIcons name="beach" size={14} color="#eb2f96" />
                <Text style={styles.gridText}>{item.monthly_leave_balance || 0} ngày</Text>
              </View>
            </View>
          </Card.Content>
        </LinearGradient>
      </TouchableOpacity>
    </Card>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.footerText}>Đang tải thêm...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && page === 1) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name={searchQuery ? "account-search" : "account-off"} 
          size={100} 
          color="#d9d9d9" 
        />
        <Text style={styles.emptyText}>
          {searchQuery ? 'Không tìm thấy người dùng' : 'Chưa có người dùng nào'}
        </Text>
        {searchQuery && (
          <Button 
            mode="outlined" 
            onPress={() => setSearchQuery('')}
            style={{ marginTop: 16 }}
          >
            Xóa tìm kiếm
          </Button>
        )}
      </View>
    );
  };

  return (
    <Surface style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* HEADER WITH GRADIENT */}
      <LinearGradient
        colors={['#1890ff', '#096dd9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="account-group" size={32} color="#ffffff" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Quản lý người dùng</Text>
            <View style={styles.statsContainer}>
              <MaterialCommunityIcons name="account-multiple" size={16} color="#ffffff" />
              <Text style={styles.subtitle}>
                {totalUsers} người dùng
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Tìm kiếm theo tên, email, SĐT..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
          clearIcon="close-circle"
          iconColor="#1890ff"
          elevation={3}
        />
      </View>

      {/* USER LIST */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* LOADING OVERLAY */}
      {loading && page === 1 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      )}

      {/* FAB BUTTON */}
      <Portal>
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            console.log('➕ Add user button pressed');
            Alert.alert('Thông báo', 'Chức năng tạo người dùng đang phát triển');
          }}
          label="Thêm mới"
          color="#ffffff"
        />
      </Portal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5'
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTextContainer: {
    flex: 1
  },
  title: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  subtitle: {
    fontSize: isTablet ? 16 : 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600'
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f0f2f5'
  },
  searchbar: {
    elevation: 3,
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1
  },
  userCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  cardGradient: {
    borderRadius: 16
  },
  cardContent: {
    padding: isTablet ? 20 : 16
  },
  
  // ROW 1: Main Info Layout (Avatar + Info + Actions)
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  
  // COL 1: Avatar Section
  avatarSection: {
    width: isTablet ? 64 : 56,
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    elevation: 4
  },
  avatarLabel: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold'
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 2
  },
  
  // COL 2: Info Section
  infoSection: {
    flex: 1,
    gap: 4
  },
  userName: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 2
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  userUsername: {
    fontSize: isTablet ? 14 : 13,
    color: '#1890ff',
    fontWeight: '600'
  },
  infoText: {
    fontSize: isTablet ? 13 : 12,
    color: '#595959',
    flex: 1
  },
  
  // COL 3: Action Section
  actionSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4
  },
  iconButton: {
    margin: 0
  },
  
  divider: {
    marginVertical: 14,
    backgroundColor: '#f0f0f0'
  },
  
  // ROW 2: Tags Row (Responsive Chips)
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  chip: {
    height: 28,
    borderRadius: 6
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
    fontWeight: '600'
  },
  
  // ROW 3: Grid Info (3 columns responsive)
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: isTablet ? '30%' : '45%',
    paddingVertical: 4
  },
  gridText: {
    fontSize: isTablet ? 13 : 12,
    color: '#595959',
    fontWeight: '500'
  },
  
  // Footer & Empty State
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10
  },
  footerText: {
    fontSize: 14,
    color: '#8c8c8c'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: isTablet ? 18 : 16,
    color: '#8c8c8c',
    marginTop: 16,
    fontWeight: '500'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8c8c8c',
    fontWeight: '500'
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1890ff',
    borderRadius: 16
  }
});

export default UserManagementScreen;


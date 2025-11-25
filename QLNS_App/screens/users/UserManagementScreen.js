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
import { useIsFocused } from '@react-navigation/native';
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
  Button,
  Menu,
  Dialog,
  Paragraph
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UserService from '../../services/UserService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const PAGE_SIZE = 10;

const UserManagementScreen = ({ navigation }) => {
  const isFocused = useIsFocused(); // Track if this screen is focused
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [visibleMenuId, setVisibleMenuId] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState({ id: null, name: '' });
  const [deleting, setDeleting] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    loadUsers(1, true);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      loadUsers(1, true);
    }, 500); // 500ms debounce

    return () => clearTimeout(delayTimer);
  }, [searchQuery]);

  const loadUsers = async (pageNumber = 1, isRefresh = false) => {
    if (loading) return;
    if (!hasMore && !isRefresh && pageNumber > 1) return;

    try {
      setLoading(true);
      console.log('📥 [UserManagement] Loading users page:', pageNumber, 'keyword:', searchQuery);
      
      let response;
      if (searchQuery.trim()) {
        // Use search API when keyword is present
        response = await UserService.searchUsers(searchQuery, {
          page: pageNumber,
          pageSize: PAGE_SIZE
        });
      } else {
        // Use regular getAllUsers when no search
        response = await UserService.getAllUsers({
          page: pageNumber,
          pageSize: PAGE_SIZE
        });
      }

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
    // Open confirmation dialog (handled in component)
    console.log('🗑️ [UserManagement] Open delete confirmation for', userId);
    setConfirmTarget({ id: userId, name: userName });
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    const userId = confirmTarget.id;
    if (!userId) return;
    setDeleting(true);
    try {
      console.log('🗑️ [UserManagement] Deleting user (confirmed):', userId);
      await UserService.deleteMultipleUsers([userId]);
      setConfirmVisible(false);
      setConfirmTarget({ id: null, name: '' });
      Alert.alert('✅ Thành công', 'Đã xóa người dùng');
      onRefresh();
    } catch (error) {
      console.error('❌ [UserManagement] Delete failed:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa người dùng');
    } finally {
      setDeleting(false);
    }
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
    <Card style={styles.userCard} mode="elevated" elevation={2}>
      <Card.Content style={styles.cardContent}>
        {/* ROW 1: AVATAR + BASIC INFO */}
        <View style={styles.topRow}>
          {/* Avatar with status badge */}
          <View style={styles.avatarWrapper}>
            <Avatar.Text 
              size={56}
              label={item.fullName?.substring(0, 2).toUpperCase() || 'NA'}
              style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}
            />
            <Badge
              size={14}
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) }
              ]}
            />
          </View>
          
          {/* Basic Info */}
          <View style={styles.basicInfo}>
            <Text style={styles.fullName} numberOfLines={1}>
              {item.fullName || 'N/A'}
            </Text>
            
            {/* Email */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email-outline" size={14} color="#52c41a" />
              <Text style={styles.infoText} numberOfLines={1}>{item.email}</Text>
            </View>
            
            {/* Phone */}
            {item.phone && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone-outline" size={14} color="#1890ff" />
                <Text style={styles.infoText}>{item.phone}</Text>
              </View>
            )}
          </View>
          {/* Actions - Menu with 3 dots */}
          <View style={styles.actionsColumn}>
            <Menu
              visible={visibleMenuId === item.id}
              onDismiss={() => setVisibleMenuId(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  iconColor="#595959"
                  onPress={() => {
                    console.log('⋯ [UserManagement] Menu anchor pressed for', item.id);
                    setVisibleMenuId(item.id);
                  }}
                />
              }
            >
              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  console.log('👁️ [UserManagement] View pressed for', item.id);
                  setVisibleMenuId(null);
                  navigation.navigate('UserDetail', { userId: item.id });
                }}
              >
                <MaterialCommunityIcons name="eye-outline" size={18} color="#595959" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Xem chi tiết</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  console.log('✏️ [UserManagement] Edit pressed for', item.id);
                  setVisibleMenuId(null);
                  navigation.navigate('UserEdit', { userId: item.id });
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#595959" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <Divider />

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  console.log('🗑️ [UserManagement] Delete menu pressed for', item.id);
                  setVisibleMenuId(null);
                  handleDeleteUser(item.id, item.fullName);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color="#ff4d4f" style={styles.menuIcon} />
                <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Xóa</Text>
              </TouchableOpacity>
            </Menu>
          </View>
        </View>

        {/* ROW 2: DETAILED INFO GRID */}
        <View style={styles.detailsGrid}>
          {/* Birthday & Gender */}
          {item.birthday && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons 
                name={item.gender === 1 ? "gender-male" : "gender-female"} 
                size={16} 
                color={item.gender === 1 ? "#1890ff" : "#eb2f96"} 
              />
              <Text style={styles.detailText}>{formatDate(item.birthday)}</Text>
            </View>
          )}
          
          {/* Role */}
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="shield-account-outline" size={16} color="#722ed1" />
            <Text style={styles.detailText}>{item.role?.name || 'N/A'}</Text>
          </View>
          
          {/* Department */}
          {item.department && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="office-building-outline" size={16} color="#52c41a" />
              <Text style={styles.detailText}>{item.department.name}</Text>
            </View>
          )}
          
          {/* Position/Chevron */}
          {item.chevron && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="badge-account-outline" size={16} color="#fa8c16" />
              <Text style={styles.detailText}>{item.chevron.name}</Text>
            </View>
          )}
          
          {/* Status */}
          <View style={styles.detailItem}>
            <MaterialCommunityIcons 
              name={item.status === '1' ? "check-circle-outline" : "close-circle-outline"} 
              size={16} 
              color={getStatusColor(item.status)} 
            />
            <Text style={[styles.detailText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </Card.Content>
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
      
      {/* HEADER - Simple with total count */}
      <View style={styles.headerSimple}>
        <View style={styles.statsRow}>
          <MaterialCommunityIcons name="account-multiple" size={20} color="#1890ff" />
          <Text style={styles.totalText}>{totalUsers} người dùng</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Tìm kiếm theo tên, số điện thoại hoặc email..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
          clearIcon="close-circle"
          iconColor="#1890ff"
          elevation={2}
        />
      </View>

      {/* USER LIST */}
      <FlatList
        data={users}
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

        {/* CONFIRM DELETE DIALOG */}
        <Portal>
          <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
            <Dialog.Title>🗑️ Xác nhận xóa</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                Bạn có chắc chắn muốn xóa người dùng "{confirmTarget.name}"? Thao tác này không thể hoàn tác.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmVisible(false)}>Hủy</Button>
              <Button
                mode="contained"
                onPress={confirmDelete}
                loading={deleting}
                disabled={deleting}
                style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }}
              >
                Xóa
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      {/* LOADING OVERLAY */}
      {loading && page === 1 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      )}

      {/* FAB BUTTON - Only show when this screen is focused */}
      {isFocused && (
        <Portal>
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => {
              console.log('➕ Add user button pressed');
              navigation.navigate('UserCreate');
            }}
            label="Thêm mới"
            color="#ffffff"
          />
        </Portal>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5'
  },
  // Simple header (no gradient, compact)
  headerSimple: {
    backgroundColor: '#ffffff',
    padding: 16,
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626'
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f0f2f5'
  },
  searchbar: {
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  cardContent: {
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  
  // Top row: Avatar + Basic Info + Actions
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatar: {
    // backgroundColor set dynamically
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  basicInfo: {
    flex: 1,
    gap: 4
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  infoText: {
    fontSize: 13,
    color: '#595959',
    flex: 1
  },
  actionsColumn: {
    flexDirection: 'column',
    // ensure menu anchor area sits above other elements
    zIndex: 20,
    elevation: 6,
    // avoid negative gaps which break touch areas on some devices
    paddingLeft: 4
  },
  
  divider: {
    marginVertical: 2,
    backgroundColor: '#f0f0f0'
  },
  
  // Details grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    minWidth: '45%'
  },
  detailText: {
    fontSize: 12,
    color: '#595959',
    fontWeight: '500'
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
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 160,
    // ensure the row occupies full width and text can wrap/truncate properly
    justifyContent: 'flex-start'
  },
  menuIcon: {
    width: 24,
    textAlign: 'center'
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#595959',
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: 16,
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


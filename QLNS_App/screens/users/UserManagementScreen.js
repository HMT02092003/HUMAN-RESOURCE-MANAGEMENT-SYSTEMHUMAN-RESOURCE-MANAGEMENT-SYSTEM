import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Card, 
  Avatar, 
  Text, 
  Chip, 
  IconButton, 
  useTheme, 
  Badge,
  Menu,
  Divider,
  FAB 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import UserService from '../../services/UserService';

const UserManagementScreen = ({ navigation }) => {
  const theme = useTheme();
  const [visibleMenuId, setVisibleMenuId] = React.useState(null);
  const listRef = React.useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (listRef.current?.refresh) {
        listRef.current.refresh();
      }
    }, [])
  );

  // Fetch data function for CardList
  const fetchUsers = async (params) => {
    try {
      console.log('📥 [UserManagement] Fetching users with params:', params);
      
      // Call API với search keyword
      const response = params.search 
        ? await UserService.searchUsers(params.search, {
            page: params.page,
            pageSize: params.pageSize
          })
        : await UserService.getAllUsers({
            page: params.page,
            pageSize: params.pageSize
          });

      return response; // { results: [...], total: N }
    } catch (error) {
      console.error('❌ [UserManagement] Error fetching users:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách người dùng');
      return { results: [], total: 0 };
    }
  };

  // Delete user handler
  const handleDeleteUser = (userId, userName) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa người dùng "${userName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserService.deleteMultipleUsers([userId]);
              Alert.alert('✅ Thành công', 'Đã xóa người dùng');
              if (listRef.current?.refresh) listRef.current.refresh();
            } catch (error) {
              console.error('❌ [UserManagement] Delete failed:', error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa người dùng');
            }
          }
        }
      ]
    );
  };

  // Change status handler
  const handleChangeStatus = async (userId, currentStatus, userName) => {
    const newStatus = (currentStatus === '1' || currentStatus === 'active') ? '0' : '1';
    const statusText = newStatus === '1' ? 'kích hoạt' : 'vô hiệu hóa';

    Alert.alert(
      `${newStatus === '1' ? '✅' : '🚫'} Xác nhận`,
      `Bạn có chắc chắn muốn ${statusText} người dùng "${userName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              await UserService.changeUserStatus(userId, newStatus);
              Alert.alert('✅ Thành công', `Đã ${statusText} người dùng`);
              if (listRef.current?.refresh) listRef.current.refresh();
            } catch (error) {
              console.error('❌ [UserManagement] Status change failed:', error);
              Alert.alert('Lỗi', error.response?.data?.message || `Không thể ${statusText} người dùng`);
            }
          }
        }
      ]
    );
  };

  // Utility functions
  const getStatusColor = (status) => {
    if (status === '1' || status === 'active') return '#52c41a';
    return '#ff4d4f';
  };

  const getStatusText = (status) => {
    if (status === '1' || status === 'active') return 'Hoạt động';
    return 'Ngưng hoạt động';
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

  // Render user card
  const renderUserCard = (item, index) => (
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

          {/* Actions Menu */}
          <View style={styles.actionsColumn}>
            <Menu
              visible={visibleMenuId === item.id}
              onDismiss={() => setVisibleMenuId(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  iconColor="#595959"
                  onPress={() => setVisibleMenuId(item.id)}
                />
              }
            >
              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
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
                  setVisibleMenuId(null);
                  navigation.navigate('UserEdit', { userId: item.id });
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#595959" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              {/* Status toggle removed per UX request */}

              <Divider />

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
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

  // Item press handler
  const handleItemPress = (item) => {
    navigation.navigate('UserDetail', { userId: item.id });
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        ref={listRef}
        fetchData={fetchUsers}
        renderCard={renderUserCard}
        searchPlaceholder="Tìm theo tên, email, số điện thoại..."
        onItemPress={handleItemPress}
        pageSize={10}
        emptyMessage="Không tìm thấy người dùng nào"
        keyExtractor={(item) => item.id?.toString()}
      />

      {/* FAB - Add User */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('UserCreate')}
        color="#fff"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  cardContent: {
    padding: 16
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    // backgroundColor set dynamically
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff'
  },
  basicInfo: {
    flex: 1,
    justifyContent: 'center'
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
    marginTop: 4
  },
  infoText: {
    fontSize: 13,
    color: '#595959',
    marginLeft: 6,
    flex: 1
  },
  actionsColumn: {
    marginLeft: 8
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuIcon: {
    marginRight: 12
  },
  menuItemText: {
    fontSize: 14,
    color: '#262626'
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6
  },
  detailText: {
    fontSize: 12,
    color: '#595959',
    marginLeft: 6
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1890ff'
  }
});

export default UserManagementScreen;

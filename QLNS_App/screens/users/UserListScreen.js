import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
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
  Divider,
  Menu
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserService from '../../services/UserService';
import CheckPermission from '../../components/CheckPermission';

const UserListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [visibleMenuId, setVisibleMenuId] = useState(null);

  const theme = useTheme();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (pageNum = 1, isRefreshing = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      console.log('👥 [UserList] Fetching users, page:', pageNum);
      const data = await UserService.getAllUsers({
        page: pageNum,
        pageSize: pageSize,
        search: searchQuery
      });

      const results = data.results || data || [];
      const totalCount = data.total || results.length || 0;

      if (pageNum === 1) {
        setUsers(results);
      } else {
        setUsers(prev => [...prev, ...results]);
      }
      setTotal(totalCount);
      setPage(pageNum);
    } catch (error) {
      console.error('❌ [UserList] Error loading users:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadUsers(1, true);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Debounce search would be better, but for now simple:
  };

  // Trigger search on submit
  const submitSearch = () => {
    setPage(1);
    loadUsers(1);
  };

  const handleDeleteUser = (userId, fullName) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa người dùng "${fullName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserService.deleteUser(userId);
              Alert.alert('✅ Thành công', 'Đã xóa người dùng');
              onRefresh();
            } catch (error) {
              console.error('❌ [UserList] Delete failed:', error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa người dùng');
            }
          }
        }
      ]
    );
  };

  const getRoleColor = (roleName) => {
    const name = roleName?.toLowerCase() || '';
    if (name.includes('admin')) return '#f5222d';
    if (name.includes('manager')) return '#722ed1';
    if (name.includes('hr')) return '#1890ff';
    return '#52c41a';
  };

  const getStatusColor = (status) => {
    // Web status: 1: active, 2: inactive? 
    // In service: status can be string or number
    const s = parseInt(status);
    return s === 1 ? '#52c41a' : '#8c8c8c';
  };

  const getStatusLabel = (status) => {
    const s = parseInt(status);
    return s === 1 ? 'Hoạt động' : 'Ngưng';
  };

  const renderUserCard = ({ item }) => (
    <Card style={styles.userCard} elevation={1}>
      <Card.Content>
        <View style={styles.userCardContent}>
          <Avatar.Text
            size={56}
            label={item.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
            style={{ backgroundColor: getRoleColor(item.role?.name) }}
          />
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName} numberOfLines={1}>{item.fullName}</Text>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                textStyle={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '700' }}
              >
                {getStatusLabel(item.status)}
              </Chip>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email || 'No email'}</Text>
            <View style={styles.userMeta}>
              <View style={styles.roleBadge}>
                <MaterialCommunityIcons name="account-tie" size={12} color={getRoleColor(item.role?.name)} />
                <Text style={[styles.roleText, { color: getRoleColor(item.role?.name) }]}>
                  {item.role?.name || 'No Role'}
                </Text>
              </View>
              <Text style={styles.usernameText}>@{item.username}</Text>
            </View>
          </View>

          <Menu
            visible={visibleMenuId === item.id}
            onDismiss={() => setVisibleMenuId(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={22}
                onPress={() => setVisibleMenuId(item.id)}
              />
            }
          >
            <CheckPermission permissionKey="users" requiredType="update">
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setVisibleMenuId(null);
                  navigation.navigate('UserForm', { mode: 'edit', userId: item.id });
                }}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#595959" style={styles.menuIcon} />
                <Text>Chỉnh sửa</Text>
              </TouchableOpacity>
            </CheckPermission>

            <CheckPermission permissionKey="users" requiredType="delete">
              <>
                <Divider />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setVisibleMenuId(null);
                    handleDeleteUser(item.id, item.fullName);
                  }}
                >
                  <MaterialCommunityIcons name="delete" size={18} color="#ff4d4f" style={styles.menuIcon} />
                  <Text style={{ color: '#ff4d4f' }}>Xóa</Text>
                </TouchableOpacity>
              </>
            </CheckPermission>
          </Menu>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Surface style={styles.searchContainer} elevation={0}>
        <Searchbar
          placeholder="Tìm tên, email, username..."
          onChangeText={handleSearch}
          onSubmitEditing={submitSearch}
          onIconPress={submitSearch}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </Surface>

      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          onEndReached={() => {
            if (users.length < total) {
              loadUsers(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            loading && page > 1 ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-off-outline" size={64} color="#bfbfbf" />
              <Text style={styles.emptyText}>Không tìm thấy người dùng nào</Text>
            </View>
          }
        />
      )}

      <CheckPermission permissionKey="users" requiredType="create">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('UserForm', { mode: 'create' })}
          color="#fff"
        />
      </CheckPermission>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8c8c8c',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 48,
  },
  searchInput: {
    fontSize: 15,
    minHeight: 0,
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  userCard: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
    flex: 1,
    marginRight: 8,
  },
  userEmail: {
    fontSize: 13,
    color: '#595959',
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  usernameText: {
    fontSize: 12,
    color: '#8c8c8c',
    fontStyle: 'italic',
  },
  statusChip: {
    height: 22,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#bfbfbf',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1890ff',
  },
});

export default UserListScreen;

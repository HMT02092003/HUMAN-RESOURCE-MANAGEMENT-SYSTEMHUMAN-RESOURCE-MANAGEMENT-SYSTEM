import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
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
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Fake data
const FAKE_USERS = [
  { id: 1, username: 'admin', fullName: 'Nguyễn Văn A', email: 'admin@example.com', role: 'Admin', status: 'active' },
  { id: 2, username: 'user01', fullName: 'Trần Thị B', email: 'user01@example.com', role: 'Manager', status: 'active' },
  { id: 3, username: 'user02', fullName: 'Lê Văn C', email: 'user02@example.com', role: 'Employee', status: 'active' },
  { id: 4, username: 'user03', fullName: 'Phạm Thị D', email: 'user03@example.com', role: 'Employee', status: 'inactive' },
  { id: 5, username: 'user04', fullName: 'Hoàng Văn E', email: 'user04@example.com', role: 'HR', status: 'active' },
];

const UserListScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(FAKE_USERS);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return '#f5222d';
      case 'Manager': return '#722ed1';
      case 'HR': return '#1890ff';
      default: return '#52c41a';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#52c41a' : '#8c8c8c';
  };

  const renderUserCard = ({ item }) => (
    <Card style={styles.userCard}>
      <Card.Content>
        <View style={styles.userCardContent}>
          <Avatar.Text 
            size={56} 
            label={item.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            style={{ backgroundColor: getRoleColor(item.role) }}
          />
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{item.fullName}</Text>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
              >
                {item.status === 'active' ? 'Hoạt động' : 'Ngưng'}
              </Chip>
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.userMeta}>
              <Chip 
                icon="account-tie" 
                style={{ backgroundColor: getRoleColor(item.role) + '20' }}
                textStyle={{ color: getRoleColor(item.role), fontSize: 12 }}
              >
                {item.role}
              </Chip>
              <Text style={styles.username}>@{item.username}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <IconButton icon="pencil" size={20} onPress={() => {}} />
            <IconButton icon="delete" size={20} onPress={() => {}} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách người dùng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.searchContainer} elevation={2}>
        <Searchbar
          placeholder="Tìm kiếm người dùng..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </Surface>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {}}
        label="Thêm người dùng"
      />
    </View>
  );
};

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
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f7fa',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  userEmail: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  statusChip: {
    height: 24,
  },
  actions: {
    flexDirection: 'row',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default UserListScreen;
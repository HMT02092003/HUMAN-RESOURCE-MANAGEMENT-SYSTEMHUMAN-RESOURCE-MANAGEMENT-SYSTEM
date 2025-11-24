import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Surface, 
  Text, 
  Searchbar, 
  FAB, 
  Card, 
  Chip, 
  IconButton,
  useTheme,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_ROLES = [
  { id: 1, name: 'Admin', description: 'Quản trị viên hệ thống', userCount: 2, color: '#f5222d' },
  { id: 2, name: 'Manager', description: 'Quản lý phòng ban', userCount: 5, color: '#722ed1' },
  { id: 3, name: 'HR', description: 'Nhân viên nhân sự', userCount: 3, color: '#1890ff' },
  { id: 4, name: 'Employee', description: 'Nhân viên', userCount: 145, color: '#52c41a' },
];

const RoleListScreen = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRoles(FAKE_ROLES);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoles();
    setRefreshing(false);
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRoleCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons name="shield-account" size={32} color={item.color} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{item.name}</Text>
            <Text style={styles.roleDescription}>{item.description}</Text>
            <Chip icon="account-multiple" style={styles.chip} textStyle={{ fontSize: 12 }}>
              {item.userCount} người dùng
            </Chip>
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
        <Text style={styles.loadingText}>Đang tải danh sách vai trò...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.searchContainer} elevation={2}>
        <Searchbar
          placeholder="Tìm kiếm vai trò..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </Surface>

      <FlatList
        data={filteredRoles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRoleCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shield-off" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>Không tìm thấy vai trò</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {}}
        label="Thêm vai trò"
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
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
    marginLeft: 16,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 8,
  },
  chip: {
    alignSelf: 'flex-start',
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

export default RoleListScreen;

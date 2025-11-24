import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Chip, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DEPARTMENTS = [
  { id: 1, name: 'Phòng IT', manager: 'Nguyễn Văn A', employeeCount: 25, color: '#1890ff' },
  { id: 2, name: 'Phòng Kế toán', manager: 'Trần Thị B', employeeCount: 15, color: '#52c41a' },
  { id: 3, name: 'Phòng Nhân sự', manager: 'Lê Văn C', employeeCount: 10, color: '#fa8c16' },
  { id: 4, name: 'Phòng Kinh doanh', manager: 'Phạm Thị D', employeeCount: 30, color: '#722ed1' },
];

const DepartmentListScreen = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setDepartments(FAKE_DEPARTMENTS);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDepartments();
    setRefreshing(false);
  };

  const filteredData = departments.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.manager.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons name="office-building" size={32} color={item.color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.description}>Quản lý: {item.manager}</Text>
            <Chip icon="account-multiple" style={styles.chip} textStyle={{ fontSize: 12 }}>
              {item.employeeCount} nhân viên
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
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.searchContainer} elevation={2}>
        <Searchbar placeholder="Tìm kiếm..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
      </Surface>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="office-building-outline" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
          </View>
        }
      />
      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => {}} label="Thêm mới" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#8c8c8c' },
  searchContainer: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 12 },
  searchbar: { elevation: 0, backgroundColor: '#f5f7fa' },
  listContent: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: '#ffffff' },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 4 },
  description: { fontSize: 13, color: '#8c8c8c', marginBottom: 8 },
  chip: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#8c8c8c' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default DepartmentListScreen;

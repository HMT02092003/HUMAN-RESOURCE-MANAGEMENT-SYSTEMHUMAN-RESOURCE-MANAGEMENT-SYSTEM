import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Chip, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, name: 'Trưởng phòng IT', department: 'Phòng IT', level: 'Manager', salary: '30000000', color: '#1890ff' },
  { id: 2, name: 'Nhân viên IT', department: 'Phòng IT', level: 'Staff', salary: '15000000', color: '#52c41a' },
  { id: 3, name: 'Kế toán trưởng', department: 'Phòng Kế toán', level: 'Manager', salary: '28000000', color: '#722ed1' },
];

const PositionListScreen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(FAKE_DATA);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons name="briefcase" size={32} color={item.color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.description}>{item.department}</Text>
            <Chip icon="currency-usd" style={styles.chip} textStyle={{ fontSize: 12 }}>
              {parseInt(item.salary).toLocaleString('vi-VN')} VNĐ
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
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default PositionListScreen;

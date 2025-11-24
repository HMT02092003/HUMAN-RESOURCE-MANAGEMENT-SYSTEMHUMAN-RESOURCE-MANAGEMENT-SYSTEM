import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Chip, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, employee: 'Nguyễn Văn A', type: 'Chính thức', startDate: '2023-01-01', endDate: '2025-12-31', status: 'active' },
  { id: 2, employee: 'Trần Thị B', type: 'Thử việc', startDate: '2024-10-01', endDate: '2024-12-31', status: 'active' },
  { id: 3, employee: 'Lê Văn C', type: 'Hợp đồng', startDate: '2024-01-01', endDate: '2024-06-30', status: 'expired' },
];

const ContractListScreen = () => {
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
    item.employee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <MaterialCommunityIcons name="file-document" size={40} color={theme.colors.primary} />
          <View style={styles.info}>
            <Text style={styles.name}>{item.employee}</Text>
            <Text style={styles.description}>{item.type} • {item.startDate} → {item.endDate}</Text>
            <Chip 
              mode="flat" 
              style={{ backgroundColor: item.status === 'active' ? '#52c41a20' : '#8c8c8c20', alignSelf: 'flex-start' }}
              textStyle={{ color: item.status === 'active' ? '#52c41a' : '#8c8c8c', fontSize: 11 }}
            >
              {item.status === 'active' ? 'Còn hiệu lực' : 'Hết hạn'}
            </Chip>
          </View>
          <View style={styles.actions}>
            <IconButton icon="eye" size={20} onPress={() => {}} />
            <IconButton icon="pencil" size={20} onPress={() => {}} />
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
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 4 },
  description: { fontSize: 13, color: '#8c8c8c', marginBottom: 8 },
  actions: { flexDirection: 'row' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default ContractListScreen;

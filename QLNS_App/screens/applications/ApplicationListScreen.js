import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Chip, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, employee: 'Nguyễn Văn A', type: 'Nghỉ phép', reason: 'Nghỉ bệnh', date: '2024-11-25', status: 'pending' },
  { id: 2, employee: 'Trần Thị B', type: 'Nghỉ việc riêng', reason: 'Công việc gia đình', date: '2024-11-26', status: 'approved' },
  { id: 3, employee: 'Lê Văn C', type: 'Tăng ca', reason: 'Dự án khẩn', date: '2024-11-24', status: 'rejected' },
];

const ApplicationListScreen = () => {
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
    item.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#52c41a';
      case 'pending': return '#fa8c16';
      case 'rejected': return '#f5222d';
      default: return '#8c8c8c';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Đã duyệt';
      case 'pending': return 'Chờ duyệt';
      case 'rejected': return 'Từ chối';
      default: return 'Không xác định';
    }
  };

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{item.employee}</Text>
              <Text style={styles.type}>{item.type}</Text>
            </View>
          </View>
          <Chip 
            mode="flat" 
            style={{ backgroundColor: getStatusColor(item.status) + '20' }}
            textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>
        <Text style={styles.reason}>Lý do: {item.reason}</Text>
        <Text style={styles.date}>Ngày: {item.date}</Text>
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <IconButton icon="check" size={20} iconColor="#52c41a" onPress={() => {}} />
            <IconButton icon="close" size={20} iconColor="#f5222d" onPress={() => {}} />
          </View>
        )}
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
        <Searchbar placeholder="Tìm kiếm đơn từ..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
      </Surface>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      />
      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => {}} label="Tạo đơn mới" />
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerInfo: { marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626' },
  type: { fontSize: 12, color: '#8c8c8c' },
  reason: { fontSize: 13, color: '#595959', marginBottom: 4 },
  date: { fontSize: 12, color: '#8c8c8c' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default ApplicationListScreen;

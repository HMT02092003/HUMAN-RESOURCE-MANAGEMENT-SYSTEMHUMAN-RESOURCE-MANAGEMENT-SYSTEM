import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Avatar, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, employee: 'Nguyễn Văn A', date: '2024-11-21', checkIn: '08:00', checkOut: '17:30', status: 'on-time', avatar: 'NA' },
  { id: 2, employee: 'Trần Thị B', date: '2024-11-21', checkIn: '08:15', checkOut: '17:45', status: 'late', avatar: 'TB' },
  { id: 3, employee: 'Lê Văn C', date: '2024-11-21', checkIn: null, checkOut: null, status: 'absent', avatar: 'LC' },
];

const AttendanceListScreen = () => {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'on-time': return '#52c41a';
      case 'late': return '#fa8c16';
      case 'absent': return '#f5222d';
      default: return '#8c8c8c';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'on-time': return 'Đúng giờ';
      case 'late': return 'Trễ';
      case 'absent': return 'Vắng';
      default: return 'Không xác định';
    }
  };

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <Avatar.Text size={48} label={item.avatar} />
          <View style={styles.info}>
            <Text style={styles.name}>{item.employee}</Text>
            <Text style={styles.date}>{item.date}</Text>
            <View style={styles.timeRow}>
              {item.checkIn ? (
                <>
                  <MaterialCommunityIcons name="login" size={16} color="#52c41a" />
                  <Text style={styles.time}>{item.checkIn}</Text>
                  <MaterialCommunityIcons name="logout" size={16} color="#f5222d" style={{ marginLeft: 16 }} />
                  <Text style={styles.time}>{item.checkOut}</Text>
                </>
              ) : (
                <Text style={styles.noData}>Chưa chấm công</Text>
              )}
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
      <FAB icon="clock-check" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => {}} label="Chấm công" />
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
  name: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 2 },
  date: { fontSize: 12, color: '#8c8c8c', marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  time: { fontSize: 13, color: '#595959', marginLeft: 4 },
  noData: { fontSize: 13, color: '#8c8c8c', fontStyle: 'italic' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default AttendanceListScreen;

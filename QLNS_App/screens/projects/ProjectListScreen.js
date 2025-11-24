import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Chip, ProgressBar, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, name: 'Website HR Management', manager: 'Nguyễn Văn A', status: 'in-progress', progress: 0.75, team: 8 },
  { id: 2, name: 'Mobile App', manager: 'Trần Thị B', status: 'planning', progress: 0.2, team: 5 },
  { id: 3, name: 'API Gateway', manager: 'Lê Văn C', status: 'completed', progress: 1, team: 4 },
];

const ProjectListScreen = () => {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#52c41a';
      case 'in-progress': return '#1890ff';
      case 'planning': return '#fa8c16';
      default: return '#8c8c8c';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'in-progress': return 'Đang thực hiện';
      case 'planning': return 'Lên kế hoạch';
      default: return 'Không xác định';
    }
  };

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.name}>{item.name}</Text>
          <Chip 
            mode="flat" 
            style={{ backgroundColor: getStatusColor(item.status) + '20' }}
            textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-tie" size={16} color="#8c8c8c" />
          <Text style={styles.meta}>Quản lý: {item.manager}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-group" size={16} color="#8c8c8c" />
          <Text style={styles.meta}>{item.team} thành viên</Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Tiến độ: {Math.round(item.progress * 100)}%</Text>
          <ProgressBar progress={item.progress} color={getStatusColor(item.status)} style={styles.progressBar} />
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
        <Searchbar placeholder="Tìm kiếm dự án..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
      </Surface>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      />
      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => {}} label="Dự án mới" />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  meta: { fontSize: 13, color: '#595959', marginLeft: 8 },
  progressContainer: { marginTop: 12 },
  progressLabel: { fontSize: 12, color: '#595959', marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default ProjectListScreen;

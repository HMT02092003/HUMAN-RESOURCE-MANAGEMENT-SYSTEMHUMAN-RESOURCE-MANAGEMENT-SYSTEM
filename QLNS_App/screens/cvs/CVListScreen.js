import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Avatar, Chip, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, name: 'Hoàng Văn E', position: 'React Developer', experience: '3 năm', status: 'pending', email: 'hoangE@gmail.com' },
  { id: 2, name: 'Nguyễn Thị F', position: 'UI/UX Designer', experience: '2 năm', status: 'shortlisted', email: 'nguyenF@gmail.com' },
  { id: 3, name: 'Trần Văn G', position: 'Backend Developer', experience: '5 năm', status: 'rejected', email: 'tranG@gmail.com' },
];

const CVListScreen = () => {
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
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'shortlisted': return '#52c41a';
      case 'pending': return '#fa8c16';
      case 'rejected': return '#f5222d';
      default: return '#8c8c8c';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'shortlisted': return 'Đạt vòng 1';
      case 'pending': return 'Chờ xét duyệt';
      case 'rejected': return 'Không đạt';
      default: return 'Không xác định';
    }
  };

  const renderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <Avatar.Text size={56} label={item.name.split(' ').map(w => w[0]).join('').slice(0, 2)} style={{ backgroundColor: '#722ed1' }} />
          <View style={styles.info}>
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
            <Text style={styles.position}>{item.position}</Text>
            <Text style={styles.experience}>Kinh nghiệm: {item.experience}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={styles.actions}>
            <IconButton icon="eye" size={20} onPress={() => {}} />
            <IconButton icon="download" size={20} onPress={() => {}} />
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
        <Searchbar placeholder="Tìm kiếm CV..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
      </Surface>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      />
      <FAB icon="upload" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => {}} label="Tải lên CV" />
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
  info: { flex: 1, marginLeft: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626' },
  position: { fontSize: 14, color: '#1890ff', marginBottom: 4 },
  experience: { fontSize: 12, color: '#595959', marginBottom: 2 },
  email: { fontSize: 12, color: '#8c8c8c' },
  actions: { flexDirection: 'row' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default CVListScreen;

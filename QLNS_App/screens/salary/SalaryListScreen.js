import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, FAB, Card, Avatar, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAKE_DATA = [
  { id: 1, employee: 'Nguyễn Văn A', position: 'Dev Senior', baseSalary: 30000000, bonus: 5000000, deduction: 500000, total: 34500000 },
  { id: 2, employee: 'Trần Thị B', position: 'Manager', baseSalary: 40000000, bonus: 10000000, deduction: 1000000, total: 49000000 },
  { id: 3, employee: 'Lê Văn C', position: 'Dev Junior', baseSalary: 15000000, bonus: 2000000, deduction: 0, total: 17000000 },
];

const SalaryListScreen = () => {
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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar.Text size={40} label={item.employee.split(' ').map(w => w[0]).join('').slice(0, 2)} />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{item.employee}</Text>
              <Text style={styles.position}>{item.position}</Text>
            </View>
          </View>
          <Text style={styles.total}>{item.total.toLocaleString('vi-VN')} VNĐ</Text>
        </View>
        <View style={styles.salaryDetails}>
          <View style={styles.salaryRow}>
            <Text style={styles.label}>Lương cơ bản:</Text>
            <Text style={styles.value}>{item.baseSalary.toLocaleString('vi-VN')}</Text>
          </View>
          <View style={styles.salaryRow}>
            <Text style={styles.label}>Thưởng:</Text>
            <Text style={[styles.value, { color: '#52c41a' }]}>+{item.bonus.toLocaleString('vi-VN')}</Text>
          </View>
          <View style={styles.salaryRow}>
            <Text style={styles.label}>Khấu trừ:</Text>
            <Text style={[styles.value, { color: '#f5222d' }]}>-{item.deduction.toLocaleString('vi-VN')}</Text>
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
      <FAB icon="calculator" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => {}} label="Tính lương" />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerInfo: { marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626' },
  position: { fontSize: 12, color: '#8c8c8c' },
  total: { fontSize: 18, fontWeight: '700', color: '#1890ff' },
  salaryDetails: { gap: 4 },
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13, color: '#595959' },
  value: { fontSize: 13, fontWeight: '600', color: '#262626' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

export default SalaryListScreen;
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Searchbar,
  IconButton,
  FAB,
  Divider,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SalaryService from '../../services/SalaryService';

// ==================== HELPER FUNCTIONS ====================
const formatVND = (amount) => {
  if (!amount) return '0';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// ==================== MAIN COMPONENT ====================
const AllowanceListScreen = ({ navigation }) => {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // ==================== FETCH DATA ====================
  const fetchData = useCallback(async () => {
    try {
      console.log('📊 [App] Fetching allowance types...');
      const res = await SalaryService.listAllowanceTypes({ page: 1, pageSize: 100 });
      const list = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
      setData(list);
      console.log('✅ [App] Loaded', list.length, 'allowance types');
    } catch (error) {
      console.error('❌ [App] Error fetching allowance types:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phụ cấp');
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ==================== HANDLERS ====================
  const handleCreate = () => {
    navigation.navigate('Tạo phụ cấp');
  };

  const handleEdit = (item) => {
    navigation.navigate('Sửa phụ cấp', { id: item.id });
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa phụ cấp "${item.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await SalaryService.removeAllowanceType(item.id);
              Alert.alert('Thành công', 'Đã xóa phụ cấp');
              fetchData();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa phụ cấp');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 phụ cấp để xóa');
      return;
    }

    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${selectedItems.length} phụ cấp đã chọn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              for (const id of selectedItems) {
                await SalaryService.removeAllowanceType(id);
              }
              Alert.alert('Thành công', 'Đã xóa các phụ cấp đã chọn');
              setSelectedItems([]);
              fetchData();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa phụ cấp');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // ==================== FILTER DATA ====================
  const filteredData = data.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    return name.includes(searchLower) || description.includes(searchLower);
  });

  // ==================== RENDER ITEM ====================
  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <Card
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => handleEdit(item)}
        onLongPress={() => toggleSelect(item.id)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              {selectedItems.length > 0 && (
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleSelect(item.id)}
                >
                  <MaterialCommunityIcons
                    name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={isSelected ? theme.colors.primary : '#8c8c8c'}
                  />
                </TouchableOpacity>
              )}
              <View style={styles.titleContainer}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.cardActions}>
              <IconButton
                icon="pencil"
                size={20}
                iconColor="#1890ff"
                onPress={() => handleEdit(item)}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor="#ff4d4f"
                onPress={() => handleDelete(item)}
              />
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="cash" size={18} color="#52c41a" />
              <Text style={styles.infoLabel}>Số tiền:</Text>
              <Text style={styles.infoValue}>{formatVND(item.default_amount)}đ</Text>
            </View>
          </View>

          <View style={styles.chipRow}>
            <Chip
              mode="flat"
              style={{
                backgroundColor: item.is_taxable ? '#fff1f0' : '#f6ffed',
              }}
              textStyle={{
                color: item.is_taxable ? '#ff4d4f' : '#52c41a',
                fontSize: 11,
              }}
            >
              {item.is_taxable ? 'Có tính thuế TNCN' : 'Không tính thuế TNCN'}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách...</Text>
      </View>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      {/* Search */}
      <Surface style={styles.searchContainer} elevation={1}>
        <Searchbar
          placeholder="Tìm kiếm phụ cấp..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        {selectedItems.length > 0 && (
          <View style={styles.bulkActionsRow}>
            <Text style={styles.selectedText}>
              Đã chọn {selectedItems.length} phụ cấp
            </Text>
            <TouchableOpacity style={styles.bulkDeleteBtn} onPress={handleBulkDelete}>
              <MaterialCommunityIcons name="delete" size={18} color="#ff4d4f" />
              <Text style={styles.bulkDeleteText}>Xóa đã chọn</Text>
            </TouchableOpacity>
          </View>
        )}
      </Surface>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          Hiển thị {filteredData.length}/{data.length} phụ cấp
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-off" size={48} color="#d9d9d9" />
            <Text style={styles.emptyText}>Không có phụ cấp nào</Text>
          </View>
        }
      />

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreate}
        color="#ffffff"
      />
    </View>
  );
};

// ==================== STYLES ====================
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

  // Search
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f7fa',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedText: {
    fontSize: 13,
    color: '#595959',
  },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff1f0',
    borderRadius: 6,
  },
  bulkDeleteText: {
    fontSize: 13,
    color: '#ff4d4f',
    marginLeft: 4,
  },

  // Summary
  summaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#8c8c8c',
  },

  // List
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },

  // Card
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 8,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  cardDescription: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },

  // Info
  infoRow: {
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#8c8c8c',
    marginLeft: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52c41a',
    marginLeft: 4,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 12,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

export default AllowanceListScreen;

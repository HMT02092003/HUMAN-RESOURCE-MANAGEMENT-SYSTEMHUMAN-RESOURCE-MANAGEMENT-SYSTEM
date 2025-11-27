import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { ChevronService } from '../../services/ChevronService';

const ChevronListScreen = ({ navigation }) => {
  const [chevrons, setChevrons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteMultipleDialogVisible, setDeleteMultipleDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchChevrons = async () => {
    setLoading(true);
    try {
      const data = await ChevronService.getAllChevrons();
      setChevrons(data || []);
    } catch (error) {
      console.error('Error fetching chevrons:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách chức vụ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChevrons();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChevrons();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChevrons();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const handleLongPress = (id) => {
    setIsSelectionMode(true);
    setSelectedItems([id]);
  };

  const toggleSelection = (id) => {
    if (selectedItems.includes(id)) setSelectedItems(selectedItems.filter((i) => i !== id));
    else setSelectedItems([...selectedItems, id]);
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const handleDelete = (item) => {
    setDeleteTarget(item);
    setDeleteDialogVisible(true);
  };

  const handleDeleteSelected = () => {
    setDeleteMultipleDialogVisible(true);
  };

  const filteredChevrons = chevrons.filter((c) => (c.name || '').toLowerCase().includes(searchText.toLowerCase()));

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => {
          if (isSelectionMode) toggleSelection(item.id);
          else navigation.navigate('ChevronEdit', { chevronId: item.id });
        }}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={22} color={isSelected ? '#1890ff' : '#666'} />
            </View>
          )}
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase" size={22} color="#1890ff" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.coefficient}>Hệ số: {item.chevronCoefficient}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description || 'Không có mô tả'}</Text>
            {item.created_at && <Text style={styles.date}>Ngày tạo: {formatDate(item.created_at)}</Text>}
          </View>
          {!isSelectionMode && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ChevronEdit', { chevronId: item.id })}>
                <Ionicons name="create-outline" size={20} color="#1890ff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Tìm kiếm chức vụ..." value={searchText} onChangeText={setSearchText} />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Header / Selection Bar */}
      {isSelectionMode ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={cancelSelection}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
          <Text style={styles.selectedCountText}>Đã chọn: {selectedItems.length}</Text>
          <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedItems.length === 0}>
            <Ionicons name="trash-outline" size={24} color={selectedItems.length > 0 ? '#ff4d4f' : '#ccc'} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.headerBar}>
          <Text style={styles.totalText}>Tổng số: {filteredChevrons.length} chức vụ</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('ChevronCreate')}>
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Tạo mới</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredChevrons}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có chức vụ</Text>
          </View>
        }
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Xác nhận xóa</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn xóa chức vụ "{deleteTarget?.name}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
            <Button onPress={async () => {
              setDeleteDialogVisible(false);
              if (!deleteTarget) return;
              try {
                setLoading(true);
                await ChevronService.deleteChevron(deleteTarget.id);
                Alert.alert('Thành công', 'Xóa chức vụ thành công');
                await fetchChevrons();
              } catch (error) {
                console.error('Error deleting chevron:', error);
                Alert.alert('Lỗi', 'Không thể xóa chức vụ');
              } finally {
                setLoading(false);
              }
            }} textColor="#ff4d4f">Xóa</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleteMultipleDialogVisible} onDismiss={() => setDeleteMultipleDialogVisible(false)}>
          <Dialog.Title>Xác nhận xóa</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn xóa {selectedItems.length} chức vụ đã chọn?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteMultipleDialogVisible(false)}>Hủy</Button>
            <Button onPress={async () => {
              setDeleteMultipleDialogVisible(false);
              try {
                setLoading(true);
                await ChevronService.deleteMultipleChevrons(selectedItems);
                Alert.alert('Thành công', 'Xóa các chức vụ thành công');
                cancelSelection();
                await fetchChevrons();
              } catch (error) {
                console.error('Error deleting multiple chevrons:', error);
                Alert.alert('Lỗi', 'Không thể xóa các chức vụ');
              } finally {
                setLoading(false);
              }
            }} textColor="#ff4d4f">Xóa</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  totalText: { fontSize: 14, color: '#666' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1890ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  addButtonText: { color: '#fff', marginLeft: 4, fontWeight: '600' },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#e6f7ff', borderBottomWidth: 1, borderBottomColor: '#91d5ff' },
  cancelText: { color: '#1890ff', fontSize: 16, fontWeight: '600' },
  selectedCountText: { fontSize: 16, fontWeight: '600', color: '#262626' },
  listContainer: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  selectedCard: { borderWidth: 2, borderColor: '#1890ff' },
  cardContent: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  checkboxContainer: { marginRight: 12, justifyContent: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6f7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 4 },
  coefficient: { fontSize: 14, color: '#1890ff', marginBottom: 4, fontWeight: '500' },
  description: { fontSize: 14, color: '#595959', marginBottom: 4 },
  date: { fontSize: 12, color: '#8c8c8c' },
  actions: { flexDirection: 'column', justifyContent: 'center', marginLeft: 8 },
  actionButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
});

export default ChevronListScreen;

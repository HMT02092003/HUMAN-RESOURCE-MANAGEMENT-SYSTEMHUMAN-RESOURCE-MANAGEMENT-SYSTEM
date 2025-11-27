import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DepartmentService } from '../../services/DepartmentService';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import dayjs from 'dayjs';

const DepartmentListScreen = ({ navigation }) => {
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await DepartmentService.getAllDepartments();
      setDepartments(data);
      setFilteredDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phòng ban');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDepartments();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDepartments();
    setRefreshing(false);
  }, []);

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(
        (dept) =>
          dept.name.toLowerCase().includes(text.toLowerCase()) ||
          dept.description.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredDepartments(filtered);
    }
  };

  const toggleSelection = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleLongPress = (id) => {
    setIsSelectionMode(true);
    setSelectedItems([id]);
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const handleDeleteSelected = () => {
    console.log('🗑️ [DEBUG] Delete selected pressed, ids=', selectedItems);
    // show in-app dialog instead of native Alert to ensure visibility inside the app
    setDeleteMultipleDialogVisible(true);
  };

  const handleEdit = (department) => {
    navigation.navigate('DepartmentEdit', { departmentId: department.id });
  };

  const handleDelete = (department) => {
    console.log('🗑️ [DEBUG] Delete pressed for department:', department?.id, department?.name);
    setDeleteTarget(department);
    setDeleteDialogVisible(true);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).format('DD/MM/YYYY');
  };

  // Dialog states for in-app confirmation
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteMultipleDialogVisible, setDeleteMultipleDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const renderDepartmentItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.departmentCard, isSelected && styles.selectedCard]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            navigation.navigate('DepartmentDetail', { departmentId: item.id });
          }
        }}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={24}
                color={isSelected ? '#1890ff' : '#666'}
              />
            </View>
          )}
          <View style={styles.departmentInfo}>
            <Text style={styles.departmentName}>{item.name}</Text>
            <Text style={styles.departmentDescription} numberOfLines={2}>
              {item.description || 'Không có mô tả'}
            </Text>
            <Text style={styles.departmentDate}>
              Ngày tạo: {formatDate(item.created_at)}
            </Text>
          </View>
          {!isSelectionMode && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  console.log('✏️ [DEBUG] Edit pressed for', item.id);
                  handleEdit(item);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#1890ff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  console.log('🗑️ [DEBUG] Delete button pressed (UI) for', item.id);
                  handleDelete(item);
                }}
              >
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm phòng ban..."
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Bar */}
      {isSelectionMode ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={cancelSelection}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCountText}>
            Đã chọn: {selectedItems.length}
          </Text>
          <TouchableOpacity
            onPress={handleDeleteSelected}
            disabled={selectedItems.length === 0}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color={selectedItems.length > 0 ? '#ff4d4f' : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.headerBar}>
          <Text style={styles.totalText}>
            Tổng số: {filteredDepartments.length} phòng ban
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('DepartmentCreate')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Tạo mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Department List */}
      <FlatList
        data={filteredDepartments}
        renderItem={renderDepartmentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có phòng ban nào</Text>
          </View>
        }
      />

      {/* In-app confirmation dialog for single delete */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Xác nhận xóa</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn xóa phòng ban "{deleteTarget?.name}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
            <Button
              onPress={async () => {
                setDeleteDialogVisible(false);
                if (!deleteTarget) return;
                try {
                  setLoading(true);
                  console.log('🗑️ [DEBUG] Confirming delete for', deleteTarget.id);
                  await DepartmentService.deleteDepartment(deleteTarget.id.toString());
                  await loadDepartments();
                } catch (error) {
                  console.error('Error deleting department (dialog):', error);
                } finally {
                  setLoading(false);
                }
              }}
              textColor="#ff4d4f"
            >
              Xóa
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* In-app confirmation dialog for multiple delete */}
        <Dialog visible={deleteMultipleDialogVisible} onDismiss={() => setDeleteMultipleDialogVisible(false)}>
          <Dialog.Title>Xác nhận xóa</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn xóa {selectedItems.length} phòng ban đã chọn?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteMultipleDialogVisible(false)}>Hủy</Button>
            <Button
              onPress={async () => {
                setDeleteMultipleDialogVisible(false);
                try {
                  setLoading(true);
                  console.log('🗑️ [DEBUG] Confirming delete multiple for', selectedItems);
                  await DepartmentService.deleteMultipleDepartments(selectedItems);
                  cancelSelection();
                  await loadDepartments();
                } catch (error) {
                  console.error('Error deleting multiple departments (dialog):', error);
                } finally {
                  setLoading(false);
                }
              }}
              textColor="#ff4d4f"
            >
              Xóa
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  totalText: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1890ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e6f7ff',
    borderBottomWidth: 1,
    borderBottomColor: '#91d5ff',
  },
  cancelText: {
    color: '#1890ff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  listContainer: {
    padding: 12,
  },
  departmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 8,
  },
  departmentDate: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default DepartmentListScreen;

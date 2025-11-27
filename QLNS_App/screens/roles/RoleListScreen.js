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
import RoleService from '../../services/RoleService';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';

const RoleListScreen = ({ navigation }) => {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await RoleService.getAllRoles();
      setRoles(data || []);
      setFilteredRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách vai trò');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRoles();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRoles();
    setRefreshing(false);
  }, []);

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredRoles(roles);
    } else {
      const filtered = roles.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(text.toLowerCase()) ||
          (r.description || '').toLowerCase().includes(text.toLowerCase())
      );
      setFilteredRoles(filtered);
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

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteMultipleDialogVisible, setDeleteMultipleDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleEdit = (role) => {
    navigation.navigate('RoleEdit', { roleId: role.id });
  };

  const handleDelete = (role) => {
    setDeleteTarget(role);
    setDeleteDialogVisible(true);
  };

  const handleDeleteSelected = () => {
    setDeleteMultipleDialogVisible(true);
  };

  const renderRoleItem = ({ item }) => {
    const isSelected = selectedItems.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.roleCard, isSelected && styles.selectedCard]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            // no detail screen currently, go to edit
            navigation.navigate('RoleEdit', { roleId: item.id });
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
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{item.name}</Text>
            <Text style={styles.roleDescription} numberOfLines={2}>
              {item.description || 'Không có mô tả'}
            </Text>
            <Text style={styles.roleMeta}>ID: {item.id}</Text>
          </View>
          {!isSelectionMode && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create-outline" size={20} color="#1890ff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item)}
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
          placeholder="Tìm kiếm vai trò..."
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
          <Text style={styles.selectedCountText}>Đã chọn: {selectedItems.length}</Text>
          <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedItems.length === 0}>
            <Ionicons name="trash-outline" size={24} color={selectedItems.length > 0 ? '#ff4d4f' : '#ccc'} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.headerBar}>
          <Text style={styles.totalText}>Tổng số: {filteredRoles.length} vai trò</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('RoleCreate')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Tạo mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Role List */}
      <FlatList
        data={filteredRoles}
        renderItem={renderRoleItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có vai trò nào</Text>
          </View>
        }
      />

      {/* Dialogs */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Xác nhận xóa</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn xóa vai trò "{deleteTarget?.name}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
            <Button
              onPress={async () => {
                setDeleteDialogVisible(false);
                if (!deleteTarget) return;
                try {
                  setLoading(true);
                  await RoleService.deleteRole(deleteTarget.id.toString());
                  Alert.alert('Thành công', 'Xóa vai trò thành công', [
                    {
                      text: 'OK',
                      onPress: () => {
                        loadRoles();
                      },
                    },
                  ]);
                } catch (error) {
                  console.error('Error deleting role:', error);
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

        <Dialog visible={deleteMultipleDialogVisible} onDismiss={() => setDeleteMultipleDialogVisible(false)}>
          <Dialog.Title>Xác nhận xóa</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bạn có chắc chắn muốn xóa {selectedItems.length} vai trò đã chọn?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteMultipleDialogVisible(false)}>Hủy</Button>
            <Button
              onPress={async () => {
                setDeleteMultipleDialogVisible(false);
                try {
                  setLoading(true);
                  await RoleService.deleteMultipleRoles(selectedItems);
                  cancelSelection();
                  await loadRoles();
                } catch (error) {
                  console.error('Error deleting multiple roles:', error);
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
  roleCard: {
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
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 8,
  },
  roleMeta: {
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

export default RoleListScreen;

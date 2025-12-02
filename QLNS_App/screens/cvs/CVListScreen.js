import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  Surface,
  FAB,
  Avatar,
  ActivityIndicator,
  Button,
  Checkbox,
  IconButton,
  Portal,
  Modal,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import JobService from '../../services/JobService';
import UserService from '../../services/UserService';
import { useAuth } from '../../services/AuthContext';

// Job Service URL for file download
const getJobServiceBase = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4008'; // Android emulator
  }
  return 'http://localhost:4008';
};

const CVListScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCvs, setSelectedCvs] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadCVs(1, true);
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    try {
      const response = await UserService.getAllUsersForSelect();
      const list = Array.isArray(response) ? response : (response?.results || response?.data || []);
      const mapped = list.map((u) => ({
        id: u.id || u.user_id,
        name: u.fullName || u.full_name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email,
        email: u.email || '',
      }));
      setUsers(mapped);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCVs = async (pageNum = 1, isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    }

    try {
      const response = await JobService.fetchCvs({ page: pageNum, pageSize: 20 });
      const payload = response?.data ?? response;
      let items = [];

      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload?.data) {
        items = payload.data;
        setTotal(payload.pagination?.total || items.length);
      }

      // Map CV data with user info
      const mappedCvs = items.map((cv) => {
        const cvUser = cv.user || null;
        return {
          ...cv,
          id: cv.cv_id || cv.id,
          fullName: cvUser 
            ? (cvUser.fullName || [cvUser.firstName, cvUser.lastName].filter(Boolean).join(' ') || cvUser.username || cvUser.email)
            : `User ${cv.user_id}`,
          userEmail: cvUser?.email || '',
        };
      });

      if (isRefresh || pageNum === 1) {
        setCvs(mappedCvs);
      } else {
        setCvs(prev => [...prev, ...mappedCvs]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading CVs:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách CV');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSelectedCvs([]);
    setIsSelectionMode(false);
    loadCVs(1, true);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const filteredCvs = cvs.filter(cv => {
    const searchLower = searchQuery.toLowerCase();
    return cv.fullName?.toLowerCase().includes(searchLower) ||
      cv.userEmail?.toLowerCase().includes(searchLower) ||
      cv.file_path?.toLowerCase().includes(searchLower);
  });

  const toggleSelection = (cvId) => {
    setSelectedCvs(prev => {
      if (prev.includes(cvId)) {
        const newSelection = prev.filter(id => id !== cvId);
        if (newSelection.length === 0) setIsSelectionMode(false);
        return newSelection;
      }
      return [...prev, cvId];
    });
  };

  const handleLongPress = (cvId) => {
    setIsSelectionMode(true);
    setSelectedCvs([cvId]);
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa ${selectedCvs.length} CV đã chọn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.bulkDeleteCvs(selectedCvs);
              setSelectedCvs([]);
              setIsSelectionMode(false);
              loadCVs(1, true);
              Alert.alert('Thành công', 'Đã xóa CV');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa CV');
            }
          }
        }
      ]
    );
  };

  const handleDeleteCv = (cvId) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa CV này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteCv(cvId);
              loadCVs(1, true);
              Alert.alert('Thành công', 'Đã xóa CV');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa CV');
            }
          }
        }
      ]
    );
  };

  const handleOpenCV = (cv) => {
    const filePath = cv.file_path?.replace(/\\/g, '/').replace(/^\/+/, '');
    if (filePath) {
      const url = `${getJobServiceBase()}/${filePath}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở file CV');
      });
    }
  };

  const handleUploadCV = async () => {
    // Hiển thị thông báo hướng dẫn upload qua web
    Alert.alert(
      'Tải lên CV',
      'Chức năng upload CV hiện chỉ hỗ trợ qua giao diện web.\n\nVui lòng truy cập hệ thống web để tải lên CV.',
      [{ text: 'Đã hiểu', style: 'default' }]
    );
    setUploadModalVisible(false);
    setSelectedUserId(null);
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileName = (filePath) => {
    if (!filePath) return 'CV';
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.split('/').pop() || 'CV';
  };

  const renderCvCard = ({ item }) => {
    const isSelected = selectedCvs.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => isSelectionMode ? toggleSelection(item.id) : handleOpenCV(item)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
      >
        <Surface style={[styles.cvCard, isSelected && styles.cvCardSelected]} elevation={2}>
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={isSelected ? 'checked' : 'unchecked'}
                onPress={() => toggleSelection(item.id)}
                color="#1890ff"
              />
            </View>
          )}
          
          <View style={styles.cardContent}>
            <Avatar.Text 
              size={48} 
              label={getInitials(item.fullName)}
              style={styles.avatar}
            />
            
            <View style={styles.cvInfo}>
              <Text style={styles.userName}>{item.fullName}</Text>
              {item.userEmail && (
                <Text style={styles.userEmail}>{item.userEmail}</Text>
              )}
              <View style={styles.fileInfo}>
                <MaterialCommunityIcons name="file-pdf-box" size={16} color="#ff4d4f" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {getFileName(item.file_path)}
                </Text>
              </View>
              <Text style={styles.uploadDate}>
                Tải lên: {formatDate(item.uploaded_at)}
              </Text>
            </View>

            {!isSelectionMode && (
              <View style={styles.cardActions}>
                <IconButton
                  icon="eye"
                  size={20}
                  iconColor="#1890ff"
                  onPress={() => handleOpenCV(item)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#ff4d4f"
                  onPress={() => handleDeleteCv(item.id)}
                />
              </View>
            )}
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8c8c8c" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm CV..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#8c8c8c"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#8c8c8c" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.resultCount}>{filteredCvs.length} hồ sơ</Text>
      </View>

      {/* Selection Mode Actions */}
      {isSelectionMode && selectedCvs.length > 0 && (
        <View style={styles.selectionActions}>
          <Button
            mode="outlined"
            onPress={() => {
              setSelectedCvs([]);
              setIsSelectionMode(false);
            }}
            style={styles.cancelButton}
          >
            Hủy
          </Button>
          <Button
            mode="contained"
            buttonColor="#ff4d4f"
            onPress={handleDeleteSelected}
            icon="delete"
          >
            Xóa ({selectedCvs.length})
          </Button>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color="#d9d9d9" />
      <Text style={styles.emptyText}>Chưa có hồ sơ/CV nào</Text>
      <Button 
        mode="contained" 
        onPress={() => setUploadModalVisible(true)} 
        style={styles.createButton}
        icon="upload"
      >
        Tải lên CV
      </Button>
    </View>
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredCvs}
        renderItem={renderCvCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1890ff']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="upload"
        style={styles.fab}
        onPress={() => setUploadModalVisible(true)}
        color="#fff"
        loading={uploading}
        disabled={uploading}
      />

      {/* Upload Modal */}
      <Portal>
        <Modal
          visible={uploadModalVisible}
          onDismiss={() => setUploadModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Tải lên CV mới</Text>
          <Divider style={{ marginBottom: 16 }} />

          <Text style={styles.modalLabel}>Chọn nhân viên</Text>
          <TouchableOpacity 
            style={styles.userSelector}
            onPress={() => setShowUserModal(true)}
          >
            {selectedUser ? (
              <View style={styles.selectedUser}>
                <Avatar.Text 
                  size={32} 
                  label={getInitials(selectedUser.name)}
                  style={styles.selectorAvatar}
                />
                <View style={styles.selectorInfo}>
                  <Text style={styles.selectorText}>{selectedUser.name}</Text>
                  <Text style={styles.selectorSubtext}>{selectedUser.email}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Chọn nhân viên...</Text>
            )}
            <MaterialCommunityIcons name="chevron-down" size={24} color="#8c8c8c" />
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setUploadModalVisible(false)}
              style={styles.modalButton}
            >
              Hủy
            </Button>
            <Button
              mode="contained"
              onPress={handleUploadCV}
              style={styles.modalButton}
              disabled={!selectedUserId}
              icon="upload"
            >
              Chọn file CV
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* User Selection Modal */}
      <Portal>
        <Modal
          visible={showUserModal}
          onDismiss={() => setShowUserModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Chọn nhân viên</Text>
          <Divider style={{ marginBottom: 12 }} />
          <FlatList
            data={users}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userOption}
                onPress={() => {
                  setSelectedUserId(item.id);
                  setShowUserModal(false);
                }}
              >
                <Avatar.Text 
                  size={36} 
                  label={getInitials(item.name)}
                  style={styles.optionAvatar}
                />
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{item.name}</Text>
                  <Text style={styles.optionEmail}>{item.email}</Text>
                </View>
                {selectedUserId === item.id && (
                  <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                )}
              </TouchableOpacity>
            )}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#8c8c8c',
    fontSize: 14,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#262626',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultCount: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  cancelButton: {
    borderColor: '#d9d9d9',
  },
  listContent: {
    paddingBottom: 100,
  },
  cvCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cvCardSelected: {
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#722ed1',
  },
  cvInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  uploadDate: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  cardActions: {
    flexDirection: 'row',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#8c8c8c',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#1890ff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1890ff',
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    marginBottom: 20,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorAvatar: {
    backgroundColor: '#1890ff',
    marginRight: 10,
  },
  selectorInfo: {
    flex: 1,
  },
  selectorText: {
    fontSize: 14,
    color: '#262626',
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  placeholderText: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionAvatar: {
    backgroundColor: '#722ed1',
    marginRight: 10,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    color: '#262626',
  },
  optionEmail: {
    fontSize: 12,
    color: '#8c8c8c',
  },
});

export default CVListScreen;

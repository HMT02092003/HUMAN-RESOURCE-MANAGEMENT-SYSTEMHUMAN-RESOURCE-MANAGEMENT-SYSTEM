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
  Dimensions,
} from 'react-native';
import {
  Surface,
  Chip,
  FAB,
  Button,
  ActivityIndicator,
  Avatar,
  ProgressBar,
  Menu,
  Divider,
  Checkbox,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import JobService from '../../services/JobService';

const { width } = Dimensions.get('window');

const statusColors = {
  planning: '#1890ff',
  active: '#52c41a',
  on_hold: '#faad14',
  completed: '#722ed1',
  cancelled: '#ff4d4f'
};

const statusLabels = {
  planning: 'Lên kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const ProjectListScreen = () => {
  const navigation = useNavigation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 10;

  useFocusEffect(
    useCallback(() => {
      loadProjects(0, true);
    }, [])
  );

  const loadProjects = async (pageNum = 0, isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await JobService.getAllProjectByScope({ 
        page: pageNum, 
        pageSize 
      });
      
      const payload = response?.data ?? response;
      let items = [];
      let totalCount = 0;

      if (Array.isArray(payload)) {
        items = payload;
        totalCount = payload.length;
      } else if (payload?.results || payload?.data) {
        items = payload.results ?? payload.data;
        totalCount = payload.total ?? items.length;
      } else if (payload?.items) {
        items = payload.items;
        totalCount = payload.total ?? items.length;
      }

      // Map data
      const mapped = (items || []).map((p) => {
        const rawManager = p.manager_id ?? p.manager;
        let manager = { id: null, name: '', avatar: null };
        
        if (rawManager) {
          if (typeof rawManager === 'object') {
            manager.id = rawManager.id ?? null;
            manager.name = rawManager.fullName ?? rawManager.full_name ?? rawManager.name ?? rawManager.username ?? '';
            manager.avatar = rawManager.avatar ?? rawManager.avatar_url ?? rawManager.identificationPhoto ?? null;
          } else {
            manager.id = rawManager;
            manager.name = `User ${rawManager}`;
          }
        }

        const mappedMembers = (p.members || []).map((m) => {
          const raw = m.user_id ?? m.userId ?? m;
          return {
            id: typeof raw === 'object' ? raw.id : raw,
            name: typeof raw === 'object' ? (raw.fullName ?? raw.name ?? raw.username ?? '') : `User ${raw}`,
            avatar: typeof raw === 'object' ? (raw.avatar ?? raw.identificationPhoto ?? null) : null,
          };
        });

        return {
          id: p.project_id ?? p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          startDate: p.start_date ?? p.startDate,
          endDate: p.end_date ?? p.endDate,
          progress: Number(p.progress) || 0,
          budget: p.budget ? Number(p.budget) : 0,
          spent: p.spent ? Number(p.spent) : 0,
          manager,
          members: mappedMembers,
          customer: p.customer ?? '',
        };
      });

      if (isRefresh || pageNum === 0) {
        setProjects(mapped);
      } else {
        setProjects(prev => [...prev, ...mapped]);
      }
      
      setTotal(totalCount);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách dự án');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSelectedProjects([]);
    setIsSelectionMode(false);
    loadProjects(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && projects.length < total) {
      loadProjects(page + 1, false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleSelection = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        const newSelection = prev.filter(id => id !== projectId);
        if (newSelection.length === 0) setIsSelectionMode(false);
        return newSelection;
      }
      return [...prev, projectId];
    });
  };

  const handleLongPress = (projectId) => {
    setIsSelectionMode(true);
    setSelectedProjects([projectId]);
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa ${selectedProjects.length} dự án đã chọn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteProject(selectedProjects);
              setSelectedProjects([]);
              setIsSelectionMode(false);
              loadProjects(0, true);
              Alert.alert('Thành công', 'Đã xóa dự án');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa dự án');
            }
          }
        }
      ]
    );
  };

  const handleViewDetail = (project) => {
    navigation.navigate('Chi tiết dự án', { projectId: project.id, projectName: project.name });
  };

  const handleCreate = () => {
    navigation.navigate('Tạo dự án');
  };

  const handleEdit = (project) => {
    navigation.navigate('Sửa dự án', { projectId: project.id, project });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderProjectCard = ({ item }) => {
    const isSelected = selectedProjects.includes(item.id);
    const statusColor = statusColors[item.status] || '#1890ff';
    const statusLabel = statusLabels[item.status] || item.status;

    return (
      <TouchableOpacity
        onPress={() => isSelectionMode && toggleSelection(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={isSelectionMode ? 0.7 : 1}
      >
        <Surface style={[styles.projectCard, isSelected && styles.projectCardSelected]} elevation={2}>
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={isSelected ? 'checked' : 'unchecked'}
                onPress={() => toggleSelection(item.id)}
                color="#1890ff"
              />
            </View>
          )}
          
          <View style={styles.cardHeader}>
            <View style={styles.projectInfo}>
              <Text style={styles.projectId}>{item.id}</Text>
              <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
              textStyle={{ color: statusColor, fontSize: 11 }}
            >
              {statusLabel}
            </Chip>
          </View>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          )}

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Tiến độ</Text>
              <Text style={[styles.progressValue, { color: statusColor }]}>{item.progress}%</Text>
            </View>
            <ProgressBar 
              progress={item.progress / 100} 
              color={statusColor} 
              style={styles.progressBar}
            />
          </View>

          {/* Manager & Members */}
          <View style={styles.teamSection}>
            <View style={styles.managerInfo}>
              <MaterialCommunityIcons name="account-tie" size={16} color="#666" />
              <Text style={styles.managerName} numberOfLines={1}>
                {item.manager?.name || 'Chưa có'}
              </Text>
            </View>
            
            {item.members?.length > 0 && (
              <View style={styles.membersInfo}>
                <View style={styles.avatarGroup}>
                  {item.members.slice(0, 3).map((member, index) => (
                    <Avatar.Text
                      key={member.id || index}
                      size={24}
                      label={getInitials(member.name)}
                      style={[styles.memberAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                    />
                  ))}
                  {item.members.length > 3 && (
                    <View style={[styles.memberAvatar, styles.memberCountBadge, { marginLeft: -8 }]}>
                      <Text style={styles.memberCountText}>+{item.members.length - 3}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Budget & Customer */}
          <View style={styles.detailsSection}>
            {item.budget > 0 && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="cash" size={14} color="#52c41a" />
                <Text style={styles.detailText}>{formatCurrency(item.budget)}</Text>
              </View>
            )}
            {item.customer && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="account-circle" size={14} color="#1890ff" />
                <Text style={styles.detailText} numberOfLines={1}>{item.customer}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          {!isSelectionMode && (
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleViewDetail(item)}
              >
                <MaterialCommunityIcons name="eye" size={18} color="#1890ff" />
                <Text style={[styles.actionText, { color: '#1890ff' }]}>Xem</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleEdit(item)}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#faad14" />
                <Text style={[styles.actionText, { color: '#faad14' }]}>Sửa</Text>
              </TouchableOpacity>
            </View>
          )}
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
          placeholder="Tìm kiếm dự án..."
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

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Chip
              icon="filter-variant"
              onPress={() => setFilterMenuVisible(true)}
              style={styles.filterChip}
            >
              {filterStatus ? statusLabels[filterStatus] : 'Tất cả'}
            </Chip>
          }
        >
          <Menu.Item 
            onPress={() => { setFilterStatus(null); setFilterMenuVisible(false); }} 
            title="Tất cả" 
          />
          <Divider />
          {Object.keys(statusLabels).map(status => (
            <Menu.Item
              key={status}
              onPress={() => { setFilterStatus(status); setFilterMenuVisible(false); }}
              title={statusLabels[status]}
              leadingIcon={() => (
                <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
              )}
            />
          ))}
        </Menu>

        <Text style={styles.resultCount}>
          {filteredProjects.length} dự án
        </Text>
      </View>

      {/* Selection Mode Actions */}
      {isSelectionMode && selectedProjects.length > 0 && (
        <View style={styles.selectionActions}>
          <Button
            mode="outlined"
            onPress={() => {
              setSelectedProjects([]);
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
            Xóa ({selectedProjects.length})
          </Button>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="folder-open-outline" size={64} color="#d9d9d9" />
      <Text style={styles.emptyText}>Chưa có dự án nào</Text>
      <Button mode="contained" onPress={handleCreate} style={styles.createButton}>
        Tạo dự án mới
      </Button>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#1890ff" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải dự án...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProjects}
        renderItem={renderProjectCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1890ff']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreate}
        color="#fff"
      />
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#fff',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  projectCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  projectCardSelected: {
    borderWidth: 2,
    borderColor: '#1890ff',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectId: {
    fontSize: 11,
    color: '#8c8c8c',
    marginBottom: 2,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  statusChip: {
    height: 26,
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f0f0f0',
  },
  teamSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  managerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managerName: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  membersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    backgroundColor: '#1890ff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  detailsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
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
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1890ff',
  },
});

export default ProjectListScreen;

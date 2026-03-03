import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Surface,
  Chip,
  Avatar,
  ActivityIndicator,
  Portal,
  Modal,
  Button,
  Divider,
  Menu,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import JobService from '../../services/JobService';

const taskStatusColors = {
  todo: '#1890ff',
  in_progress: '#faad14',
  pending_approval: '#722ed1',
  done: '#52c41a'
};

const taskStatusLabels = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  pending_approval: 'Chờ phê duyệt',
  done: 'Hoàn thành'
};

const taskPriorityColors = {
  low: '#8c8c8c',
  medium: '#1890ff',
  high: '#faad14',
  urgent: '#ff4d4f'
};

const taskPriorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp'
};

const MyTasksScreen = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMyTasks();
    }, [filterStatus, filterPriority])
  );

  const loadMyTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;

      const response = await JobService.getMyTasks(params);
      const data = response?.data ?? response?.tasks ?? response ?? [];

      // Map tasks
      const mappedTasks = (Array.isArray(data) ? data : []).map((task) => ({
        id: task.id || task.task_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date || task.dueDate,
        startDate: task.start_date || task.startDate,
        projectId: task.project_id || task.projectId,
        projectName: task.project?.name || task.project_name || '',
        estimatedDays: task.estimated_days || task.estimatedDays,
        estimatedHours: task.estimated_hours || task.estimatedHours,
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách công việc');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMyTasks();
  };

  const handleUpdateTaskStatus = async (newStatus) => {
    if (!selectedTask) return;

    try {
      await JobService.updateTaskStatus(selectedTask.projectId, selectedTask.id, newStatus);
      Alert.alert('Thành công', 'Đã cập nhật trạng thái');
      setTaskModalVisible(false);
      loadMyTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  const renderTaskCard = ({ item }) => {
    const statusColor = taskStatusColors[item.status] || '#1890ff';
    const statusLabel = taskStatusLabels[item.status] || item.status;
    const priorityColor = taskPriorityColors[item.priority] || '#1890ff';
    const priorityLabel = taskPriorityLabels[item.priority] || item.priority;
    const overdue = isOverdue(item.dueDate) && item.status !== 'done';

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedTask(item);
          setTaskModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Surface style={[styles.taskCard, overdue && styles.taskCardOverdue]} elevation={2}>
          <View style={styles.cardHeader}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
              {item.projectName && (
                <View style={styles.projectTag}>
                  <MaterialCommunityIcons name="folder" size={12} color="#8c8c8c" />
                  <Text style={styles.projectName}>{item.projectName}</Text>
                </View>
              )}
            </View>
            <Chip
              style={[styles.priorityChip, { backgroundColor: priorityColor + '20' }]}
              textStyle={{ color: priorityColor, fontSize: 10 }}
            >
              {priorityLabel}
            </Chip>
          </View>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          )}

          <View style={styles.cardMeta}>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
              textStyle={{ color: statusColor, fontSize: 10 }}
            >
              {statusLabel}
            </Chip>

            {item.dueDate && (
              <View style={[styles.dueDate, overdue && styles.dueDateOverdue]}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={14}
                  color={overdue ? '#ff4d4f' : '#8c8c8c'}
                />
                <Text style={[styles.dueDateText, overdue && styles.dueDateTextOverdue]}>
                  {formatDate(item.dueDate)}
                </Text>
                {overdue && (
                  <MaterialCommunityIcons name="alert" size={14} color="#ff4d4f" />
                )}
              </View>
            )}

            {(item.estimatedDays || item.estimatedHours) && (
              <View style={styles.estimate}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#8c8c8c" />
                <Text style={styles.estimateText}>
                  {item.estimatedDays ? `${item.estimatedDays} ngày` : `${item.estimatedHours}h`}
                </Text>
              </View>
            )}
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    const todoCount = getTasksByStatus('todo').length;
    const inProgressCount = getTasksByStatus('in_progress').length;
    const reviewCount = getTasksByStatus('pending_approval').length;
    const doneCount = getTasksByStatus('done').length;

    return (
      <View style={styles.header}>
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { borderLeftColor: taskStatusColors.todo }]} elevation={1}>
            <Text style={styles.statValue}>{todoCount}</Text>
            <Text style={styles.statLabel}>Chưa làm</Text>
          </Surface>
          <Surface style={[styles.statCard, { borderLeftColor: taskStatusColors.in_progress }]} elevation={1}>
            <Text style={styles.statValue}>{inProgressCount}</Text>
            <Text style={styles.statLabel}>Đang làm</Text>
          </Surface>
          <Surface style={[styles.statCard, { borderLeftColor: taskStatusColors.pending_approval }]} elevation={1}>
            <Text style={styles.statValue}>{reviewCount}</Text>
            <Text style={styles.statLabel}>Review</Text>
          </Surface>
          <Surface style={[styles.statCard, { borderLeftColor: taskStatusColors.done }]} elevation={1}>
            <Text style={styles.statValue}>{doneCount}</Text>
            <Text style={styles.statLabel}>Xong</Text>
          </Surface>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <Menu
            visible={showStatusMenu}
            onDismiss={() => setShowStatusMenu(false)}
            anchor={
              <Chip
                icon="filter-variant"
                onPress={() => setShowStatusMenu(true)}
                style={styles.filterChip}
              >
                {filterStatus ? taskStatusLabels[filterStatus] : 'Trạng thái'}
              </Chip>
            }
          >
            <Menu.Item
              onPress={() => { setFilterStatus(null); setShowStatusMenu(false); }}
              title="Tất cả"
            />
            <Divider />
            {Object.entries(taskStatusLabels).map(([key, label]) => (
              <Menu.Item
                key={key}
                onPress={() => { setFilterStatus(key); setShowStatusMenu(false); }}
                title={label}
                leadingIcon={() => (
                  <View style={[styles.statusDot, { backgroundColor: taskStatusColors[key] }]} />
                )}
              />
            ))}
          </Menu>

          <Menu
            visible={showPriorityMenu}
            onDismiss={() => setShowPriorityMenu(false)}
            anchor={
              <Chip
                icon="flag"
                onPress={() => setShowPriorityMenu(true)}
                style={styles.filterChip}
              >
                {filterPriority ? taskPriorityLabels[filterPriority] : 'Ưu tiên'}
              </Chip>
            }
          >
            <Menu.Item
              onPress={() => { setFilterPriority(null); setShowPriorityMenu(false); }}
              title="Tất cả"
            />
            <Divider />
            {Object.entries(taskPriorityLabels).map(([key, label]) => (
              <Menu.Item
                key={key}
                onPress={() => { setFilterPriority(key); setShowPriorityMenu(false); }}
                title={label}
                leadingIcon={() => (
                  <View style={[styles.statusDot, { backgroundColor: taskPriorityColors[key] }]} />
                )}
              />
            ))}
          </Menu>
        </View>

        <Text style={styles.resultCount}>{tasks.length} công việc</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-check-outline" size={64} color="#d9d9d9" />
      <Text style={styles.emptyText}>Không có công việc nào</Text>
      <Text style={styles.emptySubtext}>
        {filterStatus || filterPriority
          ? 'Thử thay đổi bộ lọc để xem thêm'
          : 'Bạn chưa được giao công việc nào'}
      </Text>
    </View>
  );

  const renderTaskModal = () => {
    if (!selectedTask) return null;

    const statusColor = taskStatusColors[selectedTask.status] || '#1890ff';
    const statusLabel = taskStatusLabels[selectedTask.status] || selectedTask.status;
    const priorityColor = taskPriorityColors[selectedTask.priority] || '#1890ff';
    const priorityLabel = taskPriorityLabels[selectedTask.priority] || selectedTask.priority;

    return (
      <Portal>
        <Modal
          visible={taskModalVisible}
          onDismiss={() => setTaskModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết công việc</Text>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#8c8c8c" />
            </TouchableOpacity>
          </View>

          <Divider />

          <View style={styles.modalContent}>
            <Text style={styles.taskDetailTitle}>{selectedTask.title}</Text>

            {selectedTask.projectName && (
              <View style={styles.modalProjectTag}>
                <MaterialCommunityIcons name="folder" size={16} color="#1890ff" />
                <Text style={styles.modalProjectName}>{selectedTask.projectName}</Text>
              </View>
            )}

            {selectedTask.description && (
              <Text style={styles.taskDetailDesc}>{selectedTask.description}</Text>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Trạng thái</Text>
                <Chip
                  style={[styles.statusChipSmall, { backgroundColor: statusColor + '20' }]}
                  textStyle={{ color: statusColor, fontSize: 11 }}
                >
                  {statusLabel}
                </Chip>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Độ ưu tiên</Text>
                <Chip
                  style={[styles.statusChipSmall, { backgroundColor: priorityColor + '20' }]}
                  textStyle={{ color: priorityColor, fontSize: 11 }}
                >
                  {priorityLabel}
                </Chip>
              </View>
            </View>

            <View style={styles.detailRow}>
              {selectedTask.startDate && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ngày bắt đầu</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedTask.startDate)}</Text>
                </View>
              )}
              {selectedTask.dueDate && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Hạn chót</Text>
                  <Text style={[
                    styles.detailValue,
                    isOverdue(selectedTask.dueDate) && selectedTask.status !== 'done' && { color: '#ff4d4f' }
                  ]}>
                    {formatDate(selectedTask.dueDate)}
                  </Text>
                </View>
              )}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.updateStatusTitle}>Cập nhật trạng thái</Text>
            <View style={styles.statusButtons}>
              {Object.entries(taskStatusLabels).map(([key, label]) => (
                <Button
                  key={key}
                  mode={selectedTask.status === key ? 'contained' : 'outlined'}
                  onPress={() => handleUpdateTaskStatus(key)}
                  style={[styles.statusButton, { borderColor: taskStatusColors[key] }]}
                  buttonColor={selectedTask.status === key ? taskStatusColors[key] : 'transparent'}
                  textColor={selectedTask.status === key ? '#fff' : taskStatusColors[key]}
                  compact
                >
                  {label}
                </Button>
              ))}
            </View>
          </View>
        </Modal>
      </Portal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải công việc...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => String(item.id)}
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

      {renderTaskModal()}
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
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
  },
  statLabel: {
    fontSize: 10,
    color: '#8c8c8c',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
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
  listContent: {
    paddingBottom: 24,
  },
  taskCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  taskCardOverdue: {
    borderWidth: 1,
    borderColor: '#ff4d4f40',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  projectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectName: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  priorityChip: {
    height: 22,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusChip: {
    height: 22,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateOverdue: {
    backgroundColor: '#ff4d4f10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  dueDateTextOverdue: {
    color: '#ff4d4f',
    fontWeight: '500',
  },
  estimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  estimateText: {
    fontSize: 12,
    color: '#8c8c8c',
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
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bfbfbf',
    marginTop: 8,
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  modalContent: {
    padding: 16,
  },
  taskDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  modalProjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  modalProjectName: {
    fontSize: 14,
    color: '#1890ff',
  },
  taskDetailDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#262626',
  },
  statusChipSmall: {
    height: 24,
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: 16,
  },
  updateStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    marginBottom: 4,
  },
});

export default MyTasksScreen;

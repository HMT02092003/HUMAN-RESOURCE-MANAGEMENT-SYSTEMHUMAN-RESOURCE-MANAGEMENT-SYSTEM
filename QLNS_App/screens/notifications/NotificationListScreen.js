import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import {
  Surface,
  Chip,
  Badge,
  Avatar,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import NotificationService from '../../services/NotificationService';

const priorityColors = {
  urgent: '#ff4d4f',
  high: '#fa8c16',
  normal: '#1890ff',
  low: '#52c41a',
};

const priorityLabels = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  normal: 'Bình thường',
  low: 'Thấp',
};

const typeInfo = {
  task_assigned: { color: 'blue', label: 'Task mới', icon: 'clipboard-check' },
  task_updated: { color: 'cyan', label: 'Cập nhật', icon: 'update' },
  task_completed: { color: 'green', label: 'Hoàn thành', icon: 'check-circle' },
  task_deadline: { color: 'orange', label: 'Deadline', icon: 'calendar-alert' },
  task_overdue: { color: 'red', label: 'Quá hạn', icon: 'alert-circle' },
  project_assigned: { color: 'purple', label: 'Dự án mới', icon: 'folder-plus' },
  project_updated: { color: 'geekblue', label: 'Cập nhật DA', icon: 'folder-edit' },
  leave_request: { color: 'volcano', label: 'Nghỉ phép', icon: 'calendar-remove' },
  leave_approved: { color: 'green', label: 'Phê duyệt', icon: 'check-circle' },
  leave_rejected: { color: 'red', label: 'Từ chối', icon: 'close-circle' },
  system: { color: 'default', label: 'Hệ thống', icon: 'cog' },
};

const NotificationListScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  const loadNotifications = async (isRefresh = false) => {
    if (loading) return;
    if (!hasMore && !isRefresh) return;

    try {
      setLoading(true);
      const currentPage = isRefresh ? 1 : page;
      const offset = (currentPage - 1) * pageSize;

      const [notifRes, countRes] = await Promise.all([
        NotificationService.getNotifications({ 
          limit: pageSize, 
          offset 
        }),
        isRefresh ? NotificationService.getUnreadCount() : Promise.resolve(null)
      ]);

      const newData = notifRes.data?.data?.notifications || notifRes.data?.data || [];
      
      if (isRefresh) {
        setNotifications(newData);
        setPage(2);
        setHasMore(newData.length === pageSize);
        if (countRes) {
          setUnreadCount(countRes.data?.data?.unread_count || 0);
        }
      } else {
        setNotifications(prev => [...prev, ...newData]);
        setPage(currentPage + 1);
        setHasMore(newData.length === pageSize);
      }
    } catch (error) {
      console.error('[NotificationList] Error loading:', error);
      Alert.alert('Lỗi', 'Không thể tải thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(false);
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (notification.is_read) return;

    try {
      await NotificationService.markAsRead(notification.notification_id);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notification.notification_id
            ? { ...n, is_read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      Alert.alert('Thành công', 'Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đánh dấu đã đọc');
    }
  };

  const handleNotificationPress = (notification) => {
    handleMarkAsRead(notification);

    // Navigate based on action_url or notification type
    if (notification.action_url) {
      // Parse and navigate (simplified)
      console.log('Navigate to:', notification.action_url);
    } else if (notification.project_id) {
      navigation.navigate('Chi tiết dự án', { 
        projectId: notification.project_id 
      });
    } else if (notification.task_id) {
      // Navigate to task detail if available
      console.log('Navigate to task:', notification.task_id);
    }
  };

  const getTypeInfo = (type) => {
    return typeInfo[type] || typeInfo.system;
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const renderNotificationCard = ({ item }) => {
    const info = getTypeInfo(item.notification_type);
    const priorityColor = priorityColors[item.priority] || '#1890ff';

    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)}>
        <Surface 
          style={[
            styles.notifCard,
            !item.is_read && styles.unreadCard
          ]} 
          elevation={item.is_read ? 0 : 1}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: priorityColor + '20' }]}>
              <MaterialCommunityIcons 
                name={info.icon} 
                size={24} 
                color={priorityColor} 
              />
            </View>

            <View style={styles.contentMain}>
              <View style={styles.headerRow}>
                <Chip 
                  style={styles.typeChip}
                  textStyle={styles.typeChipText}
                >
                  {info.label}
                </Chip>
                {item.priority !== 'normal' && (
                  <Chip 
                    style={[styles.priorityChip, { backgroundColor: priorityColor + '20' }]}
                    textStyle={[styles.priorityChipText, { color: priorityColor }]}
                  >
                    {priorityLabels[item.priority]}
                  </Chip>
                )}
              </View>

              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              
              {item.content && (
                <Text style={styles.content} numberOfLines={2}>
                  {item.content}
                </Text>
              )}

              <View style={styles.footer}>
                <Text style={styles.time}>
                  {formatTimeAgo(item.created_at)}
                </Text>
                {!item.is_read && (
                  <Badge size={8} style={styles.unreadBadge} />
                )}
              </View>
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1890ff" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="bell-outline" size={64} color="#d9d9d9" />
        <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <Badge size={20} style={styles.headerBadge}>
              {unreadCount}
            </Badge>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <MaterialCommunityIcons name="check-all" size={20} color="#1890ff" />
            <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationCard}
        keyExtractor={(item) => String(item.notification_id)}
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
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerBadge: {
    backgroundColor: '#ff4d4f',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e6f7ff',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1890ff',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  notifCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  unreadCard: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 3,
    borderLeftColor: '#1890ff',
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentMain: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  typeChip: {
    height: 24,
    backgroundColor: '#f0f0f0',
  },
  typeChipText: {
    fontSize: 11,
    color: '#666',
  },
  priorityChip: {
    height: 24,
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  content: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  unreadBadge: {
    backgroundColor: '#1890ff',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#8c8c8c',
    marginTop: 16,
  },
});

export default NotificationListScreen;

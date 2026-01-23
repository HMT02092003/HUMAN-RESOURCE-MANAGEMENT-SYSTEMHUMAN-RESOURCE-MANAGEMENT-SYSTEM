'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Button, Empty, Spin, Typography, Tag } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import jobService from '@/service/jobService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

interface Notification {
  notification_id: number;
  user_id: number;
  project_id?: number;
  task_id?: string;
  notification_type: string;
  title: string;
  content?: string;  // Changed from 'message' to 'content' to match backend
  is_read: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  action_url?: string;
  sender_id?: number;
  created_at: string;
  expires_at?: string;
}

interface NotificationBellProps {
  userId: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!userId) return;

    // Connect directly to notification-service (Socket.io doesn't proxy well through gateway)
    const notificationServiceUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || '';

    // Get token from cookie or localStorage
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] || localStorage.getItem('token');

    if (!token) {
      console.warn('⚠️ No token found for Socket.io authentication');
      return;
    }

    const socketConnection = io(notificationServiceUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      }
    });

    socketConnection.on('connect', () => {
      console.log('✅ Socket connected to notification-service:', socketConnection.id);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socketConnection.on('disconnect', () => {
      console.log('👋 Socket disconnected');
    });

    // Listen for new notifications
    socketConnection.on('notification', (data: Notification) => {
      console.log('🔔 New notification received:', data);
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.content || '',
          icon: '/logo/logo.png',
        });
      }
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [userId]);

  // Request browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifRes, countRes] = await Promise.all([
        jobService.getNotifications({ limit: 20 }),
        jobService.getUnreadNotificationCount()
      ]);

      setNotifications(notifRes.data.data?.notifications || []);
      setUnreadCount(countRes.data.data?.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && dropdownVisible) {
      loadNotifications();
    }
  }, [userId, dropdownVisible]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      await jobService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await jobService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
    }

    setDropdownVisible(false);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ff4d4f';
      case 'high':
        return '#fa8c16';
      case 'normal':
        return '#1890ff';
      case 'low':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  // Get notification type icon/color
  const getNotificationTypeInfo = (type: string) => {
    const typeMap: Record<string, { color: string; label: string }> = {
      'task_assigned': { color: 'blue', label: 'Task mới' },
      'task_updated': { color: 'cyan', label: 'Cập nhật' },
      'task_completed': { color: 'orange', label: 'Hoàn thành' },
      'task_approved': { color: 'green', label: 'Đã duyệt' },
      'task_rejected': { color: 'red', label: 'Từ chối' },
      'task_overdue': { color: 'red', label: 'Quá hạn' },
      'task_due_soon': { color: 'orange', label: 'Sắp hết hạn' },
      'project_updated': { color: 'purple', label: 'Dự án' },
      'kpi_calculated': { color: 'gold', label: 'KPI' },
      'member_added': { color: 'blue', label: 'Thành viên' },
      'comment_added': { color: 'cyan', label: 'Bình luận' },
    };

    return typeMap[type] || { color: 'default', label: 'Thông báo' };
  };

  const menu = (
    <div style={{ width: 400, maxHeight: 600, overflow: 'hidden', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 16 }}>Thông báo</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description="Không có thông báo"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => {
              // Remove emoji and text after colon from title for cleaner display
              const cleanTitle = item.title.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '').split(':')[0].trim();

              return (
                <List.Item
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: item.is_read ? '#fff' : '#f5f5f5',
                    borderLeft: `3px solid ${getPriorityColor(item.priority)}`,
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 14, lineHeight: '20px', flex: 1 }}>
                        {cleanTitle}
                      </Text>
                      {!item.is_read && (
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={(e) => handleMarkAsRead(item.notification_id, e)}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </div>

                    {item.content && (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 13,
                          display: 'block',
                          marginTop: 4,
                          lineHeight: '18px'
                        }}
                      >
                        {item.content}
                      </Text>
                    )}

                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                      {dayjs(item.created_at).fromNow()}
                    </Text>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      overlay={menu}
      trigger={['click']}
      open={dropdownVisible}
      onOpenChange={setDropdownVisible}
      placement="bottomRight"
    >
      <Badge count={unreadCount} offset={[-5, 5]} style={{ backgroundColor: '#ff4d4f' }}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          style={{ height: 'auto', padding: '4px 8px' }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;

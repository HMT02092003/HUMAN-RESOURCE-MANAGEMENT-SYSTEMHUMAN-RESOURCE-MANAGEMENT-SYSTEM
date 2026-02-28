import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Card, 
  Avatar, 
  Text, 
  IconButton, 
  useTheme, 
  Menu,
  Divider,
  FAB,
  Chip,
  Badge
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import ApplicationService, {
  APPLICATION_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS
} from '../../services/ApplicationService';

const ApplicationManagementScreen = ({ navigation }) => {
  const theme = useTheme();
  const [visibleMenuId, setVisibleMenuId] = React.useState(null);
  const listRef = React.useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (listRef.current?.refresh) {
        listRef.current.refresh();
      }
    }, [])
  );

  // Fetch data
  const fetchApplications = async (params) => {
    try {
      console.log('📋 [ApplicationManagement] Fetching with params:', params);

      // Forward all params (including searchFields / active filters) to backend
      const response = await ApplicationService.getAllApplications(params);

      return {
        results: response.data || [],
        total: response.total || 0
      };
    } catch (error) {
      console.error('❌ [ApplicationManagement] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn từ');
      return { results: [], total: 0 };
    }
  };

  // Approve handler
  const handleApprove = (id, type, userName) => {
    Alert.alert(
      '✅ Xác nhận duyệt',
      `Duyệt đơn "${APPLICATION_TYPE_LABELS[type]}" của ${userName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              await ApplicationService.approveApplication(id, { note: '' });
              Alert.alert('✅ Thành công', 'Đã duyệt đơn từ');
              if (listRef.current?.refresh) {
                listRef.current.refresh();
              }
            } catch (error) {
              console.error('❌ Approve failed:', error);
              Alert.alert('Lỗi', 'Không thể duyệt đơn từ');
            }
          }
        }
      ]
    );
  };

  // Reject handler
  const handleReject = (id, type, userName) => {
    Alert.prompt(
      '❌ Từ chối đơn',
      `Lý do từ chối đơn "${APPLICATION_TYPE_LABELS[type]}" của ${userName}:`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              await ApplicationService.rejectApplication(id, { reason: reason || 'Không đạt yêu cầu' });
              Alert.alert('✅ Thành công', 'Đã từ chối đơn từ');
              if (listRef.current?.refresh) {
                listRef.current.refresh();
              }
            } catch (error) {
              console.error('❌ Reject failed:', error);
              Alert.alert('Lỗi', 'Không thể từ chối đơn từ');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  // Delete handler
  const handleDelete = (id, type, userName) => {
    Alert.alert(
      '🗑️ Xác nhận xóa',
      `Xóa đơn "${APPLICATION_TYPE_LABELS[type]}" của ${userName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApplicationService.deleteApplication(id);
              Alert.alert('✅ Thành công', 'Đã xóa đơn từ');
              if (listRef.current?.refresh) {
                listRef.current.refresh();
              }
            } catch (error) {
              console.error('❌ Delete failed:', error);
              Alert.alert('Lỗi', 'Không thể xóa đơn từ');
            }
          }
        }
      ]
    );
  };

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getTypeIcon = (type) => {
    const icons = {
      'leave': 'calendar-remove',
      'overtime': 'clock-plus',
      'business-trip': 'airplane',
      'forgot-check': 'alarm',
      'resignation': 'exit-run',
      'shift-registration': 'calendar-check',
      'remote-work': 'home',
      'sick-leave': 'hospital-box'
    };
    return icons[type] || 'file-document';
  };

  const getScreenForType = (type) => {
    switch (type) {
      case 'leave':
        return 'LeaveApplication';
      case 'overtime':
        return 'OvertimeApplication';
      case 'forgot-check':
        return 'ForgotCheckApplication';
      case 'business-trip':
        return 'BusinessTripApplication';
      case 'resignation':
        return 'ResignationApplication';
      default:
        return null;
    }
  };

  const getEditScreenForType = (type) => {
    switch (type) {
      case 'leave':
        return 'LeaveApplicationEdit';
      case 'overtime':
        return 'OvertimeApplication'; // TODO: Create separate edit screen
      case 'forgot-check':
        return 'ForgotCheckApplication'; // TODO
      case 'business-trip':
        return 'BusinessTripApplication'; // TODO
      case 'resignation':
        return 'ResignationApplication'; // TODO
      default:
        return null;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'leave': '#fa8c16',
      'overtime': '#722ed1',
      'business-trip': '#1890ff',
      'forgot-check': '#eb2f96',
      'resignation': '#ff4d4f',
      'shift-registration': '#52c41a',
      'remote-work': '#13c2c2',
      'sick-leave': '#f5222d'
    };
    return colors[type] || '#8c8c8c';
  };

  // Render card
  const renderCard = (item, index) => (
    <Card style={styles.card} mode="elevated" elevation={2}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.topRow}>
          {/* Icon with status badge */}
          <View style={styles.iconWrapper}>
            <Avatar.Icon
              size={56}
              icon={getTypeIcon(item.type)}
              style={{ backgroundColor: getTypeColor(item.type) }}
            />
            <Badge
              size={14}
              style={[
                styles.statusBadge,
                { backgroundColor: APPLICATION_STATUS_COLORS[item.status] }
              ]}
            />
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            {/* User Name */}
            <Text style={styles.userName} numberOfLines={1}>
              {item.userInfo?.fullName || 'N/A'}
            </Text>

            {/* Type */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons 
                name={getTypeIcon(item.type)} 
                size={14} 
                color={getTypeColor(item.type)} 
              />
              <Text style={styles.infoText}>
                {APPLICATION_TYPE_LABELS[item.type] || item.type}
              </Text>
            </View>
            
            {/* Date Range or Type-specific info */}
            {(item.data?.startDate || item.data?.forgotDate || item.data?.overtimeDate) && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-range" size={14} color="#1890ff" />
                <Text style={styles.infoText}>
                  {item.data?.startDate && item.data?.endDate 
                    ? `${formatDate(item.data.startDate)} - ${formatDate(item.data.endDate)}`
                    : item.data?.forgotDate 
                    ? `${formatDate(item.data.forgotDate)} ${item.data?.forgotTime || ''}`
                    : item.data?.overtimeDate 
                    ? `${formatDate(item.data.overtimeDate)} (${item.data?.overtimeHours || 0}h)`
                    : 'N/A'}
                </Text>
              </View>
            )}

            {/* Status */}
            <View style={styles.infoRow}>
              <MaterialCommunityIcons 
                name={item.status === 1 ? 'check-circle' : item.status === 2 ? 'close-circle' : 'clock'} 
                size={14} 
                color={APPLICATION_STATUS_COLORS[item.status]} 
              />
              <Text style={[styles.infoText, { color: APPLICATION_STATUS_COLORS[item.status] }]}>
                {APPLICATION_STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsColumn}>
            <Menu
              visible={visibleMenuId === item.id}
              onDismiss={() => setVisibleMenuId(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  iconColor="#595959"
                  onPress={() => setVisibleMenuId(item.id)}
                />
              }
            >
              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  setVisibleMenuId(null);
                  const screen = getScreenForType(item.type);
                  if (screen) {
                    navigation.navigate(screen, { mode: 'view', applicationId: item.id });
                  } else {
                    Alert.alert('Không hỗ trợ', 'Loại đơn này chưa hỗ trợ xem chi tiết');
                  }
                }}
              >
                <MaterialCommunityIcons name="eye-outline" size={18} color="#595959" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Xem chi tiết</Text>
              </TouchableOpacity>

              {item.status === 0 && (
                <>
                  <Divider />

                  <TouchableOpacity
                    style={styles.menuItemRow}
                    onPress={() => {
                      setVisibleMenuId(null);
                      handleApprove(item.id, item.type, item.createdByInfo?.fullName);
                    }}
                  >
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color="#52c41a" style={styles.menuIcon} />
                    <Text style={[styles.menuItemText, { color: '#52c41a' }]}>Duyệt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItemRow}
                    onPress={() => {
                      setVisibleMenuId(null);
                      handleReject(item.id, item.type, item.createdByInfo?.fullName);
                    }}
                  >
                    <MaterialCommunityIcons name="close-circle-outline" size={18} color="#ff4d4f" style={styles.menuIcon} />
                    <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Từ chối</Text>
                  </TouchableOpacity>
                </>
              )}

              <Divider />

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  setVisibleMenuId(null);
                  handleDelete(item.id, item.type, item.createdByInfo?.fullName);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color="#ff4d4f" style={styles.menuIcon} />
                <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Xóa</Text>
              </TouchableOpacity>
            </Menu>
          </View>
        </View>

        {/* Reason/Notes */}
        {item.data?.reason && (
          <View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Lý do:</Text>
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.data.reason}
            </Text>
          </View>
        )}

        {/* Approved info */}
        {item.status === 1 && item.approvedByInfo && (
          <View style={styles.footerRow}>
            <MaterialCommunityIcons name="account-check" size={14} color="#52c41a" />
            <Text style={styles.footerText}>
              Duyệt bởi: {item.approvedByInfo.fullName} • {formatDate(item.approvedDate)}
            </Text>
          </View>
        )}

        {/* Reject reason */}
        {item.status === 2 && item.data?.rejectReason && (
          <View style={styles.footerRow}>
            <MaterialCommunityIcons name="close-circle" size={14} color="#ff4d4f" />
            <Text style={[styles.footerText, { color: '#ff4d4f' }]}>
              Lý do từ chối: {item.data.rejectReason}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const handleItemPress = (item) => {
    const screen = getScreenForType(item.type);
    if (screen) {
      navigation.navigate(screen, { mode: 'view', applicationId: item.id });
    } else {
      Alert.alert('Không hỗ trợ', 'Loại đơn này chưa hỗ trợ xem chi tiết');
    }
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        ref={listRef}
        fetchData={fetchApplications}
        renderCard={renderCard}
        searchPlaceholder="Tìm đơn từ (tên người tạo, loại đơn)..."
        onItemPress={handleItemPress}
        pageSize={10}
        emptyMessage="Không tìm thấy đơn từ nào"
        keyExtractor={(item) => item.id?.toString()}
        filters={[
          { key: 'userInfo.fullName', label: 'Tên nhân viên' },
          { key: 'reason', label: 'Lý do' },
          { 
            key: 'type', 
            label: 'Loại đơn',
            options: [
              { value: 'leave', label: 'Xin nghỉ phép' },
              { value: 'overtime', label: 'Làm thêm giờ' },
              { value: 'business-trip', label: 'Công tác' },
              { value: 'forgot-check', label: 'Quên check in/out' },
              { value: 'resignation', label: 'Thôi việc' },
              { value: 'remote-work', label: 'Làm việc từ xa' },
              { value: 'sick-leave', label: 'Nghỉ ốm' },
            ]
          },
          { 
            key: 'status', 
            label: 'Trạng thái',
            options: [
              { value: 0, label: 'Chờ duyệt' },
              { value: 1, label: 'Đã duyệt' },
              { value: 2, label: 'Từ chối' },
            ]
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  cardContent: {
    padding: 16
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconWrapper: {
    position: 'relative',
    marginRight: 12
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff'
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center'
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 6
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  infoText: {
    fontSize: 13,
    color: '#595959',
    marginLeft: 6,
    flex: 1
  },
  actionsColumn: {
    marginLeft: 8
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuIcon: {
    marginRight: 12
  },
  menuItemText: {
    fontSize: 14,
    color: '#262626'
  },
  reasonRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  reasonLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    fontWeight: '600',
    marginBottom: 4
  },
  reasonText: {
    fontSize: 13,
    color: '#595959',
    lineHeight: 18
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  footerText: {
    fontSize: 12,
    color: '#8c8c8c',
    marginLeft: 6,
    flex: 1
  }
});

export default ApplicationManagementScreen;

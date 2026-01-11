import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Surface,
  Chip,
  FAB,
  Avatar,
  ProgressBar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import JobService from '../../services/JobService';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';

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

  // Adapter for CardListWithInfiniteScroll.fetchData
  const fetchData = async (params = {}) => {
    try {
      console.log('[ProjectListScreen] fetchData params:', params);
      // CardList sends 1-based page; backend expects 0-based
      const apiParams = { ...params };
      if (apiParams.page && apiParams.page >= 1) {
        apiParams.page = Math.max(0, apiParams.page - 1);
      }

      const resp = await JobService.getAllProjectByScope(apiParams);
      const payload = resp?.data ?? resp;
      const dataItems = payload?.data?.results ?? payload?.results ?? payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : []);
      const total = payload?.data?.total ?? payload?.total ?? (Array.isArray(dataItems) ? dataItems.length : 0);

      console.log('[ProjectListScreen] Got items:', dataItems?.length, 'total:', total);

      // Map items to normalized shape
      const mapped = (dataItems || []).map((p) => {
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
          progress: Number(p.progress) || 0,
          budget: p.budget ? Number(p.budget) : 0,
          spent: p.spent ? Number(p.spent) : 0,
          manager,
          members: mappedMembers,
          customer: p.customer ?? '',
        };
      });

      return { results: mapped, total };
    } catch (error) {
      console.error('[ProjectListScreen] fetchData error:', error);
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message;
      if (status === 403 || (serverMsg && serverMsg.toString().toLowerCase().includes('forbidden'))) {
        Alert.alert('Không có quyền', 'Bạn không có quyền truy cập phần quản lý dự án. Vui lòng liên hệ quản trị viên.');
      }
      throw error;
    }
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

  const renderCard = (item) => {
    const statusColor = statusColors[item.status] || '#1890ff';
    const statusLabel = statusLabels[item.status] || item.status;

    return (
      <Surface style={styles.projectCard} elevation={2}>
        <View style={styles.cardHeader}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectId}>#{item.id}</Text>
            <Text style={styles.projectName} numberOfLines={2}>{item.name}</Text>
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
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        fetchData={fetchData}
        renderCard={renderCard}
        searchPlaceholder="Tìm kiếm dự án..."
        filters={[
          { 
            key: 'status', 
            label: 'Trạng thái', 
            options: Object.keys(statusLabels).map(k => ({ value: k, label: statusLabels[k] })) 
          }
        ]}
        onItemPress={(item) => handleViewDetail(item)}
        pageSize={10}
        emptyMessage="Chưa có dự án nào"
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
  projectCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1890ff',
  },
});

export default ProjectListScreen;

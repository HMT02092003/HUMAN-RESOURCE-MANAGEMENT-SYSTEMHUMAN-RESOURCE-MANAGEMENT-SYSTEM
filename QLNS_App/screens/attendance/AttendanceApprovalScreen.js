import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Chip,
  Searchbar,
  IconButton,
  Menu,
  Divider,
  Modal,
  Portal,
  Button,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AttendanceService from '../../services/AttendanceService';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== HELPER FUNCTIONS ====================
const formatVND = (amount) => {
  if (!amount) return '0';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '-';
  const parts = monthStr.split('-');
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return monthStr;
};

// ==================== MAIN COMPONENT ====================
const AttendanceApprovalScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenu, setFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, approved, pending
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // ==================== FETCH DATA ====================
  const fetchData = useCallback(async () => {
    try {
      console.log('📊 [App] Fetching monthly summaries for approval...');
      
      const response = await api.get('/attendance/monthly-summaries-by-scope', {
        params: {
          permissionKey: 'users',
          page: 0,
          pageSize: 100,
        }
      });

      // Support multiple response shapes:
      // 1) { success: true, data: { results: [...] } }
      // 2) { success: true, results: [...] }
      // 3) { results: [...] } (no success flag)
      const resp = response.data || {};
      console.log('📊 [App] API response shape:', Object.keys(resp));

      let items = [];
      if (resp.success && resp.data) {
        items = Array.isArray(resp.data.results) ? resp.data.results : (Array.isArray(resp.data) ? resp.data : []);
      } else if (Array.isArray(resp.results)) {
        items = resp.results;
      } else if (Array.isArray(resp)) {
        items = resp;
      }

      setData(items || []);
      console.log('✅ [App] Loaded', (items || []).length, 'records');
    } catch (error) {
      console.error('❌ [App] Error fetching monthly summaries:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách duyệt chấm công');
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ==================== APPROVE HANDLER ====================
  const handleApprove = async (record) => {
    Alert.alert(
      'Xác nhận duyệt',
      `Bạn có chắc chắn muốn duyệt bảng chấm công tháng ${formatMonth(record.month)} của ${record.user?.fullName || `${record.user?.firstName || ''} ${record.user?.lastName || ''}`.trim()}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          style: 'default',
          onPress: async () => {
            try {
              await api.post('/attendance/approve-monthly', {
                ids: [record.id]
              });
              Alert.alert('Thành công', 'Đã duyệt bảng chấm công');
              fetchData();
            } catch (error) {
              Alert.alert('Lỗi', error.message || 'Không thể duyệt bảng chấm công');
            }
          },
        },
      ]
    );
  };

  // ==================== VIEW DETAIL HANDLER ====================
  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedRecord(null);
  };

  // ==================== FILTER DATA ====================
  const filteredData = data.filter((item) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const userName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.toLowerCase();
    const username = (item.user?.username || '').toLowerCase();
    const department = (item.user?.department?.name || '').toLowerCase();
    
    const matchesSearch = !searchQuery || 
      userName.includes(searchLower) || 
      username.includes(searchLower) || 
      department.includes(searchLower);

    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'approved' && item.isApproved) ||
      (filterStatus === 'pending' && !item.isApproved);

    return matchesSearch && matchesStatus;
  });

  // ==================== RENDER ITEM ====================
  const renderItem = ({ item }) => {
    const userName = (item.user?.fullName && item.user.fullName.trim()) || `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.trim() || item.user?.username || '—';
    const department = item.user?.department?.name || 'Chưa xác định';

    return (
      <Card style={styles.card} onPress={() => handleViewDetail(item)}>
        <Card.Content>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.department}>{department}</Text>
            </View>
            <Chip
              mode="flat"
              style={{
                backgroundColor: item.isApproved ? '#f6ffed' : '#fff1f0',
              }}
              textStyle={{
                color: item.isApproved ? '#52c41a' : '#ff4d4f',
                fontSize: 11,
              }}
            >
              {item.isApproved ? 'Đã duyệt' : 'Chưa duyệt'}
            </Chip>
          </View>

          {/* Month */}
          <View style={styles.monthRow}>
            <MaterialCommunityIcons name="calendar-month" size={16} color="#1890ff" />
            <Text style={styles.monthText}>{formatMonth(item.month)}</Text>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ngày công</Text>
              <Text style={[styles.statValue, { color: '#52c41a' }]}>{item.presentDays || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ngày vắng</Text>
              <Text style={[styles.statValue, { color: '#ff4d4f' }]}>{item.absentDays || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tổng công</Text>
              <Text style={[styles.statValue, { color: '#fa8c16' }]}>{Number(item.totalWorkingUnits || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>OT (giờ)</Text>
              <Text style={[styles.statValue, { color: '#13c2c2' }]}>{Number(item.totalOvertimeHours || 0).toFixed(1)}</Text>
            </View>
          </View>

          {/* Penalty Info */}
          {(item.totalPenalty > 0) && (
            <View style={styles.penaltyRow}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#ff4d4f" />
              <Text style={styles.penaltyText}>
                Tổng phạt: {formatVND(item.totalPenalty)}đ
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewDetail(item)}
            >
              <MaterialCommunityIcons name="eye" size={16} color="#1890ff" />
              <Text style={styles.viewButtonText}>Xem chi tiết</Text>
            </TouchableOpacity>

            {!item.isApproved && (
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleApprove(item)}
              >
                <MaterialCommunityIcons name="check-circle" size={16} color="#52c41a" />
                <Text style={styles.approveButtonText}>Duyệt</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách...</Text>
      </View>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <Surface style={styles.searchContainer} elevation={1}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Tìm kiếm..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          <Menu
            visible={filterMenu}
            onDismiss={() => setFilterMenu(false)}
            anchor={
              <IconButton
                icon="filter-variant"
                size={24}
                onPress={() => setFilterMenu(true)}
                style={styles.filterButton}
              />
            }
          >
            <Menu.Item
              onPress={() => { setFilterStatus('all'); setFilterMenu(false); }}
              title="Tất cả"
              leadingIcon={filterStatus === 'all' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => { setFilterStatus('pending'); setFilterMenu(false); }}
              title="Chưa duyệt"
              leadingIcon={filterStatus === 'pending' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => { setFilterStatus('approved'); setFilterMenu(false); }}
              title="Đã duyệt"
              leadingIcon={filterStatus === 'approved' ? 'check' : undefined}
            />
          </Menu>
        </View>

        {/* Filter chips */}
        {filterStatus !== 'all' && (
          <View style={styles.filterChips}>
            <Chip
              mode="outlined"
              onClose={() => setFilterStatus('all')}
              style={styles.filterChip}
            >
              {filterStatus === 'approved' ? 'Đã duyệt' : 'Chưa duyệt'}
            </Chip>
          </View>
        )}
      </Surface>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          Hiển thị {filteredData.length}/{data.length} bản ghi
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off" size={48} color="#d9d9d9" />
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedRecord && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết bảng chấm công</Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={closeModal}
                  style={styles.closeButton}
                />
              </View>

              <Divider style={{ marginBottom: 16 }} />

              {/* User Info */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Thông tin nhân viên</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account" size={18} color="#1890ff" />
                  <Text style={styles.infoLabel}>Họ tên:</Text>
                  <Text style={styles.infoValue}>
                    {selectedRecord.user?.fullName || `${selectedRecord.user?.firstName || ''} ${selectedRecord.user?.lastName || ''}`.trim() || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="badge-account" size={18} color="#1890ff" />
                  <Text style={styles.infoLabel}>Username:</Text>
                  <Text style={styles.infoValue}>{selectedRecord.user?.username || selectedRecord.user?.email || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="office-building" size={18} color="#1890ff" />
                  <Text style={styles.infoLabel}>Phòng ban:</Text>
                  <Text style={styles.infoValue}>{selectedRecord.user?.department?.name || 'Chưa xác định'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar-month" size={18} color="#1890ff" />
                  <Text style={styles.infoLabel}>Tháng:</Text>
                  <Text style={styles.infoValue}>{formatMonth(selectedRecord.month)}</Text>
                </View>
              </View>

              {/* Attendance Stats */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Thống kê chấm công</Text>
                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatValue}>{selectedRecord.presentDays || 0}</Text>
                    <Text style={styles.modalStatLabel}>Ngày công</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={[styles.modalStatValue, { color: '#ff4d4f' }]}>{selectedRecord.absentDays || 0}</Text>
                    <Text style={styles.modalStatLabel}>Ngày vắng</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={[styles.modalStatValue, { color: '#fa8c16' }]}>{selectedRecord.lateDays || 0}</Text>
                    <Text style={styles.modalStatLabel}>Đi muộn</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={[styles.modalStatValue, { color: '#722ed1' }]}>{selectedRecord.earlyLeaveDays || 0}</Text>
                    <Text style={styles.modalStatLabel}>Về sớm</Text>
                  </View>
                </View>
              </View>

              {/* Working Units */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Công & Giờ làm</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng công:</Text>
                  <Text style={styles.detailValue}>{Number(selectedRecord.totalWorkingUnits || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Công OT:</Text>
                  <Text style={styles.detailValue}>{Number(selectedRecord.totalOtWorkingUnits || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng giờ làm:</Text>
                  <Text style={styles.detailValue}>{Number(selectedRecord.totalHours || selectedRecord.totalWorkHours || 0).toFixed(1)} giờ</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giờ OT:</Text>
                  <Text style={styles.detailValue}>{Number(selectedRecord.totalOvertimeHours || 0).toFixed(1)} giờ</Text>
                </View>
              </View>

              {/* Penalties */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Thông tin phạt</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phạt đi muộn:</Text>
                  <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>{formatVND(selectedRecord.totalLatePenalty || 0)}đ</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phạt về sớm:</Text>
                  <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>{formatVND(selectedRecord.totalEarlyLeavePenalty || 0)}đ</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phạt vắng không phép:</Text>
                  <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>{formatVND(selectedRecord.totalUnauthorizedAbsencePenalty || 0)}đ</Text>
                </View>
                <View style={[styles.detailRow, { backgroundColor: '#fff1f0', padding: 8, borderRadius: 6, marginTop: 8 }]}>
                  <Text style={[styles.detailLabel, { fontWeight: '600' }]}>Tổng phạt:</Text>
                  <Text style={[styles.detailValue, { color: '#ff4d4f', fontWeight: '600' }]}>{formatVND(selectedRecord.totalPenalty || 0)}đ</Text>
                </View>
              </View>

              {/* Overtime Pay */}
              {(selectedRecord.totalOvertimePay > 0 || selectedRecord.totalOvertimeSalary > 0) && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Lương OT</Text>
                  <View style={[styles.detailRow, { backgroundColor: '#e6f7ff', padding: 8, borderRadius: 6 }]}>
                    <Text style={styles.detailLabel}>Tổng lương OT:</Text>
                    <Text style={[styles.detailValue, { color: '#1890ff', fontWeight: '600' }]}>
                      {formatVND(selectedRecord.totalOvertimePay || selectedRecord.totalOvertimeSalary || 0)}đ
                    </Text>
                  </View>
                </View>
              )}

              {/* Status */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Trạng thái</Text>
                <View style={styles.statusRow}>
                  <Chip
                    mode="flat"
                    style={{
                      backgroundColor: selectedRecord.isApproved ? '#f6ffed' : '#fff1f0',
                    }}
                    textStyle={{
                      color: selectedRecord.isApproved ? '#52c41a' : '#ff4d4f',
                    }}
                  >
                    {selectedRecord.isApproved ? 'Đã duyệt' : 'Chưa duyệt'}
                  </Chip>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                {!selectedRecord.isApproved && (
                  <Button
                    mode="contained"
                    onPress={() => {
                      closeModal();
                      handleApprove(selectedRecord);
                    }}
                    style={styles.approveModalButton}
                    buttonColor="#52c41a"
                  >
                    Duyệt bảng chấm công
                  </Button>
                )}
                <Button
                  mode="outlined"
                  onPress={closeModal}
                  style={styles.closeModalButton}
                >
                  Đóng
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },

  // Search
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#f5f7fa',
  },
  filterButton: {
    marginLeft: 4,
  },
  filterChips: {
    flexDirection: 'row',
    marginTop: 8,
  },
  filterChip: {
    marginRight: 8,
  },

  // Summary
  summaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#8c8c8c',
  },

  // List
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },

  // Card
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  department: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  monthText: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: '500',
    marginLeft: 6,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Penalty
  penaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff1f0',
    borderRadius: 6,
  },
  penaltyText: {
    fontSize: 12,
    color: '#ff4d4f',
    marginLeft: 6,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  viewButtonText: {
    fontSize: 13,
    color: '#1890ff',
    marginLeft: 4,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  approveButtonText: {
    fontSize: 13,
    color: '#52c41a',
    marginLeft: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 12,
  },

  // Modal
  modalContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  closeButton: {
    margin: -8,
  },
  modalSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8c8c8c',
    marginLeft: 8,
    width: 80,
  },
  infoValue: {
    fontSize: 13,
    color: '#262626',
    flex: 1,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
  },
  modalStatItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#52c41a',
  },
  modalStatLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#595959',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#262626',
  },
  statusRow: {
    flexDirection: 'row',
  },
  modalActions: {
    marginTop: 16,
    gap: 12,
  },
  approveModalButton: {
    borderRadius: 8,
  },
  closeModalButton: {
    borderRadius: 8,
  },
});

export default AttendanceApprovalScreen;

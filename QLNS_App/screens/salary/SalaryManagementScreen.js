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
  Button,
  Chip,
  Divider,
  Modal,
  Portal,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SalaryService from '../../services/SalaryService';
import CheckPermission from '../../components/CheckPermission';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== HELPER FUNCTIONS ====================
const formatVND = (amount) => {
  if (amount === null || amount === undefined) return '0';
  const number = parseFloat(amount.toString());
  if (isNaN(number)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(number));
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getMonthsList = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  }
  return months;
};

const STATUS_LABELS = {
  1: { label: 'Chờ xử lý', color: '#faad14', bg: '#fffbe6' },
  2: { label: 'Đã thanh toán', color: '#52c41a', bg: '#f6ffed' },
};

// ==================== MAIN COMPONENT ====================
const SalaryManagementScreen = ({ navigation }) => {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthsList()[0]);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  // Modal chi tiết
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal người dùng không hợp lệ
  const [invalidUsersModalVisible, setInvalidUsersModalVisible] = useState(false);
  const [invalidUsersData, setInvalidUsersData] = useState({
    usersWithoutContracts: [],
    usersWithoutApprovedAttendance: [],
    usersWithoutSalaryProfile: [],
  });

  // ==================== FETCH DATA ====================
  const fetchData = useCallback(async () => {
    try {
      console.log('📊 [App] Fetching payslips for month:', selectedMonth.value);
      const res = await SalaryService.listPayslips(selectedMonth.value);
      if (res.success) {
        setData(res.data || []);
        console.log(' [App] Loaded', (res.data || []).length, 'payslips');
      } else {
        setData([]);
      }
    } catch (error) {
      console.error(' [App] Error fetching payslips:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bảng lương');
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ==================== HANDLERS ====================
  const handleCalculate = async () => {
    Alert.alert(
      'Xác nhận tính lương',
      `Bạn có chắc chắn muốn tính bảng lương cho ${selectedMonth.label}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tính lương',
          onPress: async () => {
            try {
              setCalculating(true);
              const res = await SalaryService.calculateBulkAsync({
                year: selectedMonth.year,
                month: selectedMonth.month,
                userIds: []
              });

              // Backend có thể trả về thông tin người dùng không hợp lệ ngay từ queue dispatch
              const hasInvalidUsers =
                (res.usersWithoutContracts?.length > 0) ||
                (res.usersWithoutApprovedAttendance?.length > 0) ||
                (res.usersWithoutSalaryProfile?.length > 0);

              if (hasInvalidUsers) {
                setInvalidUsersData({
                  usersWithoutContracts: res.usersWithoutContracts || [],
                  usersWithoutApprovedAttendance: res.usersWithoutApprovedAttendance || [],
                  usersWithoutSalaryProfile: res.usersWithoutSalaryProfile || [],
                });
                setInvalidUsersModalVisible(true);
              }

              if (res.success) {
                Alert.alert('Thành công', `🚀 Đang tính lương cho ${selectedMonth.label} ở background. Bạn sẽ nhận thông báo khi hoàn tất!`);
                fetchData();
              } else {
                Alert.alert('Lỗi', res.message || 'Không thể tính bảng lương');
              }
            } catch (error) {
              console.error('Error calculating:', error);
              Alert.alert('Lỗi', 'Có lỗi xảy ra khi tính bảng lương');
            } finally {
              setCalculating(false);
            }
          },
        },
      ]
    );
  };

  const handleViewDetail = async (payslip) => {
    try {
      setDetailLoading(true);
      setDetailModalVisible(true);
      const res = await SalaryService.getPayslipById(payslip.id);
      if (res.success) {
        setSelectedPayslip(res.data);
      } else {
        Alert.alert('Lỗi', 'Không thể tải chi tiết bảng lương');
        setDetailModalVisible(false);
      }
    } catch (error) {
      console.error('Error loading detail:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra');
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedPayslip(null);
  };

  // ==================== RENDER ITEM ====================
  const renderItem = ({ item }) => {
    const userName = item.fullName || item.username || 'N/A';
    const department = item.department?.name || 'N/A';
    const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS[1];

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
              style={{ backgroundColor: statusInfo.bg }}
              textStyle={{ color: statusInfo.color, fontSize: 11 }}
            >
              {statusInfo.label}
            </Chip>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          {/* Salary Info */}
          <View style={styles.salaryGrid}>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryLabel}>Lương cơ bản</Text>
              <Text style={styles.salaryValue}>{formatVND(item.base_salary)}</Text>
            </View>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryLabel}>Phụ cấp</Text>
              <Text style={styles.salaryValue}>{formatVND(item.allowances)}</Text>
            </View>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryLabel}>Tăng ca</Text>
              <Text style={styles.salaryValue}>{formatVND(item.overtime_pay)}</Text>
            </View>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryLabel}>Khấu trừ</Text>
              <Text style={[styles.salaryValue, { color: '#ff4d4f' }]}>
                -{formatVND(item.total_deductions)}
              </Text>
            </View>
          </View>

          {/* Net Salary */}
          <View style={styles.netSalaryRow}>
            <Text style={styles.netSalaryLabel}>Thực nhận:</Text>
            <Text style={styles.netSalaryValue}>{formatVND(item.net_salary)} VNĐ</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách...</Text>
      </View>
    );
  }

  const totalInvalidUsers =
    invalidUsersData.usersWithoutContracts.length +
    invalidUsersData.usersWithoutApprovedAttendance.length +
    invalidUsersData.usersWithoutSalaryProfile.length;

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      {/* Header Controls */}
      <Surface style={styles.headerContainer} elevation={1}>
        {/* Month Picker */}
        <TouchableOpacity
          style={styles.monthPicker}
          onPress={() => setMonthPickerVisible(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#1890ff" />
          <Text style={styles.monthPickerText}>{selectedMonth.label}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#8c8c8c" />
        </TouchableOpacity>

        {/* Calculate Button */}
        <CheckPermission permissionKey="salaries" requiredType="create">
          <Button
            mode="contained"
            onPress={handleCalculate}
            loading={calculating}
            disabled={calculating}
            icon="calculator"
            style={styles.calculateBtn}
          >
            Tính lương
          </Button>
        </CheckPermission>
      </Surface>

      {/* Invalid Users Warning */}
      {totalInvalidUsers > 0 && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => setInvalidUsersModalVisible(true)}
        >
          <MaterialCommunityIcons name="alert" size={20} color="#faad14" />
          <Text style={styles.warningText}>
            Có {totalInvalidUsers} người không thể tính lương
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#faad14" />
        </TouchableOpacity>
      )}

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          Tổng: {data.length} bảng lương
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id?.toString() || `${item.user_id}-${item.year}-${item.month}`}
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
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#d9d9d9" />
            <Text style={styles.emptyText}>Chưa có bảng lương cho tháng này</Text>
            <Text style={styles.emptySubText}>Nhấn "Tính lương" để tạo bảng lương</Text>
          </View>
        }
      />

      {/* Month Picker Modal */}
      <Portal>
        <Modal
          visible={monthPickerVisible}
          onDismiss={() => setMonthPickerVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Chọn tháng</Text>
          <ScrollView style={styles.monthList}>
            {getMonthsList().map((month) => (
              <TouchableOpacity
                key={month.value}
                style={[
                  styles.monthItem,
                  selectedMonth.value === month.value && styles.monthItemSelected,
                ]}
                onPress={() => {
                  setSelectedMonth(month);
                  setMonthPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.monthItemText,
                    selectedMonth.value === month.value && styles.monthItemTextSelected,
                  ]}
                >
                  {month.label}
                </Text>
                {selectedMonth.value === month.value && (
                  <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button mode="outlined" onPress={() => setMonthPickerVisible(false)}>
            Đóng
          </Button>
        </Modal>
      </Portal>

      {/* Detail Modal */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={closeDetailModal}
          contentContainerStyle={styles.detailModalContainer}
        >
          {detailLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : selectedPayslip ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailName}>
                    {selectedPayslip.fullName || selectedPayslip.username}
                  </Text>
                  <Text style={styles.detailDept}>
                    {selectedPayslip.department?.name || selectedPayslip.departmentName || 'N/A'}
                  </Text>
                </View>
                <IconButton icon="close" size={24} onPress={closeDetailModal} />
              </View>

              <Text style={styles.detailPeriod}>
                Kỳ lương: {selectedPayslip.month}/{selectedPayslip.year}
              </Text>

              <Divider style={{ marginVertical: 16 }} />

              {/* Income Section */}
              <Text style={styles.sectionTitle}>Thu nhập</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lương cơ bản</Text>
                <Text style={styles.detailValue}>{formatVND(selectedPayslip.base_salary)} VNĐ</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phụ cấp</Text>
                <Text style={styles.detailValue}>{formatVND(selectedPayslip.allowances)} VNĐ</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lương tăng ca</Text>
                <Text style={styles.detailValue}>{formatVND(selectedPayslip.overtime_pay)} VNĐ</Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Tổng thu nhập (Gross)</Text>
                <Text style={styles.totalValue}>{formatVND(selectedPayslip.gross_salary)} VNĐ</Text>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Deductions Section */}
              <Text style={styles.sectionTitle}>Khấu trừ</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>BHXH</Text>
                <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                  -{formatVND(selectedPayslip.social_insurance)} VNĐ
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>BHYT</Text>
                <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                  -{formatVND(selectedPayslip.health_insurance)} VNĐ
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Thuế TNCN</Text>
                <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                  -{formatVND(selectedPayslip.personal_income_tax)} VNĐ
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tiền phạt</Text>
                <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>
                  -{formatVND(selectedPayslip.penalty_total)} VNĐ
                </Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Tổng khấu trừ</Text>
                <Text style={[styles.totalValue, { color: '#ff4d4f' }]}>
                  -{formatVND(selectedPayslip.total_deductions)} VNĐ
                </Text>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Net Salary */}
              <View style={styles.netSalarySection}>
                <Text style={styles.netLabel}>LƯƠNG THỰC NHẬN</Text>
                <Text style={styles.netValue}>{formatVND(selectedPayslip.net_salary)} VNĐ</Text>
              </View>

              {selectedPayslip.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Ghi chú:</Text>
                  <Text style={styles.notesValue}>{selectedPayslip.notes}</Text>
                </View>
              )}

              <Button mode="outlined" onPress={closeDetailModal} style={{ marginTop: 16 }}>
                Đóng
              </Button>
            </ScrollView>
          ) : null}
        </Modal>
      </Portal>

      {/* Invalid Users Modal */}
      <Portal>
        <Modal
          visible={invalidUsersModalVisible}
          onDismiss={() => setInvalidUsersModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Người dùng không hợp lệ</Text>
          <ScrollView style={styles.invalidUsersList}>
            {invalidUsersData.usersWithoutContracts.length > 0 && (
              <View style={styles.invalidSection}>
                <Text style={styles.invalidSectionTitle}>
                  Chưa có hợp đồng ({invalidUsersData.usersWithoutContracts.length})
                </Text>
                {invalidUsersData.usersWithoutContracts.map((user, idx) => (
                  <Text key={idx} style={styles.invalidUserName}>
                    • {user.firstName} {user.lastName} ({user.username})
                  </Text>
                ))}
              </View>
            )}
            {invalidUsersData.usersWithoutApprovedAttendance.length > 0 && (
              <View style={styles.invalidSection}>
                <Text style={styles.invalidSectionTitle}>
                  Chưa duyệt chấm công ({invalidUsersData.usersWithoutApprovedAttendance.length})
                </Text>
                {invalidUsersData.usersWithoutApprovedAttendance.map((user, idx) => (
                  <Text key={idx} style={styles.invalidUserName}>
                    • {user.firstName} {user.lastName} ({user.username})
                  </Text>
                ))}
              </View>
            )}
            {invalidUsersData.usersWithoutSalaryProfile.length > 0 && (
              <View style={styles.invalidSection}>
                <Text style={styles.invalidSectionTitle}>
                  Chưa có hồ sơ lương ({invalidUsersData.usersWithoutSalaryProfile.length})
                </Text>
                {invalidUsersData.usersWithoutSalaryProfile.map((user, idx) => (
                  <Text key={idx} style={styles.invalidUserName}>
                    • {user.firstName} {user.lastName} ({user.username})
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>
          <Button mode="outlined" onPress={() => setInvalidUsersModalVisible(false)}>
            Đóng
          </Button>
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
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },

  // Header
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
  },
  monthPickerText: {
    flex: 1,
    fontSize: 14,
    color: '#262626',
    marginLeft: 8,
  },
  calculateBtn: {
    borderRadius: 8,
  },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffe58f',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#d48806',
    marginLeft: 8,
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

  // Salary Grid
  salaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  salaryItem: {
    width: '50%',
    paddingVertical: 6,
  },
  salaryLabel: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  salaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginTop: 2,
  },

  // Net Salary
  netSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  netSalaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  netSalaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#52c41a',
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
  emptySubText: {
    fontSize: 12,
    color: '#bfbfbf',
    marginTop: 4,
  },

  // Modal
  modalContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  monthList: {
    maxHeight: 300,
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  monthItemSelected: {
    backgroundColor: '#e6f7ff',
  },
  monthItemText: {
    fontSize: 14,
    color: '#262626',
  },
  monthItemTextSelected: {
    color: '#1890ff',
    fontWeight: '600',
  },

  // Detail Modal
  detailModalContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  detailDept: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 2,
  },
  detailPeriod: {
    fontSize: 14,
    color: '#1890ff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  totalRow: {
    backgroundColor: '#fafafa',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  netSalarySection: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f6ffed',
    borderRadius: 8,
  },
  netLabel: {
    fontSize: 12,
    color: '#52c41a',
    marginBottom: 4,
  },
  netValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#52c41a',
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  notesValue: {
    fontSize: 13,
    color: '#595959',
  },

  // Invalid Users Modal
  invalidUsersList: {
    maxHeight: 300,
  },
  invalidSection: {
    marginBottom: 16,
  },
  invalidSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#faad14',
    marginBottom: 8,
  },
  invalidUserName: {
    fontSize: 13,
    color: '#595959',
    paddingVertical: 4,
    paddingLeft: 8,
  },
});

export default SalaryManagementScreen;

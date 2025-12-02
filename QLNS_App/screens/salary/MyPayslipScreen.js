import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Divider,
  Modal,
  Portal,
  IconButton,
  Button,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SalaryService from '../../services/SalaryService';
import { useAuth } from '../../services/AuthContext';

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

// ==================== MAIN COMPONENT ====================
const MyPayslipScreen = () => {
  const theme = useTheme();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);

  // Modal chi tiết
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ==================== FETCH DATA ====================
  const fetchData = useCallback(async () => {
    try {
      console.log('📊 [App] Fetching my payslips...');
      const res = await SalaryService.getMyPayslips();
      if (res.success) {
        // Sort by year and month descending
        const sorted = (res.data || []).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setData(sorted);
        console.log('✅ [App] Loaded', sorted.length, 'payslips');
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('❌ [App] Error fetching my payslips:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bảng lương');
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

  // ==================== HANDLERS ====================
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

  // ==================== CALCULATIONS ====================
  const totalNetSalary = data.reduce((sum, item) => {
    return sum + (parseFloat(item.net_salary) || 0);
  }, 0);

  const currentYearPayslips = data.filter((item) => item.year === new Date().getFullYear());
  const currentYearTotal = currentYearPayslips.reduce((sum, item) => {
    return sum + (parseFloat(item.net_salary) || 0);
  }, 0);

  // ==================== RENDER ITEM ====================
  const renderItem = ({ item }) => {
    return (
      <Card style={styles.card} onPress={() => handleViewDetail(item)}>
        <Card.Content>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.periodInfo}>
              <MaterialCommunityIcons name="calendar-month" size={20} color="#1890ff" />
              <Text style={styles.periodText}>
                Tháng {item.month}/{item.year}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleViewDetail(item)}>
              <MaterialCommunityIcons name="eye-outline" size={22} color="#1890ff" />
            </TouchableOpacity>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          {/* Salary Summary */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Lương cơ bản</Text>
              <Text style={styles.summaryValue}>{formatVND(item.base_salary)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Phụ cấp</Text>
              <Text style={styles.summaryValue}>{formatVND(item.allowances)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tăng ca</Text>
              <Text style={styles.summaryValue}>{formatVND(item.overtime_pay)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Khấu trừ</Text>
              <Text style={[styles.summaryValue, { color: '#ff4d4f' }]}>
                -{formatVND(item.total_deductions)}
              </Text>
            </View>
          </View>

          {/* Net Salary */}
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Thực nhận</Text>
            <Text style={styles.netValue}>{formatVND(item.net_salary)} VNĐ</Text>
          </View>

          {/* Created Date */}
          <Text style={styles.createdDate}>
            Ngày tạo: {formatDate(item.created_at)}
          </Text>
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

  // ==================== MAIN RENDER ====================
  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <Surface style={styles.statsHeader} elevation={1}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tổng lương năm {new Date().getFullYear()}</Text>
            <Text style={styles.statValue}>{formatVND(currentYearTotal)}</Text>
            <Text style={styles.statUnit}>VNĐ</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f6ffed' }]}>
            <Text style={styles.statLabel}>Số phiếu lương</Text>
            <Text style={[styles.statValue, { color: '#52c41a' }]}>{data.length}</Text>
            <Text style={styles.statUnit}>phiếu</Text>
          </View>
        </View>
      </Surface>

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
            <Text style={styles.emptyText}>Bạn chưa có bảng lương nào</Text>
          </View>
        }
      />

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
                  <Text style={styles.detailTitle}>Phiếu lương</Text>
                  <Text style={styles.detailPeriod}>
                    Tháng {selectedPayslip.month}/{selectedPayslip.year}
                  </Text>
                </View>
                <IconButton icon="close" size={24} onPress={closeDetailModal} />
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Payslip Content - Like a real payslip */}
              <View style={styles.payslipContainer}>
                {/* Header */}
                <View style={styles.payslipHeader}>
                  <Text style={styles.payslipName}>
                    {selectedPayslip.fullName || selectedPayslip.username || user?.firstName + ' ' + user?.lastName}
                  </Text>
                  <Text style={styles.payslipDept}>
                    {selectedPayslip.department?.name || selectedPayslip.departmentName || 'N/A'}
                  </Text>
                </View>

                {/* Two columns layout */}
                <View style={styles.payslipColumns}>
                  {/* Income Column */}
                  <View style={styles.payslipColumn}>
                    <Text style={styles.columnTitle}>THU NHẬP</Text>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Lương cơ bản</Text>
                      <Text style={styles.lineValue}>{formatVND(selectedPayslip.base_salary)}</Text>
                    </View>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Phụ cấp</Text>
                      <Text style={styles.lineValue}>{formatVND(selectedPayslip.allowances)}</Text>
                    </View>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Tăng ca</Text>
                      <Text style={styles.lineValue}>{formatVND(selectedPayslip.overtime_pay)}</Text>
                    </View>
                    <View style={styles.lineTotal}>
                      <Text style={styles.lineTotalLabel}>Tổng (Gross)</Text>
                      <Text style={styles.lineTotalValue}>{formatVND(selectedPayslip.gross_salary)}</Text>
                    </View>
                  </View>

                  {/* Deduction Column */}
                  <View style={[styles.payslipColumn, { borderLeftWidth: 1, borderLeftColor: '#f0f0f0', paddingLeft: 12 }]}>
                    <Text style={styles.columnTitle}>KHẤU TRỪ</Text>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>BHXH</Text>
                      <Text style={[styles.lineValue, { color: '#ff4d4f' }]}>{formatVND(selectedPayslip.social_insurance)}</Text>
                    </View>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>BHYT</Text>
                      <Text style={[styles.lineValue, { color: '#ff4d4f' }]}>{formatVND(selectedPayslip.health_insurance)}</Text>
                    </View>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Thuế TNCN</Text>
                      <Text style={[styles.lineValue, { color: '#ff4d4f' }]}>{formatVND(selectedPayslip.personal_income_tax)}</Text>
                    </View>
                    <View style={styles.lineItem}>
                      <Text style={styles.lineLabel}>Tiền phạt</Text>
                      <Text style={[styles.lineValue, { color: '#ff4d4f' }]}>{formatVND(selectedPayslip.penalty_total)}</Text>
                    </View>
                    <View style={styles.lineTotal}>
                      <Text style={styles.lineTotalLabel}>Tổng khấu trừ</Text>
                      <Text style={[styles.lineTotalValue, { color: '#ff4d4f' }]}>{formatVND(selectedPayslip.total_deductions)}</Text>
                    </View>
                  </View>
                </View>

                {/* Net Salary */}
                <View style={styles.netSalaryBox}>
                  <Text style={styles.netSalaryLabel}>LƯƠNG THỰC NHẬN</Text>
                  <Text style={styles.netSalaryAmount}>{formatVND(selectedPayslip.net_salary)} VNĐ</Text>
                </View>

                {/* Notes */}
                {selectedPayslip.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Ghi chú:</Text>
                    <Text style={styles.notesText}>{selectedPayslip.notes}</Text>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.payslipFooter}>
                  <Text style={styles.footerText}>Ngày tạo: {formatDate(selectedPayslip.created_at)}</Text>
                </View>
              </View>

              <Button mode="outlined" onPress={closeDetailModal} style={{ marginTop: 16 }}>
                Đóng
              </Button>
            </ScrollView>
          ) : null}
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

  // Stats Header
  statsHeader: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#e6f7ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#595959',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1890ff',
  },
  statUnit: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
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
    alignItems: 'center',
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1890ff',
    marginLeft: 8,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginTop: 2,
  },

  // Net Row
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  netValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#52c41a',
  },

  createdDate: {
    fontSize: 11,
    color: '#bfbfbf',
    marginTop: 8,
    textAlign: 'right',
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

  // Detail Modal
  detailModalContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  detailPeriod: {
    fontSize: 14,
    color: '#1890ff',
    marginTop: 4,
  },

  // Payslip Container
  payslipContainer: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  payslipHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    marginBottom: 12,
  },
  payslipName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  payslipDept: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 2,
  },

  // Columns
  payslipColumns: {
    flexDirection: 'row',
  },
  payslipColumn: {
    flex: 1,
    paddingRight: 12,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1890ff',
    marginBottom: 8,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineLabel: {
    fontSize: 12,
    color: '#595959',
  },
  lineValue: {
    fontSize: 12,
    color: '#262626',
  },
  lineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  lineTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262626',
  },
  lineTotalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262626',
  },

  // Net Salary Box
  netSalaryBox: {
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
    backgroundColor: '#f6ffed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  netSalaryLabel: {
    fontSize: 12,
    color: '#52c41a',
    marginBottom: 4,
  },
  netSalaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#52c41a',
  },

  // Notes
  notesBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  notesText: {
    fontSize: 12,
    color: '#595959',
    marginTop: 2,
  },

  // Footer
  payslipFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 11,
    color: '#bfbfbf',
  },
});

export default MyPayslipScreen;

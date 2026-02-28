import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Chip, FAB } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import SalaryService from '../../services/SalaryService';
import api from '../../services/api';

const EditSalaryScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};

  const [profiles, setProfiles] = useState([]);
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [baseSalary, setBaseSalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAllowances, setSelectedAllowances] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, atRes] = await Promise.all([
        api.get(`/salary/users/${userId}/salary-profiles`).catch(() => ({ data: null })),
        SalaryService.getAllAllowanceTypes(),
      ]);
      const profileData = profileRes?.data?.data ?? profileRes?.data ?? [];
      const atData = atRes?.data ?? atRes ?? [];
      setProfiles(Array.isArray(profileData) ? profileData : []);
      setAllowanceTypes(Array.isArray(atData) ? atData : []);
    } catch (error) {
      console.error('Error loading salary data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu lương');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [userId]);

  const openCreateModal = () => {
    setBaseSalary('');
    setEffectiveFrom(new Date());
    setSelectedAllowances([]);
    setModalVisible(true);
  };

  const toggleAllowance = (at) => {
    setSelectedAllowances((prev) => {
      const exists = prev.find((a) => a.id === at.id);
      if (exists) return prev.filter((a) => a.id !== at.id);
      return [...prev, { id: at.id, name: at.name, amount: '' }];
    });
  };

  const updateAllowanceAmount = (id, value) => {
    setSelectedAllowances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, amount: value } : a))
    );
  };

  const handleSave = async () => {
    if (!baseSalary || isNaN(parseFloat(baseSalary))) {
      Alert.alert('Thông báo', 'Vui lòng nhập lương cơ bản hợp lệ');
      return;
    }
    const payload = {
      baseSalary: parseFloat(baseSalary),
      effectiveFrom: dayjs(effectiveFrom).format('YYYY-MM-DD'),
      allowances: selectedAllowances.map((a) => ({
        allowanceTypeId: a.id,
        amount: parseFloat(a.amount) || 0,
      })),
    };
    setSubmitting(true);
    try {
      await api.post(`/salary/users/${userId}/salary-profiles`, payload);
      Alert.alert('Thành công', 'Tạo profile lương mới thành công!');
      setModalVisible(false);
      loadData();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Lưu thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (profile) => {
    const now = dayjs();
    const from = profile.effectiveFrom ? dayjs(profile.effectiveFrom) : null;
    const to = profile.effectiveTo ? dayjs(profile.effectiveTo) : null;

    if (!from) return { label: 'Không rõ', color: '#8c8c8c', bg: '#f0f0f0' };
    if (to && now.isAfter(to)) return { label: 'Đã hết hạn', color: '#595959', bg: '#f0f0f0' };
    if (now.isBefore(from)) return { label: 'Sắp áp dụng', color: '#fa8c16', bg: '#fff7e6' };
    return { label: 'Đang áp dụng', color: '#52c41a', bg: '#f6ffed' };
  };

  const renderProfile = ({ item }) => {
    const status = getStatusInfo(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.salaryRow}>
            <MaterialCommunityIcons name="cash" size={24} color="#52c41a" />
            <Text style={styles.salaryAmount}>
              {item.baseSalary
                ? `${Number(item.baseSalary).toLocaleString('vi-VN')} VNĐ`
                : 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-range" size={15} color="#8c8c8c" />
          <Text style={styles.dateText}>
            Từ {item.effectiveFrom ? dayjs(item.effectiveFrom).format('DD/MM/YYYY') : 'N/A'}
            {item.effectiveTo
              ? ` → ${dayjs(item.effectiveTo).format('DD/MM/YYYY')}`
              : ' (không hạn)'}
          </Text>
        </View>

        {item.allowances && item.allowances.length > 0 && (
          <View style={styles.allowancesSection}>
            <Text style={styles.allowancesTitle}>Phụ cấp:</Text>
            <View style={styles.allowancesRow}>
              {item.allowances.map((a, idx) => (
                <View key={idx} style={styles.allowanceChip}>
                  <Text style={styles.allowanceChipText}>
                    {a.name || a.allowanceType?.name || 'Phụ cấp'}:{' '}
                    {Number(a.amount).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý lương</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color="#1890ff" />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          renderItem={renderProfile}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <MaterialCommunityIcons name="cash-remove" size={60} color="#d9d9d9" />
              <Text style={styles.emptyText}>Chưa có profile lương nào</Text>
              <Text style={styles.emptySubText}>Nhấn nút "+" để tạo profile mới</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={openCreateModal}
      />

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo profile lương mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#262626" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Base salary */}
              <Text style={styles.fieldLabel}>Lương cơ bản (VNĐ) <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons name="cash" size={18} color="#52c41a" />
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: 15000000"
                  value={baseSalary}
                  onChangeText={setBaseSalary}
                  keyboardType="numeric"
                />
              </View>

              {/* Effective from */}
              <Text style={styles.fieldLabel}>Ngày hiệu lực <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.dateField}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={18} color="#1890ff" />
                <Text style={styles.dateFieldText}>
                  {dayjs(effectiveFrom).format('DD/MM/YYYY')}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={effectiveFrom}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setEffectiveFrom(selectedDate);
                  }}
                />
              )}

              {/* Allowances */}
              {allowanceTypes.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Phụ cấp</Text>
                  {allowanceTypes.map((at) => {
                    const selected = selectedAllowances.find((a) => a.id === at.id);
                    return (
                      <View key={at.id} style={styles.allowanceItemModal}>
                        <TouchableOpacity
                          style={styles.allowanceCheckRowModal}
                          onPress={() => toggleAllowance(at)}
                        >
                          <MaterialCommunityIcons
                            name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={22}
                            color={selected ? '#1890ff' : '#d9d9d9'}
                          />
                          <Text style={styles.allowanceNameModal}>{at.name}</Text>
                        </TouchableOpacity>
                        {selected && (
                          <View style={styles.amountInputRow}>
                            <TextInput
                              style={styles.amountInput}
                              placeholder="Số tiền..."
                              value={selected.amount}
                              onChangeText={(val) => updateAllowanceAmount(at.id, val)}
                              keyboardType="numeric"
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Tạo mới</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centerView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  salaryAmount: { fontSize: 18, fontWeight: '700', color: '#262626' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dateText: { fontSize: 13, color: '#595959' },
  allowancesSection: { marginTop: 8 },
  allowancesTitle: { fontSize: 13, color: '#595959', fontWeight: '500', marginBottom: 6 },
  allowancesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allowanceChip: { backgroundColor: '#f0f5ff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  allowanceChipText: { fontSize: 12, color: '#1890ff' },
  emptyView: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#8c8c8c' },
  emptySubText: { fontSize: 12, color: '#bfbfbf' },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#1890ff' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#595959', marginBottom: 6, marginTop: 12 },
  required: { color: '#ff4d4f' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  textInput: { flex: 1, fontSize: 14, color: '#262626' },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  dateFieldText: { fontSize: 14, color: '#262626' },
  allowanceItemModal: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 8,
    marginBottom: 8,
  },
  allowanceCheckRowModal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  allowanceNameModal: { fontSize: 14, color: '#262626', flex: 1 },
  amountInputRow: { paddingLeft: 32, marginTop: 6 },
  amountInput: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    color: '#262626',
    backgroundColor: '#fafafa',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  cancelBtnText: { fontSize: 15, color: '#595959', fontWeight: '500' },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#1890ff' },
  saveBtnDisabled: { backgroundColor: '#91caff' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});

export default EditSalaryScreen;

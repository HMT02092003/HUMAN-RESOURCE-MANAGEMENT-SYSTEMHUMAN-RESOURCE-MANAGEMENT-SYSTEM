import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
  TextInput as RNTextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Portal, Dialog, Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { ContractTypeService } from '../../services/ContractTypeService';
import SalaryService from '../../services/SalaryService';
import api from '../../services/apiService';

const CreateContractScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};

  const [contractTypes, setContractTypes] = useState([]);
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form
  const [selectedContractType, setSelectedContractType] = useState(null);
  const [activeDay, setActiveDay] = useState(new Date());
  const [salary, setSalary] = useState('');

  const [showActivePicker, setShowActivePicker] = useState(false);
  const [selectedAllowances, setSelectedAllowances] = useState([]); // [{id, name}]
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [contractTypeModalVisible, setContractTypeModalVisible] = useState(false);

  useEffect(() => {
    loadMeta();
  }, []);

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const [ctRes, atRes] = await Promise.all([
        ContractTypeService.getAllContractTypes({ page: 1, pageSize: 100 }),
        SalaryService.getAllAllowanceTypes(),
      ]);
      const ctData = ctRes?.data ?? ctRes ?? [];
      const atData = atRes?.data ?? atRes ?? [];
      setContractTypes(Array.isArray(ctData) ? ctData : []);
      setAllowanceTypes(Array.isArray(atData) ? atData : []);
    } catch (error) {
      console.error('Error loading meta:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoadingMeta(false);
    }
  };

  const getEndDate = () => {
    if (!selectedContractType?.contractTerm) return null;
    return dayjs(activeDay).add(selectedContractType.contractTerm, 'month').toDate();
  };

  const toggleAllowance = (allowanceType) => {
    setSelectedAllowances((prev) => {
      const exists = prev.find((a) => a.id === allowanceType.id);
      if (exists) {
        return prev.filter((a) => a.id !== allowanceType.id);
      } else {
        return [...prev, { id: allowanceType.id, name: allowanceType.name }];
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedContractType) {
      Alert.alert('Thông báo', 'Vui lòng chọn loại hợp đồng');
      return;
    }

    const endDate = getEndDate();
    const payload = {
      userId,
      contractTypeId: selectedContractType.id,
      activeDay: dayjs(activeDay).format('YYYY-MM-DD'),
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
      salary: salary ? Number(salary) : 0,
      allowances: selectedAllowances.map((a) => ({
        allowanceTypeId: a.id,
        amount: 0,
      })),
    };

    setSubmitting(true);
    try {
      await api.post(`/employee/users/${userId}/contracts`, payload);
      Alert.alert('Thành công', 'Tạo hợp đồng thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const msg =
        error?.response?.data?.message || error?.message || 'Tạo hợp đồng thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const endDate = getEndDate();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo hợp đồng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Contract Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loại hợp đồng <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setContractTypeModalVisible(true)}
          >
            <Text style={selectedContractType ? styles.selectValue : styles.selectPlaceholder}>
              {selectedContractType ? selectedContractType.name : 'Chọn loại hợp đồng...'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#8c8c8c" />
          </TouchableOpacity>

          {selectedContractType && (
            <View style={styles.contractInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời hạn:</Text>
                <Text style={styles.infoValue}>
                  {selectedContractType.contractTerm
                    ? `${selectedContractType.contractTerm} tháng`
                    : 'Không xác định'}
                </Text>
              </View>
              {selectedContractType.insurance !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Bảo hiểm:</Text>
                  <Text style={styles.infoValue}>
                    {selectedContractType.insurance ? 'Có' : 'Không'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Active date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngày hiệu lực <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => setShowActivePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color="#1890ff" />
            <Text style={styles.dateFieldText}>
              {dayjs(activeDay).format('DD/MM/YYYY')}
            </Text>
          </TouchableOpacity>
          {showActivePicker && (
            <DateTimePicker
              value={activeDay}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowActivePicker(Platform.OS === 'ios');
                if (selectedDate) setActiveDay(selectedDate);
              }}
            />
          )}

          {endDate && (
            <View style={styles.autoCalcInfo}>
              <MaterialCommunityIcons name="information" size={16} color="#fa8c16" />
              <Text style={styles.autoCalcText}>
                Ngày kết thúc (tự tính): {dayjs(endDate).format('DD/MM/YYYY')}
              </Text>
            </View>
          )}
        </View>

        {/* Salary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lương cơ bản <Text style={styles.required}>*</Text></Text>
          <View style={styles.selectField}>
            <MaterialCommunityIcons name="currency-usd" size={20} color="#1890ff" />
            <RNTextInput
              style={{ flex: 1, fontSize: 14, color: '#262626', marginLeft: 8, padding: 0 }}
              placeholder="Nhập lương cơ bản (VNĐ)..."
              placeholderTextColor="#bfbfbf"
              value={salary}
              onChangeText={setSalary}
              keyboardType="numeric"
            />
          </View>
          {salary ? (
            <View style={styles.autoCalcInfo}>
              <MaterialCommunityIcons name="information" size={16} color="#1890ff" />
              <Text style={[styles.autoCalcText, { color: '#1890ff' }]}>
                {Number(salary).toLocaleString('vi-VN')} VNĐ
              </Text>
            </View>
          ) : null}
        </View>

        {/* Allowances */}
        {allowanceTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phụ cấp</Text>
            <Text style={styles.sectionSubtitle}>Chọn các loại phụ cấp áp dụng</Text>
            {allowanceTypes.map((at) => {
              const selected = selectedAllowances.find((a) => a.id === at.id);
              return (
                <View key={at.id} style={styles.allowanceItem}>
                  <TouchableOpacity
                    style={styles.allowanceCheckRow}
                    onPress={() => toggleAllowance(at)}
                  >
                    <MaterialCommunityIcons
                      name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={selected ? '#1890ff' : '#d9d9d9'}
                    />
                    <Text style={styles.allowanceName}>{at.name}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>



      {/* Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-plus" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Tạo hợp đồng</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Contract Type Modal */}
      <Modal
        visible={contractTypeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setContractTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn loại hợp đồng</Text>
              <TouchableOpacity onPress={() => setContractTypeModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#262626" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={contractTypes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedContractType?.id === item.id && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedContractType(item);
                    setContractTypeModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedContractType?.id === item.id && styles.optionTextSelected,
                  ]}>
                    {item.name}
                  </Text>
                  {selectedContractType?.id === item.id && (
                    <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyOption}>Không có loại hợp đồng nào</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: '#8c8c8c' },
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
  body: { flex: 1, padding: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#262626', marginBottom: 10 },
  sectionSubtitle: { fontSize: 12, color: '#8c8c8c', marginBottom: 10, marginTop: -6 },
  required: { color: '#ff4d4f' },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  selectValue: { fontSize: 14, color: '#262626', flex: 1 },
  selectPlaceholder: { fontSize: 14, color: '#bfbfbf', flex: 1 },
  contractInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    gap: 6,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#595959' },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#262626' },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  dateFieldText: { fontSize: 14, color: '#262626' },
  autoCalcInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff7e6',
    borderRadius: 6,
  },
  autoCalcText: { fontSize: 13, color: '#fa8c16' },
  allowanceItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 10,
    marginBottom: 10,
  },
  allowanceCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  allowanceName: { fontSize: 14, color: '#262626', flex: 1 },
  allowanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingLeft: 32,
  },
  allowanceAmountLabel: { fontSize: 13, color: '#595959' },
  allowanceAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 6,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  amountText: { fontSize: 13, color: '#262626', flex: 1 },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1890ff',
    borderRadius: 12,
    padding: 16,
  },
  submitBtnDisabled: { backgroundColor: '#91caff' },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  optionItemSelected: { backgroundColor: '#e6f4ff' },
  optionText: { fontSize: 15, color: '#262626' },
  optionTextSelected: { color: '#1890ff', fontWeight: '600' },
  emptyOption: { textAlign: 'center', padding: 24, color: '#8c8c8c', fontSize: 14 },
});

export default CreateContractScreen;

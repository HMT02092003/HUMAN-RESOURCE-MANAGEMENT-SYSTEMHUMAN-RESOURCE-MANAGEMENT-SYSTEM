import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import ApplicationService from '../../services/ApplicationService';

const SHIFTS = [
  { value: 'morning', label: 'Ca sáng', icon: 'weather-sunny', color: '#fa8c16' },
  { value: 'afternoon', label: 'Ca chiều', icon: 'weather-partly-cloudy', color: '#1890ff' },
  { value: 'night', label: 'Ca tối', icon: 'weather-night', color: '#722ed1' },
  { value: 'overtime', label: 'Tăng ca', icon: 'clock-fast', color: '#f5222d' },
];

const ShiftApplicationScreen = ({ navigation }) => {
  const [rows, setRows] = useState([
    { id: Date.now(), date: new Date(), shifts: [], note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [activePickerRowId, setActivePickerRowId] = useState(null);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: Date.now(), date: new Date(), shifts: [], note: '' },
    ]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) {
      Alert.alert('Thông báo', 'Cần ít nhất 1 ngày đăng ký');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const toggleShift = (rowId, shiftValue) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const already = r.shifts.includes(shiftValue);
        const shifts = already
          ? r.shifts.filter((s) => s !== shiftValue)
          : [...r.shifts, shiftValue];
        return { ...r, shifts };
      })
    );
  };

  const handleDateChange = (rowId, event, selectedDate) => {
    if (Platform.OS === 'android') {
      setActivePickerRowId(null);
    }
    if (selectedDate) {
      updateRow(rowId, 'date', selectedDate);
    }
  };

  const handleSubmit = async () => {
    for (const row of rows) {
      if (row.shifts.length === 0) {
        Alert.alert('Thông báo', `Vui lòng chọn ít nhất 1 ca cho ngày ${dayjs(row.date).format('DD/MM/YYYY')}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const requestedDates = rows.map((r) => ({
        date: dayjs(r.date).format('YYYY-MM-DD'),
        shifts: r.shifts,
        note: r.note.trim(),
      }));

      const payload = {
        type: 'shift-registration',
        data: { requestedDates },
      };

      await ApplicationService.createApplication(payload);
      Alert.alert('Thành công', 'Đăng ký ca làm việc thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Đăng ký thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = ({ item }) => (
    <View style={styles.rowCard}>
      {/* Row header */}
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>
          Ngày: {dayjs(item.date).format('DD/MM/YYYY')}
        </Text>
        <TouchableOpacity onPress={() => removeRow(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
        </TouchableOpacity>
      </View>

      {/* Date picker trigger */}
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setActivePickerRowId(item.id)}
      >
        <Ionicons name="calendar-outline" size={18} color="#1890ff" />
        <Text style={styles.dateBtnText}>
          {dayjs(item.date).format('dddd, DD/MM/YYYY')}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#999" />
      </TouchableOpacity>

      {activePickerRowId === item.id && (
        <DateTimePicker
          value={item.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selectedDate) =>
            handleDateChange(item.id, event, selectedDate)
          }
        />
      )}

      {/* Shift selector */}
      <Text style={styles.shiftLabel}>Chọn ca làm việc:</Text>
      <View style={styles.shiftRow}>
        {SHIFTS.map((shift) => {
          const selected = item.shifts.includes(shift.value);
          return (
            <TouchableOpacity
              key={shift.value}
              style={[
                styles.shiftChip,
                selected && { backgroundColor: shift.color, borderColor: shift.color },
              ]}
              onPress={() => toggleShift(item.id, shift.value)}
            >
              <MaterialCommunityIcons
                name={shift.icon}
                size={16}
                color={selected ? '#fff' : shift.color}
              />
              <Text
                style={[
                  styles.shiftChipText,
                  selected && { color: '#fff' },
                ]}
              >
                {shift.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Note */}
      <TextInput
        style={styles.noteInput}
        placeholder="Ghi chú (tùy chọn)..."
        value={item.note}
        onChangeText={(text) => updateRow(item.id, 'note', text)}
        multiline
        numberOfLines={2}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký ca làm việc</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.subtitle}>
            Đăng ký ca làm việc cho nhiều ngày. Nhấn "+" để thêm ngày.
          </Text>
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 100 }}>
            <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
              <Ionicons name="add-circle-outline" size={22} color="#1890ff" />
              <Text style={styles.addRowText}>Thêm ngày</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Gửi đăng ký</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
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
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  placeholder: { width: 32 },
  subtitle: {
    fontSize: 13,
    color: '#8c8c8c',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  rowCard: {
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
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  dateBtnText: {
    flex: 1,
    fontSize: 14,
    color: '#262626',
  },
  shiftLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#595959',
    marginBottom: 8,
  },
  shiftRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  shiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#d9d9d9',
    backgroundColor: '#fff',
  },
  shiftChipText: {
    fontSize: 13,
    color: '#595959',
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#262626',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e6f4ff',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#91caff',
    borderStyle: 'dashed',
  },
  addRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  submitBtnDisabled: {
    backgroundColor: '#91caff',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ShiftApplicationScreen;

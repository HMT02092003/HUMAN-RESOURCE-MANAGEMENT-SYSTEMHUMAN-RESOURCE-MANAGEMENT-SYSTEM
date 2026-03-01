import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput, Modal, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Card, Avatar, Text, IconButton, useTheme, Menu, FAB, Portal, Dialog, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import ShiftService from '../../services/ShiftService';

const ShiftConfigurationScreen = ({ navigation }) => {
  const theme = useTheme();
  const listRef = React.useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({ name: '', start_time: new Date(), end_time: new Date(), working_unit: '1.0', description: '' });
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibleMenuId, setVisibleMenuId] = useState(null);

  const fetchConfigurations = async (params) => {
    try {
      console.log('📋 [ShiftConfig] Fetching with params:', params);
      const response = await ShiftService.getAllShiftConfigurations();
      const data = response?.data || [];
      return { results: Array.isArray(data) ? data : [], total: data.length };
    } catch (error) {
      console.error('❌ [ShiftConfig] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách cấu hình ca');
      return { results: [], total: 0 };
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    if (typeof timeString === 'string') return timeString.substring(0, 5);
    const hours = timeString.getHours().toString().padStart(2, '0');
    const minutes = timeString.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeForAPI = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  const parseTimeString = (timeStr) => {
    if (!timeStr) return new Date();
    const parts = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(parts[0]) || 0);
    date.setMinutes(parseInt(parts[1]) || 0);
    date.setSeconds(0);
    return date;
  };

  const handleOpenModal = async (config = null) => {
    if (config) {
      try {
        const response = await ShiftService.getShiftConfigurationById(config.id);
        const cfg = response?.data || config;
        setEditingConfig(cfg);
        setFormData({ name: cfg.name || '', start_time: parseTimeString(cfg.start_time), end_time: parseTimeString(cfg.end_time), working_unit: cfg.working_unit?.toString() || '1.0', description: cfg.description || '' });
      } catch (error) {
        console.error('Error loading config:', error);
        setEditingConfig(config);
        setFormData({ name: config.name || '', start_time: parseTimeString(config.start_time), end_time: parseTimeString(config.end_time), working_unit: config.working_unit?.toString() || '1.0', description: config.description || '' });
      }
    } else {
      setEditingConfig(null);
      setFormData({ name: '', start_time: new Date(), end_time: new Date(), working_unit: '1.0', description: '' });
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên ca'); return; }
    try {
      setSaving(true);
      const data = { name: formData.name.trim(), start_time: formatTimeForAPI(formData.start_time), end_time: formatTimeForAPI(formData.end_time), working_unit: parseFloat(formData.working_unit) || 1.0, description: formData.description.trim() };
      if (editingConfig) {
        await ShiftService.updateShiftConfiguration(editingConfig.id, data);
        Alert.alert('Thành công', 'Đã cập nhật cấu hình ca');
      } else {
        await ShiftService.createShiftConfiguration(data);
        Alert.alert('Thành công', 'Đã tạo cấu hình ca mới');
      }
      setModalVisible(false);
      if (listRef.current?.refresh) listRef.current.refresh();
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu cấu hình ca');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => { setDeleteTarget(item); setDeleteDialogVisible(true); };

  const confirmDelete = async () => {
    setDeleteDialogVisible(false);
    if (!deleteTarget) return;
    try {
      await ShiftService.deleteShiftConfiguration(deleteTarget.id);
      Alert.alert('Thành công', 'Đã xóa cấu hình ca');
      if (listRef.current?.refresh) listRef.current.refresh();
    } catch (error) {
      console.error('Error deleting config:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa cấu hình ca');
    } finally { setDeleteTarget(null); }
  };

  const renderCard = (item) => (
    <Card style={styles.card} mode="elevated" elevation={2} onPress={() => handleOpenModal(item)}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={styles.iconWrapper}>
            <Avatar.Icon size={56} icon="clock-outline" style={{ backgroundColor: '#1890ff' }} />
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.shiftName}>{item.name}</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-start" size={14} color="#8c8c8c" />
              <Text style={styles.infoText}>{formatTime(item.start_time)} - {formatTime(item.end_time)}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="counter" size={14} color="#52c41a" />
              <Text style={styles.infoText}>Hệ số: {item.working_unit || '1.0'}</Text>
            </View>
            {item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
          </View>
          <View style={styles.actionsColumn}>
            <Menu
              visible={visibleMenuId === item.id}
              onDismiss={() => setVisibleMenuId(null)}
              contentStyle={styles.menuContent}
              anchor={
                <IconButton icon="dots-vertical" size={24} iconColor="#595959" onPress={() => setVisibleMenuId(item.id)} />
              }
            >
              <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleOpenModal(item); }}>
                <MaterialCommunityIcons name="pencil" size={18} color="#1890ff" />
                <Text style={styles.menuItemText}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleDelete(item); }}>
                <MaterialCommunityIcons name="delete" size={18} color="#ff4d4f" />
                <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Xóa</Text>
              </TouchableOpacity>
            </Menu>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderModal = () => (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingConfig ? 'Sửa cấu hình ca' : 'Tạo cấu hình ca'}</Text>
            <IconButton icon="close" size={24} onPress={() => setModalVisible(false)} />
          </View>
          <Divider />
          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên ca <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Nhập tên ca..." value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Giờ bắt đầu <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.timeBox} onPress={() => setShowStartTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color="#1890ff" />
                <Text style={styles.timeBoxText}>{formatTime(formData.start_time)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Giờ kết thúc <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.timeBox} onPress={() => setShowEndTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color="#1890ff" />
                <Text style={styles.timeBoxText}>{formatTime(formData.end_time)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hệ số công</Text>
              <TextInput style={styles.input} placeholder="1.0" value={formData.working_unit} onChangeText={(text) => setFormData({ ...formData, working_unit: text })} keyboardType="decimal-pad" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput style={styles.textArea} placeholder="Nhập mô tả..." value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>Hủy</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, saving && styles.disabledButton]} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name={editingConfig ? "checkmark" : "add"} size={18} color="#fff" /><Text style={styles.submitButtonText}>{editingConfig ? 'Cập nhật' : 'Tạo'}</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {showStartTimePicker && <DateTimePicker value={formData.start_time} mode="time" display="spinner" onChange={(e, date) => { setShowStartTimePicker(false); if (date) setFormData({ ...formData, start_time: date }); }} />}
      {showEndTimePicker && <DateTimePicker value={formData.end_time} mode="time" display="spinner" onChange={(e, date) => { setShowEndTimePicker(false); if (date) setFormData({ ...formData, end_time: date }); }} />}
    </Modal>
  );

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll ref={listRef} fetchData={fetchConfigurations} renderCard={renderCard} searchPlaceholder="Tìm cấu hình ca..." onItemPress={handleOpenModal} pageSize={20} emptyMessage="Chưa có cấu hình ca nào" keyExtractor={(item) => item.id?.toString()} filters={[{ key: 'name', label: 'Tên ca' }, { key: 'description', label: 'Mô tả' }]} />
      <FAB icon="plus" style={styles.fab} onPress={() => handleOpenModal(null)} color="#fff" label="Tạo ca" />
      {renderModal()}
      <Portal><Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}><Dialog.Title>Xác nhận xóa</Dialog.Title><Dialog.Content><Text>Bạn có chắc chắn muốn xóa cấu hình ca này?</Text></Dialog.Content><Dialog.Actions><Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button><Button onPress={confirmDelete} textColor="#ff4d4f">Xóa</Button></Dialog.Actions></Dialog></Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  cardContent: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrapper: { marginRight: 12 },
  infoSection: { flex: 1 },
  shiftName: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoText: { fontSize: 13, color: '#595959', marginLeft: 6 },
  description: { fontSize: 12, color: '#8c8c8c', marginTop: 6 },
  actionsColumn: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#1890ff', borderRadius: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#262626', marginBottom: 8 },
  required: { color: '#ff4d4f' },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  timeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12 },
  timeBoxText: { marginLeft: 10, fontSize: 15, color: '#262626' },
  textArea: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80 },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#595959' },
  submitButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: '#1890ff' },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 },
  actionsColumn: { marginLeft: 8 },
  menuContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 160
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  menuItemText: { fontSize: 14, color: '#262626' },
});

export default ShiftConfigurationScreen;

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
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
  Badge,
  Portal,
  Dialog,
  Button,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import ShiftService, {
  getShiftStatusLabel,
  getShiftStatusColor
} from '../../services/ShiftService';

const ShiftRegistrationScreen = ({ navigation }) => {
  const theme = useTheme();
  const listRef = React.useRef(null);

  // Create modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [configurations, setConfigurations] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  // Delete dialog
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibleMenuId, setVisibleMenuId] = useState(null);

  // Load configurations on mount
  React.useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const response = await ShiftService.getAllShiftConfigurations();
      const data = response?.data || [];
      setConfigurations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };

  // Fetch data for CardListWithInfiniteScroll
  const fetchRegistrations = async (params) => {
    try {
      // Convert pageSize to limit for backend compatibility
      const apiParams = { ...params };
      if (apiParams.pageSize) {
        apiParams.limit = apiParams.pageSize;
        delete apiParams.pageSize;
      }
      console.log('📋 [ShiftRegistrations] Fetching with params:', apiParams);
      const response = await ShiftService.getMyShiftRegistrations(apiParams);

      return {
        results: response.data || [],
        total: (response.pagination && response.pagination.total) || response.total || 0
      };
    } catch (error) {
      console.error('❌ [ShiftRegistrations] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đăng ký ca');
      return { results: [], total: 0 };
    }
  };

  // Format helpers
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    if (typeof timeString === 'string') {
      return timeString.substring(0, 5);
    }
    const hours = timeString.getHours().toString().padStart(2, '0');
    const minutes = timeString.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Create registration
  const handleCreateRegistration = async () => {
    if (!selectedShift) {
      Alert.alert('Lỗi', 'Vui lòng chọn ca làm việc');
      return;
    }

    try {
      setCreating(true);
      await ShiftService.createShiftRegistration({
        shift_id: selectedShift.id,
        date: dayjs(selectedDate).format('YYYY-MM-DD'),
        notes: notes.trim()
      });

      Alert.alert('Thành công', 'Đã đăng ký ca làm việc');
      setCreateModalVisible(false);
      resetForm();
      
      // Refresh list
      if (listRef.current?.refresh) {
        listRef.current.refresh();
      }
    } catch (error) {
      console.error('Error creating registration:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đăng ký ca');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedShift(null);
    setSelectedDate(new Date());
    setNotes('');
  };

  // View detail
  const handleViewDetail = async (item) => {
    try {
      const response = await ShiftService.getShiftRegistrationById(item.id);
      setSelectedRegistration(response?.data || item);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Error fetching detail:', error);
      setSelectedRegistration(item);
      setDetailModalVisible(true);
    }
  };

  // Delete registration
  const handleDelete = (item) => {
    if (item.status !== 'pending') {
      Alert.alert('Thông báo', 'Chỉ có thể xóa đăng ký đang chờ duyệt');
      return;
    }
    setDeleteTarget(item);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    setDeleteDialogVisible(false);
    if (!deleteTarget) return;

    try {
      await ShiftService.cancelShiftRegistration(deleteTarget.id);
      Alert.alert('Thành công', 'Đã hủy đăng ký ca');
      
      // Refresh list
      if (listRef.current?.refresh) {
        listRef.current.refresh();
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể hủy đăng ký');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  // Render card
  const renderCard = (item) => {
    const statusColor = getShiftStatusColor(item.status);
    const isPending = item.status === 'pending';

    return (
      <Card style={styles.card} mode="elevated" elevation={2}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.topRow}>
            <View style={[styles.iconWrapper, { backgroundColor: statusColor + '20' }]}>
              <Avatar.Icon
                size={56}
                icon="calendar"
                style={{ backgroundColor: statusColor }}
              />
            </View>

            <View style={styles.infoSection}>
              <View style={styles.titleRow}>
                <Text style={styles.shiftName} numberOfLines={1}>
                  {item.shift_name || 'Ca làm việc'}
                </Text>
                <Badge
                  size={14}
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor }
                  ]}
                />
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#8c8c8c" />
                <Text style={styles.infoText}>
                  {formatTime(item.start_time)} - {formatTime(item.end_time)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={14} color="#1890ff" />
                <Text style={[styles.infoText, { color: '#1890ff' }]}>
                  {formatDate(item.date)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={item.status === 'approved' ? 'check-circle' : item.status === 'rejected' ? 'close-circle' : 'clock'} 
                  size={14} 
                  color={statusColor} 
                />
                <Text style={[styles.infoText, { color: statusColor }]}>
                  {getShiftStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.actionsColumn}>
              <Menu
                visible={visibleMenuId === item.id}
                onDismiss={() => setVisibleMenuId(null)}
                contentStyle={styles.menuContent}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    iconColor="#595959"
                    onPress={() => setVisibleMenuId(item.id)}
                  />
                }
              >
                <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleViewDetail(item); }}>
                  <MaterialCommunityIcons name="eye" size={18} color="#595959" />
                  <Text style={styles.menuItemText}>Xem chi tiết</Text>
                </TouchableOpacity>
                {isPending && (
                  <>
                    <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); setSelectedShift({ id: item.shift_id, name: item.shift_name }); setSelectedDate(item.date ? new Date(item.date) : new Date()); setNotes(item.notes || ''); setCreateModalVisible(true); }}>
                      <MaterialCommunityIcons name="pencil" size={18} color="#1890ff" />
                      <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleDelete(item); }}>
                      <MaterialCommunityIcons name="delete" size={18} color="#ff4d4f" />
                      <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Hủy đăng ký</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Menu>
            </View>
          </View>

          {item.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.notesLabel}>Ghi chú:</Text>
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const handleItemPress = (item) => {
    handleViewDetail(item);
  };

  // Render create modal
  const renderCreateModal = () => (
    <Modal
      visible={createModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCreateModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đăng ký ca làm việc</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setCreateModalVisible(false)}
            />
          </View>
          <Divider />

          <ScrollView style={styles.modalBody}>
            {/* Chọn ca */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Chọn ca <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setShowShiftPicker(true)}
              >
                <Text style={[styles.selectText, !selectedShift && styles.placeholder]}>
                  {selectedShift ? selectedShift.name : 'Chọn ca làm việc...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#8c8c8c" />
              </TouchableOpacity>
              {selectedShift && (
                <Text style={styles.shiftTime}>
                  Thời gian: {formatTime(selectedShift.start_time)} - {formatTime(selectedShift.end_time)}
                </Text>
              )}
            </View>

            {/* Chọn ngày */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày đăng ký <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#1890ff" />
                <Text style={styles.dateBoxText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* Ghi chú */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Nhập ghi chú (không bắt buộc)..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCreateModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, creating && styles.disabledButton]}
              onPress={handleCreateRegistration}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Đăng ký</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Shift Picker Modal */}
      <Modal visible={showShiftPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn ca làm việc</Text>
              <TouchableOpacity onPress={() => setShowShiftPicker(false)}>
                <Ionicons name="close" size={24} color="#262626" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {configurations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.pickerItem,
                    selectedShift?.id === item.id && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedShift(item);
                    setShowShiftPicker(false);
                  }}
                >
                  <View>
                    <Text style={[
                      styles.pickerItemText,
                      selectedShift?.id === item.id && styles.pickerItemTextSelected
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={styles.pickerItemSubtext}>
                      {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </Text>
                  </View>
                  {selectedShift?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#1890ff" />
                  )}
                </TouchableOpacity>
              ))}
              {configurations.length === 0 && (
                <Text style={styles.emptyPickerText}>Không có ca làm việc</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </Modal>
  );

  // Render detail modal
  const renderDetailModal = () => {
    const reg = selectedRegistration;
    if (!reg) return null;

    const statusColor = getShiftStatusColor(reg.status);

    return (
      <Portal>
        <Dialog visible={detailModalVisible} onDismiss={() => setDetailModalVisible(false)}>
          <Dialog.Title>Chi tiết đăng ký ca</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <View style={styles.detailStatusRow}>
                <Chip
                  mode="flat"
                  style={[styles.detailStatusChip, { backgroundColor: statusColor }]}
                  textStyle={{ color: '#fff' }}
                >
                  {getShiftStatusLabel(reg.status)}
                </Chip>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tên ca</Text>
                <Text style={styles.detailValue}>{reg.shift_name || '-'}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Thời gian</Text>
                <Text style={styles.detailValue}>
                  {formatTime(reg.start_time)} - {formatTime(reg.end_time)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ngày đăng ký</Text>
                <Text style={styles.detailValue}>{formatDate(reg.date)}</Text>
              </View>

              {reg.working_unit && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Hệ số công</Text>
                  <Text style={styles.detailValue}>{reg.working_unit}</Text>
                </View>
              )}

              {reg.notes && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ghi chú</Text>
                  <Text style={styles.detailValue}>{reg.notes}</Text>
                </View>
              )}

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ngày tạo</Text>
                <Text style={styles.detailValue}>
                  {dayjs(reg.created_at).format('DD/MM/YYYY HH:mm')}
                </Text>
              </View>

              {reg.status !== 'pending' && reg.approved_at && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    {reg.status === 'approved' ? 'Ngày duyệt' : 'Ngày từ chối'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {dayjs(reg.approved_at).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetailModalVisible(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        ref={listRef}
        fetchData={fetchRegistrations}
        renderCard={renderCard}
        searchPlaceholder="Tìm ca làm việc..."
        onItemPress={handleItemPress}
        pageSize={10}
        emptyMessage="Chưa có đăng ký ca nào"
        keyExtractor={(item) => item.id?.toString()}
        filters={[
          { 
            key: 'status', 
            label: 'Trạng thái',
            options: [
              { value: 'pending', label: 'Chờ duyệt' },
              { value: 'approved', label: 'Đã duyệt' },
              { value: 'rejected', label: 'Từ chối' },
            ]
          },
          { key: 'shift_name', label: 'Tên ca' },
          { key: 'notes', label: 'Ghi chú' }
        ]}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setCreateModalVisible(true)}
        color="#fff"
        label="Đăng ký ca"
      />

      {renderCreateModal()}
      {renderDetailModal()}

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Xác nhận hủy</Dialog.Title>
          <Dialog.Content>
            <Text>Bạn có chắc chắn muốn hủy đăng ký ca này?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Không</Button>
            <Button onPress={confirmDelete} textColor="#ff4d4f">Hủy đăng ký</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginRight: 12,
    borderRadius: 10
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    flex: 1
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
  notesRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c8c8c',
    marginBottom: 4
  },
  notesText: {
    fontSize: 13,
    color: '#595959'
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
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
  menuIcon: {
    marginRight: 12
  },
  menuItemText: {
    fontSize: 14,
    color: '#262626'
  },
  threeDotWrapper: {
    position: 'absolute',
    right: 8,
    top: 8
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626'
  },
  modalBody: {
    padding: 16
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8
  },
  required: {
    color: '#ff4d4f'
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  selectText: {
    fontSize: 15,
    color: '#262626'
  },
  placeholder: {
    color: '#bfbfbf'
  },
  shiftTime: {
    marginTop: 6,
    fontSize: 13,
    color: '#1890ff'
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  dateBoxText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#262626'
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#595959'
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1890ff'
  },
  disabledButton: {
    opacity: 0.7
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 20
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626'
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  pickerItemSelected: {
    backgroundColor: '#e6f7ff'
  },
  pickerItemText: {
    fontSize: 15,
    color: '#262626'
  },
  pickerItemTextSelected: {
    color: '#1890ff',
    fontWeight: '600'
  },
  pickerItemSubtext: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2
  },
  emptyPickerText: {
    textAlign: 'center',
    padding: 20,
    color: '#8c8c8c'
  },
  detailStatusRow: {
    alignItems: 'center',
    marginBottom: 16
  },
  detailStatusChip: {
    paddingHorizontal: 16
  },
  detailItem: {
    marginBottom: 16
  },
  detailLabel: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 4
  },
  detailValue: {
    fontSize: 15,
    color: '#262626'
  }
});

export default ShiftRegistrationScreen;

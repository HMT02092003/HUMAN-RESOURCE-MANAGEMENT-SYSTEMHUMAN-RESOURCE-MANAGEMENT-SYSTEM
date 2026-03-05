import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Avatar, Text, IconButton, useTheme, Menu, FAB, Portal, Dialog, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import CardListWithInfiniteScroll from '../../components/CardListWithInfiniteScroll';
import ShiftService, { getShiftStatusLabel, getShiftStatusColor } from '../../services/ShiftService';

const ShiftApprovalScreen = ({ navigation }) => {
  const theme = useTheme();
  const listRef = React.useRef(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [visibleMenuId, setVisibleMenuId] = useState(null);

  const fetchSchedules = async (params) => {
    try {
      // Convert pageSize to limit for backend compatibility
      const apiParams = { ...params };
      if (apiParams.pageSize) {
        apiParams.limit = apiParams.pageSize;
        delete apiParams.pageSize;
      }
      console.log('📋 [ShiftApproval] Fetching with params:', apiParams);
      const response = await ShiftService.getSchedulesForApproval(apiParams);
      console.log('📋 [ShiftApproval] Raw response:', response);

      // Support multiple response shapes from different service wrappers:
      // - response = { success, data: [...], pagination }
      // - response = { results: [...], total }
      // - response = [...] (array)
      let items = [];
      let total = 0;

      if (Array.isArray(response)) {
        items = response;
        total = items.length;
      } else if (response) {
        items = Array.isArray(response.data) ? response.data : (Array.isArray(response.results) ? response.results : []);
        total = response.pagination?.total ?? response.total ?? items.length;
      }

      const mappedData = items.map(item => ({
        ...item,
        user_fullname: item.user_fullname || item.user_fullName || item.username || 'N/A'
      }));

      return { results: mappedData, total };
    } catch (error) {
      console.error(' [ShiftApproval] Error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn đăng ký ca');
      return { results: [], total: 0 };
    }
  };

  const formatDate = (dateString) => !dateString ? '-' : dayjs(dateString).format('DD/MM/YYYY');
  const formatTime = (timeString) => !timeString ? '-' : typeof timeString === 'string' ? timeString.substring(0, 5) : `${timeString.getHours().toString().padStart(2, '0')}:${timeString.getMinutes().toString().padStart(2, '0')}`;

  const handleApprove = (item) => {
    if (item.status !== 'pending') { Alert.alert('Thông báo', 'Đơn này đã được xử lý'); return; }
    Alert.alert('Xác nhận', 'Duyệt đơn đăng ký ca này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Duyệt', onPress: async () => {
        try {
          setProcessing(true);
          await ShiftService.approveShiftRegistration(item.id);
          Alert.alert('Thành công', 'Đã duyệt đơn đăng ký ca');
          if (listRef.current?.refresh) listRef.current.refresh();
        } catch (error) {
          console.error('Error approving:', error);
          Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt đơn');
        } finally { setProcessing(false); }
      }}
    ]);
  };

  const handleReject = (item) => {
    if (item.status !== 'pending') { Alert.alert('Thông báo', 'Đơn này đã được xử lý'); return; }
    setSelectedSchedule(item);
    setRejectNotes('');
    setRejectDialogVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectNotes.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối'); return; }
    setRejectDialogVisible(false);
    try {
      setProcessing(true);
      await ShiftService.rejectShiftRegistration(selectedSchedule.id, rejectNotes.trim());
      Alert.alert('Thành công', 'Đã từ chối đơn đăng ký ca');
      if (listRef.current?.refresh) listRef.current.refresh();
    } catch (error) {
      console.error('Error rejecting:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối đơn');
    } finally {
      setProcessing(false);
      setSelectedSchedule(null);
      setRejectNotes('');
    }
  };

  const handleViewDetail = async (item) => {
    try {
      const response = await ShiftService.getShiftRegistrationById(item.id);
      // Merge enriched user data from list item with raw detail data
      const detailData = response?.data || {};
      setSelectedSchedule({
        ...item,
        ...detailData,
        user_fullname: detailData.user_fullname || item.user_fullname || item.user_fullName || item.username || '-',
      });
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Error fetching detail:', error);
      setSelectedSchedule(item);
      setDetailModalVisible(true);
    }
  };

  const renderCard = (item) => {
    const statusColor = getShiftStatusColor(item.status);
    const isPending = item.status === 'pending';

    return (
      <Card style={styles.card} mode="elevated" elevation={2}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.topRow}>
            <View style={[styles.iconWrapper, { backgroundColor: statusColor + '20' }]}>
              <Avatar.Icon size={56} icon="account-clock" style={{ backgroundColor: statusColor }} />
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.userName} numberOfLines={1}>{item.user_fullname || item.username || 'N/A'}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={14} color="#8c8c8c" />
                <Text style={styles.infoText}>{item.shift_name || 'Ca làm việc'}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#8c8c8c" />
                <Text style={styles.infoText}>{formatTime(item.start_time)} - {formatTime(item.end_time)}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-check" size={14} color="#1890ff" />
                <Text style={[styles.infoText, { color: '#1890ff' }]}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name={item.status === 'approved' ? 'check-circle' : item.status === 'rejected' ? 'close-circle' : 'clock'} size={14} color={statusColor} />
                <Text style={[styles.infoText, { color: statusColor }]}>{getShiftStatusLabel(item.status)}</Text>
              </View>
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
                <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleViewDetail(item); }}>
                  <MaterialCommunityIcons name="eye" size={18} color="#595959" />
                  <Text style={styles.menuItemText}>Xem chi tiết</Text>
                </TouchableOpacity>
                {isPending && (
                  <>
                    <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleApprove(item); }}>
                      <MaterialCommunityIcons name="check" size={18} color="#52c41a" />
                      <Text style={[styles.menuItemText, { color: '#52c41a' }]}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItemRow} onPress={() => { setVisibleMenuId(null); handleReject(item); }}>
                      <MaterialCommunityIcons name="close" size={18} color="#ff4d4f" />
                      <Text style={[styles.menuItemText, { color: '#ff4d4f' }]}>Từ chối</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Menu>
            </View>
          </View>
          {item.notes && (
            <View style={styles.notesRow}>
              <Text style={styles.notesLabel}>Ghi chú:</Text>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderDetailModal = () => {
    const reg = selectedSchedule;
    if (!reg) return null;
    const statusColor = getShiftStatusColor(reg.status);

    return (
      <Portal>
        <Dialog visible={detailModalVisible} onDismiss={() => setDetailModalVisible(false)}>
          <Dialog.Title>Chi tiết đơn đăng ký ca</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <View style={styles.detailStatusRow}>
                <Chip mode="flat" style={[styles.detailStatusChip, { backgroundColor: statusColor }]} textStyle={{ color: '#fff' }}>{getShiftStatusLabel(reg.status)}</Chip>
              </View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Nhân viên</Text><Text style={styles.detailValue}>{reg.user_fullname || reg.username || '-'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Tên ca</Text><Text style={styles.detailValue}>{reg.shift_name || '-'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Thời gian</Text><Text style={styles.detailValue}>{formatTime(reg.start_time)} - {formatTime(reg.end_time)}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Ngày đăng ký</Text><Text style={styles.detailValue}>{formatDate(reg.date)}</Text></View>
              {reg.working_unit && <View style={styles.detailItem}><Text style={styles.detailLabel}>Hệ số công</Text><Text style={styles.detailValue}>{reg.working_unit}</Text></View>}
              {reg.notes && <View style={styles.detailItem}><Text style={styles.detailLabel}>Ghi chú</Text><Text style={styles.detailValue}>{reg.notes}</Text></View>}
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Ngày tạo</Text><Text style={styles.detailValue}>{dayjs(reg.created_at).format('DD/MM/YYYY HH:mm')}</Text></View>
              {reg.status !== 'pending' && reg.approved_at && <View style={styles.detailItem}><Text style={styles.detailLabel}>{reg.status === 'approved' ? 'Ngày duyệt' : 'Ngày từ chối'}</Text><Text style={styles.detailValue}>{dayjs(reg.approved_at).format('DD/MM/YYYY HH:mm')}</Text></View>}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setDetailModalVisible(false)}>Đóng</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  return (
    <View style={styles.container}>
      <CardListWithInfiniteScroll
        ref={listRef}
        fetchData={fetchSchedules}
        renderCard={renderCard}
        searchPlaceholder="Tìm đơn đăng ký ca..."
        onItemPress={handleViewDetail}
        pageSize={10}
        emptyMessage="Không có đơn đăng ký ca nào"
        keyExtractor={(item) => item.id?.toString()}
        filters={[
          { key: 'status', label: 'Trạng thái', options: [{ value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }] },
          { key: 'user_fullname', label: 'Tên nhân viên' },
          { key: 'notes', label: 'Ghi chú' }
        ]}
      />
      {renderDetailModal()}
      <Portal>
        <Dialog visible={rejectDialogVisible} onDismiss={() => setRejectDialogVisible(false)}>
          <Dialog.Title>Lý do từ chối</Dialog.Title>
          <Dialog.Content>
            <TextInput style={styles.textArea} placeholder="Nhập lý do từ chối..." value={rejectNotes} onChangeText={setRejectNotes} multiline numberOfLines={3} textAlignVertical="top" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectDialogVisible(false)}>Hủy</Button>
            <Button onPress={confirmReject} textColor="#ff4d4f">Từ chối</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  cardContent: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrapper: { position: 'relative', marginRight: 12, borderRadius: 10 },
  infoSection: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoText: { fontSize: 13, color: '#595959', marginLeft: 6, flex: 1 },
  actionsColumn: { marginLeft: 8 },
  actionButtons: { flexDirection: 'column' },
  actionBtn: { margin: 0 },
  notesRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#8c8c8c', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#595959' },
  detailStatusRow: { alignItems: 'center', marginBottom: 16 },
  detailStatusChip: { paddingHorizontal: 16 },
  detailItem: { marginBottom: 16 },
  detailLabel: { fontSize: 13, color: '#8c8c8c', marginBottom: 4 },
  detailValue: { fontSize: 15, color: '#262626' },
  textArea: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80 },
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
  menuIcon: { marginRight: 12 },
  menuItemText: { fontSize: 14, color: '#262626' },
});

export default ShiftApprovalScreen;

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    ScrollView,
    TextInput,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal, Dialog, Button, Chip, Divider, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import ShiftService, {
    SHIFT_STATUS_LABELS,
    SHIFT_STATUS_COLORS,
    getShiftStatusLabel,
    getShiftStatusColor
} from '../../services/ShiftService';

const ShiftRegistrationScreen = ({ navigation }) => {
    const [registrations, setRegistrations] = useState([]);
    const [configurations, setConfigurations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pageSize] = useState(10);

    // Create modal
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showShiftPicker, setShowShiftPicker] = useState(false);

    // Detail modal
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Delete dialog
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Filter
    const [filterStatus, setFilterStatus] = useState(null);

    const loadConfigurations = async () => {
        try {
            const response = await ShiftService.getAllShiftConfigurations();
            const data = response?.data || [];
            setConfigurations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading configurations:', error);
        }
    };

    const loadRegistrations = async (page = 1, isRefresh = false, isLoadMore = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const filters = filterStatus ? { status: filterStatus } : {};
            const response = await ShiftService.getMyShiftRegistrations(filters);
            const data = response?.data || [];
            const totalCount = response?.total || data.length;

            if (isLoadMore) {
                setRegistrations(prev => [...prev, ...data]);
            } else {
                setRegistrations(Array.isArray(data) ? data : []);
            }

            setTotal(totalCount);
            setCurrentPage(page);
            setHasMore(page * pageSize < totalCount);
        } catch (error) {
            console.error('Error loading registrations:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách đăng ký ca');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadConfigurations();
        loadRegistrations();
    }, [filterStatus]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadRegistrations();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        loadRegistrations(1, true);
    };

    const loadMoreRegistrations = () => {
        if (!loadingMore && hasMore && !loading) {
            loadRegistrations(currentPage + 1, false, true);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    const formatTime = (timeString) => {
        if (!timeString) return '-';
        return timeString.substring(0, 5);
    };

    const handleCreateRegistration = async () => {
        if (!selectedShift) {
            Alert.alert('Lỗi', 'Vui lòng chọn ca làm việc');
            return;
        }

        try {
            setLoading(true);
            await ShiftService.createShiftRegistration({
                shift_id: selectedShift.id,
                date: dayjs(selectedDate).format('YYYY-MM-DD'),
                notes: notes.trim()
            });

            Alert.alert('Thành công', 'Đã đăng ký ca làm việc');
            setCreateModalVisible(false);
            resetForm();
            loadRegistrations();
        } catch (error) {
            console.error('Error creating registration:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể đăng ký ca');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedShift(null);
        setSelectedDate(new Date());
        setNotes('');
    };

    const handleViewDetail = async (item) => {
        setDetailLoading(true);
        setDetailModalVisible(true);

        try {
            const response = await ShiftService.getShiftRegistrationById(item.id);
            setSelectedRegistration(response?.data || item);
        } catch (error) {
            console.error('Error fetching detail:', error);
            setSelectedRegistration(item);
        } finally {
            setDetailLoading(false);
        }
    };

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
            setLoading(true);
            await ShiftService.cancelShiftRegistration(deleteTarget.id);
            Alert.alert('Thành công', 'Đã hủy đăng ký ca');
            loadRegistrations();
        } catch (error) {
            console.error('Error deleting registration:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể hủy đăng ký');
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    };

    const handleDateChange = (event, date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
        }
    };

    // Count by status
    const pendingCount = registrations.filter(r => r.status === 'pending').length;
    const approvedCount = registrations.filter(r => r.status === 'approved').length;
    const rejectedCount = registrations.filter(r => r.status === 'rejected').length;

    const renderItem = ({ item }) => {
        const statusColor = getShiftStatusColor(item.status);
        const isPending = item.status === 'pending';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleViewDetail(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
                        <Ionicons name="calendar" size={22} color={statusColor} />
                    </View>

                    <View style={styles.info}>
                        <View style={styles.titleRow}>
                            <Text style={styles.shiftName}>{item.shift_name || 'Ca làm việc'}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {getShiftStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.timeRow}>
                            <Ionicons name="time-outline" size={14} color="#8c8c8c" />
                            <Text style={styles.timeText}>
                                {formatTime(item.start_time)} - {formatTime(item.end_time)}
                            </Text>
                        </View>

                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color="#1890ff" />
                            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                        </View>

                        {item.notes && (
                            <Text style={styles.notes} numberOfLines={1}>
                                Ghi chú: {item.notes}
                            </Text>
                        )}
                    </View>
                </View>

                {isPending && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.viewButton]}
                            onPress={() => handleViewDetail(item)}
                        >
                            <Ionicons name="eye-outline" size={16} color="#1890ff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDelete(item)}
                        >
                            <Ionicons name="trash-outline" size={16} color="#ff4d4f" />
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
                            style={[styles.submitButton, loading && styles.disabledButton]}
                            onPress={handleCreateRegistration}
                            disabled={loading}
                        >
                            {loading ? (
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
                        <FlatList
                            data={configurations}
                            keyExtractor={(item) => item.id?.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
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
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyPickerText}>Không có ca làm việc</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}
        </Modal>
    );

    const renderDetailModal = () => {
        const reg = selectedRegistration;

        return (
            <Modal
                visible={detailModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chi tiết đăng ký ca</Text>
                            <IconButton
                                icon="close"
                                size={24}
                                onPress={() => setDetailModalVisible(false)}
                            />
                        </View>
                        <Divider />

                        {detailLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#1890ff" />
                            </View>
                        ) : reg ? (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.detailStatusRow}>
                                    <View style={[
                                        styles.detailStatusBadge,
                                        { backgroundColor: getShiftStatusColor(reg.status) }
                                    ]}>
                                        <Text style={styles.detailStatusText}>
                                            {getShiftStatusLabel(reg.status)}
                                        </Text>
                                    </View>
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
                        ) : null}
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading && !refreshing && registrations.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <View style={[styles.statItem, { backgroundColor: '#fa8c16' + '20' }]}>
                    <Text style={[styles.statNumber, { color: '#fa8c16' }]}>{pendingCount}</Text>
                    <Text style={styles.statLabel}>Chờ duyệt</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: '#52c41a' + '20' }]}>
                    <Text style={[styles.statNumber, { color: '#52c41a' }]}>{approvedCount}</Text>
                    <Text style={styles.statLabel}>Đã duyệt</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: '#ff4d4f' + '20' }]}>
                    <Text style={[styles.statNumber, { color: '#ff4d4f' }]}>{rejectedCount}</Text>
                    <Text style={styles.statLabel}>Từ chối</Text>
                </View>
            </View>

            {/* Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                <TouchableOpacity
                    style={[styles.filterChip, filterStatus === null && styles.filterChipActive]}
                    onPress={() => setFilterStatus(null)}
                >
                    <Text style={[styles.filterChipText, filterStatus === null && styles.filterChipTextActive]}>
                        Tất cả
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('pending')}
                >
                    <Text style={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextActive]}>
                        Chờ duyệt
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, filterStatus === 'approved' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('approved')}
                >
                    <Text style={[styles.filterChipText, filterStatus === 'approved' && styles.filterChipTextActive]}>
                        Đã duyệt
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, filterStatus === 'rejected' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('rejected')}
                >
                    <Text style={[styles.filterChipText, filterStatus === 'rejected' && styles.filterChipTextActive]}>
                        Từ chối
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Add Button */}
            <View style={styles.addBar}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setCreateModalVisible(true)}
                >
                    <Ionicons name="add-circle" size={22} color="#fff" />
                    <Text style={styles.addButtonText}>Đăng ký ca</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={registrations}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                onEndReached={loadMoreRegistrations}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Chưa có đăng ký ca nào</Text>
                        <Text style={styles.emptySubText}>Bấm "Đăng ký ca" để tạo mới</Text>
                    </View>
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadMoreContainer}>
                            <ActivityIndicator size="small" color="#1890ff" />
                            <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
                        </View>
                    ) : null
                }
            />

            {/* Modals */}
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
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
    loadingText: { marginTop: 12, color: '#8c8c8c' },

    // Stats
    statsBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 4, borderRadius: 8 },
    statNumber: { fontSize: 20, fontWeight: '700' },
    statLabel: { fontSize: 12, color: '#8c8c8c', marginTop: 2 },

    // Filter
    filterBar: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8 },
    filterChipActive: { backgroundColor: '#1890ff' },
    filterChipText: { fontSize: 13, color: '#595959' },
    filterChipTextActive: { color: '#fff', fontWeight: '600' },

    // Add Bar
    addBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1890ff', paddingVertical: 12, borderRadius: 8 },
    addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 15 },

    // List
    listContainer: { padding: 12 },
    card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardContent: { flexDirection: 'row', padding: 14 },
    iconContainer: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    info: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    shiftName: { fontSize: 15, fontWeight: '600', color: '#262626', flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '600' },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    timeText: { fontSize: 13, color: '#8c8c8c', marginLeft: 6 },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    dateText: { fontSize: 13, color: '#1890ff', marginLeft: 6, fontWeight: '500' },
    notes: { fontSize: 12, color: '#8c8c8c', marginTop: 4 },
    cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionButton: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    viewButton: { borderRightWidth: 1, borderRightColor: '#f0f0f0' },
    deleteButton: {},

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#8c8c8c', marginTop: 16 },
    emptySubText: { fontSize: 13, color: '#bfbfbf', marginTop: 4 },

    // Load more
    loadMoreContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
    loadMoreText: { marginLeft: 10, fontSize: 14, color: '#1890ff' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
    modalBody: { padding: 16 },
    modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },

    // Form
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#262626', marginBottom: 8 },
    required: { color: '#ff4d4f' },
    selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12 },
    selectText: { fontSize: 15, color: '#262626' },
    placeholder: { color: '#bfbfbf' },
    shiftTime: { marginTop: 6, fontSize: 13, color: '#1890ff' },
    dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12 },
    dateBoxText: { marginLeft: 10, fontSize: 15, color: '#262626' },
    textArea: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80 },
    cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9' },
    cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#595959' },
    submitButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: '#1890ff' },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 },

    // Picker
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', paddingBottom: 20 },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    pickerTitle: { fontSize: 16, fontWeight: '600', color: '#262626' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    pickerItemSelected: { backgroundColor: '#e6f7ff' },
    pickerItemText: { fontSize: 15, color: '#262626' },
    pickerItemTextSelected: { color: '#1890ff', fontWeight: '600' },
    pickerItemSubtext: { fontSize: 12, color: '#8c8c8c', marginTop: 2 },
    emptyPickerText: { textAlign: 'center', padding: 20, color: '#8c8c8c' },

    // Detail
    loadingContainer: { padding: 40, alignItems: 'center' },
    detailStatusRow: { alignItems: 'center', marginBottom: 20 },
    detailStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
    detailStatusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    detailItem: { marginBottom: 16 },
    detailLabel: { fontSize: 13, color: '#8c8c8c', marginBottom: 4 },
    detailValue: { fontSize: 15, color: '#262626' },
});

export default ShiftRegistrationScreen;

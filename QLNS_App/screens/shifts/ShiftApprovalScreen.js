import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal, Dialog, Button, Divider, IconButton } from 'react-native-paper';
import dayjs from 'dayjs';
import ShiftService, {
    getShiftStatusLabel,
    getShiftStatusColor
} from '../../services/ShiftService';

const ShiftApprovalScreen = ({ navigation }) => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pageSize] = useState(10);

    // Selection
    const [selectedItems, setSelectedItems] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Detail modal
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Approve/Reject dialogs
    const [approveDialogVisible, setApproveDialogVisible] = useState(false);
    const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
    const [targetSchedule, setTargetSchedule] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');

    // Filter
    const [filterStatus, setFilterStatus] = useState('');

    const loadSchedules = async (page = 1, isRefresh = false, isLoadMore = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const params = {
                page,
                limit: pageSize,
                status: filterStatus || undefined,
            };

            const response = await ShiftService.getSchedulesForApproval(params);
            const data = response?.data || [];
            const totalCount = response?.pagination?.total || data.length;

            if (isLoadMore) {
                setSchedules(prev => [...prev, ...data]);
            } else {
                setSchedules(Array.isArray(data) ? data : []);
            }

            setTotal(totalCount);
            setCurrentPage(page);
            setHasMore(page * pageSize < totalCount);
        } catch (error) {
            console.error('Error loading schedules:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách đơn đăng ký ca');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadSchedules();
    }, [filterStatus]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadSchedules();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        loadSchedules(1, true);
    };

    const loadMoreSchedules = () => {
        if (!loadingMore && hasMore && !loading) {
            loadSchedules(currentPage + 1, false, true);
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

    // Selection handlers
    const handleLongPress = (id) => {
        const schedule = schedules.find(s => s.id === id);
        if (schedule && schedule.status === 'pending') {
            setIsSelectionMode(true);
            setSelectedItems([id]);
        }
    };

    const toggleSelection = (id) => {
        const schedule = schedules.find(s => s.id === id);
        if (schedule && schedule.status !== 'pending') return;

        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(i => i !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedItems([]);
    };

    // Approve handlers
    const handleApprove = (item) => {
        if (item.status !== 'pending') {
            Alert.alert('Thông báo', 'Đơn này đã được xử lý');
            return;
        }
        setTargetSchedule(item);
        setApproveDialogVisible(true);
    };

    const confirmApprove = async () => {
        setApproveDialogVisible(false);
        if (!targetSchedule) return;

        try {
            setLoading(true);
            await ShiftService.approveShiftRegistration(targetSchedule.id);
            Alert.alert('Thành công', 'Đã duyệt đơn đăng ký ca');
            loadSchedules(currentPage);
        } catch (error) {
            console.error('Error approving:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt đơn');
        } finally {
            setLoading(false);
            setTargetSchedule(null);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedItems.length === 0) return;

        try {
            setLoading(true);
            await ShiftService.bulkApproveSchedules(selectedItems, 'approve');
            Alert.alert('Thành công', `Đã duyệt ${selectedItems.length} đơn đăng ký`);
            cancelSelection();
            loadSchedules();
        } catch (error) {
            console.error('Error bulk approving:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt đơn');
        } finally {
            setLoading(false);
        }
    };

    // Reject handlers
    const handleReject = (item) => {
        if (item.status !== 'pending') {
            Alert.alert('Thông báo', 'Đơn này đã được xử lý');
            return;
        }
        setTargetSchedule(item);
        setRejectNotes('');
        setRejectDialogVisible(true);
    };

    const confirmReject = async () => {
        setRejectDialogVisible(false);
        if (!targetSchedule) return;

        try {
            setLoading(true);
            await ShiftService.rejectShiftRegistration(targetSchedule.id, rejectNotes);
            Alert.alert('Thành công', 'Đã từ chối đơn đăng ký ca');
            loadSchedules(currentPage);
        } catch (error) {
            console.error('Error rejecting:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối đơn');
        } finally {
            setLoading(false);
            setTargetSchedule(null);
            setRejectNotes('');
        }
    };

    const handleBulkReject = async () => {
        if (selectedItems.length === 0) return;

        try {
            setLoading(true);
            await ShiftService.bulkApproveSchedules(selectedItems, 'reject');
            Alert.alert('Thành công', `Đã từ chối ${selectedItems.length} đơn đăng ký`);
            cancelSelection();
            loadSchedules();
        } catch (error) {
            console.error('Error bulk rejecting:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối đơn');
        } finally {
            setLoading(false);
        }
    };

    // View detail
    const handleViewDetail = async (item) => {
        setDetailLoading(true);
        setDetailModalVisible(true);

        try {
            const response = await ShiftService.getShiftRegistrationById(item.id);
            setSelectedSchedule(response?.data || item);
        } catch (error) {
            console.error('Error fetching detail:', error);
            setSelectedSchedule(item);
        } finally {
            setDetailLoading(false);
        }
    };

    // Count by status
    const pendingCount = schedules.filter(s => s.status === 'pending').length;
    const approvedCount = schedules.filter(s => s.status === 'approved').length;
    const rejectedCount = schedules.filter(s => s.status === 'rejected').length;

    const renderItem = ({ item }) => {
        const isSelected = selectedItems.includes(item.id);
        const isPending = item.status === 'pending';
        const statusColor = getShiftStatusColor(item.status);

        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => {
                    if (isSelectionMode) {
                        toggleSelection(item.id);
                    } else {
                        handleViewDetail(item);
                    }
                }}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    {isSelectionMode && (
                        <View style={styles.checkboxContainer}>
                            <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={isSelected ? '#1890ff' : (isPending ? '#666' : '#ccc')}
                            />
                        </View>
                    )}

                    <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
                        <Ionicons name="calendar" size={22} color={statusColor} />
                    </View>

                    <View style={styles.info}>
                        <View style={styles.titleRow}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {item.user?.fullName || `User ID: ${item.user_id}`}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {getShiftStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>

                        {item.user?.Department?.name && (
                            <Text style={styles.department} numberOfLines={1}>
                                {item.user.Department.name} • {item.user?.Chevron?.name || ''}
                            </Text>
                        )}

                        <View style={styles.shiftRow}>
                            <Ionicons name="time-outline" size={14} color="#1890ff" />
                            <Text style={styles.shiftText}>
                                {item.shift_name}: {formatTime(item.start_time)} - {formatTime(item.end_time)}
                            </Text>
                        </View>

                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color="#8c8c8c" />
                            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                        </View>
                    </View>
                </View>

                {!isSelectionMode && isPending && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleApprove(item)}
                        >
                            <Ionicons name="checkmark" size={18} color="#52c41a" />
                            <Text style={[styles.actionText, { color: '#52c41a' }]}>Duyệt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleReject(item)}
                        >
                            <Ionicons name="close" size={18} color="#ff4d4f" />
                            <Text style={[styles.actionText, { color: '#ff4d4f' }]}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.viewButton]}
                            onPress={() => handleViewDetail(item)}
                        >
                            <Ionicons name="eye-outline" size={18} color="#1890ff" />
                            <Text style={[styles.actionText, { color: '#1890ff' }]}>Chi tiết</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderDetailModal = () => {
        const schedule = selectedSchedule;

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
                            <Text style={styles.modalTitle}>Chi tiết đơn đăng ký ca</Text>
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
                        ) : schedule ? (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.detailStatusRow}>
                                    <View style={[
                                        styles.detailStatusBadge,
                                        { backgroundColor: getShiftStatusColor(schedule.status) }
                                    ]}>
                                        <Text style={styles.detailStatusText}>
                                            {getShiftStatusLabel(schedule.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Nhân viên</Text>
                                    <Text style={styles.detailValue}>
                                        {schedule.user?.fullName || `User ID: ${schedule.user_id}`}
                                    </Text>
                                    {schedule.user?.Department?.name && (
                                        <Text style={styles.detailSubValue}>
                                            {schedule.user.Department.name} • {schedule.user?.Chevron?.name || ''}
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Tên ca</Text>
                                    <Text style={styles.detailValue}>{schedule.shift_name || '-'}</Text>
                                </View>

                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Thời gian ca</Text>
                                    <Text style={styles.detailValue}>
                                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                    </Text>
                                </View>

                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Ngày đăng ký</Text>
                                    <Text style={styles.detailValue}>{formatDate(schedule.date)}</Text>
                                </View>

                                {schedule.working_unit && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Hệ số công</Text>
                                        <Text style={styles.detailValue}>{schedule.working_unit}</Text>
                                    </View>
                                )}

                                {schedule.notes && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Ghi chú</Text>
                                        <Text style={styles.detailValue}>{schedule.notes}</Text>
                                    </View>
                                )}

                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Ngày tạo</Text>
                                    <Text style={styles.detailValue}>
                                        {dayjs(schedule.created_at).format('DD/MM/YYYY HH:mm')}
                                    </Text>
                                </View>

                                {schedule.status === 'pending' && (
                                    <View style={styles.detailActions}>
                                        <TouchableOpacity
                                            style={[styles.detailActionButton, styles.detailApproveButton]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleApprove(schedule);
                                            }}
                                        >
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                            <Text style={styles.detailActionText}>Duyệt đơn</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.detailActionButton, styles.detailRejectButton]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleReject(schedule);
                                            }}
                                        >
                                            <Ionicons name="close" size={20} color="#fff" />
                                            <Text style={styles.detailActionText}>Từ chối</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading && !refreshing && schedules.length === 0) {
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
                    style={[styles.filterChip, filterStatus === '' && styles.filterChipActive]}
                    onPress={() => setFilterStatus('')}
                >
                    <Text style={[styles.filterChipText, filterStatus === '' && styles.filterChipTextActive]}>
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

            {/* Selection Bar */}
            {isSelectionMode && (
                <View style={styles.selectionBar}>
                    <TouchableOpacity onPress={cancelSelection}>
                        <Text style={styles.cancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectedCount}>Đã chọn: {selectedItems.length}</Text>
                    <View style={styles.selectionActions}>
                        <TouchableOpacity
                            style={styles.bulkApproveButton}
                            onPress={handleBulkApprove}
                            disabled={selectedItems.length === 0}
                        >
                            <Ionicons name="checkmark" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.bulkRejectButton}
                            onPress={handleBulkReject}
                            disabled={selectedItems.length === 0}
                        >
                            <Ionicons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* List */}
            <FlatList
                data={schedules}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                onEndReached={loadMoreSchedules}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Không có đơn đăng ký ca</Text>
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

            {/* Detail Modal */}
            {renderDetailModal()}

            {/* Approve Dialog */}
            <Portal>
                <Dialog visible={approveDialogVisible} onDismiss={() => setApproveDialogVisible(false)}>
                    <Dialog.Title>
                        <View style={styles.dialogTitleRow}>
                            <Ionicons name="checkmark-circle" size={24} color="#52c41a" />
                            <Text style={styles.dialogTitleText}>Duyệt đơn đăng ký ca</Text>
                        </View>
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text>
                            Ca: {targetSchedule?.shift_name}{'\n'}
                            Nhân viên: {targetSchedule?.user?.fullName}{'\n'}
                            Ngày: {formatDate(targetSchedule?.date)}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setApproveDialogVisible(false)}>Hủy</Button>
                        <Button onPress={confirmApprove} textColor="#52c41a">Duyệt</Button>
                    </Dialog.Actions>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog visible={rejectDialogVisible} onDismiss={() => setRejectDialogVisible(false)}>
                    <Dialog.Title>
                        <View style={styles.dialogTitleRow}>
                            <Ionicons name="close-circle" size={24} color="#ff4d4f" />
                            <Text style={styles.dialogTitleText}>Từ chối đơn đăng ký ca</Text>
                        </View>
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ marginBottom: 12 }}>
                            Ca: {targetSchedule?.shift_name}{'\n'}
                            Nhân viên: {targetSchedule?.user?.fullName}
                        </Text>
                        <TextInput
                            style={styles.dialogInput}
                            placeholder="Lý do từ chối..."
                            value={rejectNotes}
                            onChangeText={setRejectNotes}
                            multiline
                            numberOfLines={3}
                        />
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

    // Selection
    selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e6f7ff', paddingHorizontal: 16, paddingVertical: 12 },
    cancelText: { color: '#1890ff', fontWeight: '600' },
    selectedCount: { color: '#1890ff', fontWeight: '600' },
    selectionActions: { flexDirection: 'row' },
    bulkApproveButton: { backgroundColor: '#52c41a', padding: 8, borderRadius: 6, marginRight: 8 },
    bulkRejectButton: { backgroundColor: '#ff4d4f', padding: 8, borderRadius: 6 },

    // List
    listContainer: { padding: 12 },
    card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    selectedCard: { borderWidth: 2, borderColor: '#1890ff' },
    cardContent: { flexDirection: 'row', padding: 14 },
    checkboxContainer: { marginRight: 10, justifyContent: 'center' },
    iconContainer: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    info: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    userName: { fontSize: 15, fontWeight: '600', color: '#262626', flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '600' },
    department: { fontSize: 12, color: '#8c8c8c', marginBottom: 6 },
    shiftRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    shiftText: { fontSize: 13, color: '#1890ff', marginLeft: 6 },
    dateRow: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 13, color: '#8c8c8c', marginLeft: 6 },
    cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
    approveButton: { borderRightWidth: 1, borderRightColor: '#f0f0f0' },
    rejectButton: { borderRightWidth: 1, borderRightColor: '#f0f0f0' },
    viewButton: {},
    actionText: { marginLeft: 4, fontSize: 13, fontWeight: '500' },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#8c8c8c', marginTop: 16 },

    // Load more
    loadMoreContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
    loadMoreText: { marginLeft: 10, fontSize: 14, color: '#1890ff' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
    modalTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
    modalBody: { padding: 16 },
    loadingContainer: { padding: 40, alignItems: 'center' },
    detailStatusRow: { alignItems: 'center', marginBottom: 20 },
    detailStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
    detailStatusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    detailItem: { marginBottom: 16 },
    detailLabel: { fontSize: 13, color: '#8c8c8c', marginBottom: 4 },
    detailValue: { fontSize: 15, color: '#262626' },
    detailSubValue: { fontSize: 13, color: '#8c8c8c', marginTop: 2 },
    detailActions: { flexDirection: 'row', marginTop: 20 },
    detailActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginHorizontal: 4 },
    detailApproveButton: { backgroundColor: '#52c41a' },
    detailRejectButton: { backgroundColor: '#ff4d4f' },
    detailActionText: { color: '#fff', fontWeight: '600', marginLeft: 8 },

    // Dialog
    dialogTitleRow: { flexDirection: 'row', alignItems: 'center' },
    dialogTitleText: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
    dialogInput: { borderWidth: 1, borderColor: '#d9d9d9', borderRadius: 8, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 80 },
});

export default ShiftApprovalScreen;

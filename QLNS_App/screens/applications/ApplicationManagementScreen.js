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
    TextInput,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal, Dialog, Button, Paragraph, Chip, Divider, IconButton, List } from 'react-native-paper';
import dayjs from 'dayjs';
import ApplicationService, {
    APPLICATION_TYPE_LABELS,
    APPLICATION_STATUS_LABELS,
    APPLICATION_STATUS_COLORS,
    FORGOT_CHECK_TYPE_LABELS
} from '../../services/ApplicationService';

const ApplicationManagementScreen = ({ navigation }) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [pageSize] = useState(10);

    // Approve/Reject dialogs
    const [approveDialogVisible, setApproveDialogVisible] = useState(false);
    const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
    const [approveNote, setApproveNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [targetApplication, setTargetApplication] = useState(null);

    // Delete dialog
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleteMultipleDialogVisible, setDeleteMultipleDialogVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Detail modal
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Filter modal
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterType, setFilterType] = useState(null);

    const fetchApplications = async (page = 1, isRefresh = false, isLoadMore = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        
        try {
            const response = await ApplicationService.getAllApplications({
                page: page,
                pageSize: pageSize
            });
            // API trả về { success, data: [], total }
            const appList = response?.data || [];
            const totalCount = response?.total || 0;
            
            if (isLoadMore) {
                // Append new data to existing list
                setApplications(prev => [...prev, ...appList]);
            } else {
                // Replace data (refresh or initial load)
                setApplications(appList);
            }
            
            setTotal(totalCount);
            setCurrentPage(page);
            setHasMore(page * pageSize < totalCount);
            console.log(`📋 Loaded applications: page ${page}, count ${appList.length}, total ${totalCount}`);
        } catch (error) {
            console.error('Error fetching applications:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách đơn từ');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const loadMoreApplications = () => {
        if (!loadingMore && hasMore && !loading) {
            fetchApplications(currentPage + 1, false, true);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchApplications();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        fetchApplications(1, true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return dayjs(dateString).format('DD/MM/YYYY');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return dayjs(dateString).format('DD/MM/YYYY HH:mm');
    };

    const getTypeLabel = (type) => {
        return APPLICATION_TYPE_LABELS[type] || type || 'Không xác định';
    };

    const getStatusLabel = (status) => {
        return APPLICATION_STATUS_LABELS[status] || 'Không xác định';
    };

    const getStatusColor = (status) => {
        return APPLICATION_STATUS_COLORS[status] || '#8c8c8c';
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'leave': return 'calendar-outline';
            case 'overtime': return 'time-outline';
            case 'business-trip': return 'airplane-outline';
            case 'forgot-check': return 'alarm-outline';
            case 'resignation': return 'exit-outline';
            case 'shift-registration': return 'calendar-number-outline';
            case 'remote-work': return 'home-outline';
            case 'sick-leave': return 'medkit-outline';
            default: return 'document-text-outline';
        }
    };

    // Selection handling
    const handleLongPress = (id) => {
        const app = applications.find(a => a.id === id);
        if (app && app.status === 0) {
            setIsSelectionMode(true);
            setSelectedItems([id]);
        }
    };

    const toggleSelection = (id) => {
        const app = applications.find(a => a.id === id);
        if (app && app.status !== 0) return;
        
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
        if (item.status !== 0) {
            Alert.alert('Thông báo', 'Đơn này đã được xử lý');
            return;
        }
        setTargetApplication(item);
        setApproveNote('');
        setApproveDialogVisible(true);
    };

    const confirmApprove = async () => {
        setApproveDialogVisible(false);
        if (!targetApplication) return;
        
        try {
            setLoading(true);
            await ApplicationService.approveApplication(targetApplication.id, {
                note: approveNote
            });
            Alert.alert('Thành công', 'Đã duyệt đơn từ');
            fetchApplications(currentPage);
        } catch (error) {
            console.error('Error approving application:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể duyệt đơn từ');
        } finally {
            setLoading(false);
            setTargetApplication(null);
            setApproveNote('');
        }
    };

    // Reject handlers
    const handleReject = (item) => {
        if (item.status !== 0) {
            Alert.alert('Thông báo', 'Đơn này đã được xử lý');
            return;
        }
        setTargetApplication(item);
        setRejectReason('');
        setRejectDialogVisible(true);
    };

    const confirmReject = async () => {
        setRejectDialogVisible(false);
        if (!targetApplication) return;
        
        try {
            setLoading(true);
            await ApplicationService.rejectApplication(targetApplication.id, {
                rejectionReason: rejectReason
            });
            Alert.alert('Thành công', 'Đã từ chối đơn từ');
            fetchApplications(currentPage);
        } catch (error) {
            console.error('Error rejecting application:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể từ chối đơn từ');
        } finally {
            setLoading(false);
            setTargetApplication(null);
            setRejectReason('');
        }
    };

    // Delete handlers
    const handleDelete = (item) => {
        setDeleteTarget(item);
        setDeleteDialogVisible(true);
    };

    const confirmDelete = async () => {
        setDeleteDialogVisible(false);
        if (!deleteTarget) return;
        
        try {
            setLoading(true);
            await ApplicationService.deleteApplication(deleteTarget.id);
            Alert.alert('Thành công', 'Đã xóa đơn từ');
            fetchApplications(currentPage);
        } catch (error) {
            console.error('Error deleting application:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa đơn từ');
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedItems.length === 0) return;
        setDeleteMultipleDialogVisible(true);
    };

    const confirmDeleteMultiple = async () => {
        setDeleteMultipleDialogVisible(false);
        
        try {
            setLoading(true);
            await ApplicationService.bulkDeleteApplications(selectedItems);
            Alert.alert('Thành công', `Đã xóa ${selectedItems.length} đơn từ`);
            cancelSelection();
            fetchApplications(currentPage);
        } catch (error) {
            console.error('Error deleting applications:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa đơn từ');
        } finally {
            setLoading(false);
        }
    };

    // View detail
    const handleViewDetail = async (item) => {
        setDetailLoading(true);
        setDetailModalVisible(true);
        
        try {
            const response = await ApplicationService.getApplicationById(item.id);
            // API trả về { success, data: {...} }
            const detail = response?.data || response || item;
            console.log('📄 Application detail:', detail);
            setSelectedApplication(detail);
        } catch (error) {
            console.error('Error fetching application detail:', error);
            setSelectedApplication(item);
        } finally {
            setDetailLoading(false);
        }
    };

    // Filter logic
    const filteredApplications = applications.filter(app => {
        const appReason = app.data?.reason || app.reason || '';
        const searchMatch = 
            getTypeLabel(app.type).toLowerCase().includes(searchText.toLowerCase()) ||
            appReason.toLowerCase().includes(searchText.toLowerCase()) ||
            (app.userInfo?.fullName || '').toLowerCase().includes(searchText.toLowerCase());
        
        const statusMatch = filterStatus === null || app.status === filterStatus;
        const typeMatch = filterType === null || app.type === filterType;
        
        return searchMatch && statusMatch && typeMatch;
    });

    const clearFilters = () => {
        setFilterStatus(null);
        setFilterType(null);
        setFilterModalVisible(false);
    };

    const hasActiveFilters = filterStatus !== null || filterType !== null;

    // Count by status
    const pendingCount = applications.filter(a => a.status === 0).length;
    const approvedCount = applications.filter(a => a.status === 1).length;
    const rejectedCount = applications.filter(a => a.status === 2).length;

    // Render application card
    const renderItem = ({ item }) => {
        const isSelected = selectedItems.includes(item.id);
        const isPending = item.status === 0;

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
                    
                    <View style={[styles.iconContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Ionicons name={getTypeIcon(item.type)} size={22} color={getStatusColor(item.status)} />
                    </View>
                    
                    <View style={styles.info}>
                        <View style={styles.titleRow}>
                            <Text style={styles.typeName} numberOfLines={1} ellipsizeMode='tail'>{getTypeLabel(item.type)}</Text>
                            <Chip
                                mode="flat"
                                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                                textStyle={{ color: getStatusColor(item.status), fontSize: 11, fontWeight: '600' }}
                            >
                                {getStatusLabel(item.status)}
                            </Chip>
                        </View>
                        
                        {/* Creator info */}
                        <View style={styles.creatorRow}>
                            <Ionicons name="person-outline" size={14} color="#1890ff" />
                            <Text style={styles.creatorName}>
                                {item.userInfo?.fullName || item.userInfo?.username || `User ID: ${item.userId}`}
                            </Text>
                        </View>
                        {item.userInfo?.department?.name && (
                            <Text style={styles.creatorDept}>
                                {item.userInfo.department.name} • {item.userInfo.chevron?.name || ''}
                            </Text>
                        )}
                        
                        {(item.reason || item.data?.reason) && (
                            <Text style={styles.reason} numberOfLines={2}>
                                Lý do: {item.reason || item.data?.reason}
                            </Text>
                        )}
                        
                        <View style={styles.metaRow}>
                            <Text style={styles.date}>
                                <Ionicons name="calendar-outline" size={12} color="#8c8c8c" /> {formatDate(item.applicationDate || item.created_at)}
                            </Text>
                        </View>
                    </View>
                </View>
                
                {/* Action buttons for pending items */}
                {!isSelectionMode && isPending && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.cardActionButton, styles.approveButton]}
                            onPress={() => handleApprove(item)}
                        >
                            <Ionicons name="checkmark" size={18} color="#52c41a" />
                            <Text style={[styles.cardActionText, { color: '#52c41a' }]}>Duyệt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cardActionButton, styles.rejectButton]}
                            onPress={() => handleReject(item)}
                        >
                            <Ionicons name="close" size={18} color="#ff4d4f" />
                            <Text style={[styles.cardActionText, { color: '#ff4d4f' }]}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cardActionButton, styles.viewButton]}
                            onPress={() => handleViewDetail(item)}
                        >
                            <Ionicons name="eye-outline" size={18} color="#1890ff" />
                            <Text style={[styles.cardActionText, { color: '#1890ff' }]}>Chi tiết</Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                {/* View button for processed items */}
                {!isSelectionMode && !isPending && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.cardActionButton, styles.viewButton, { flex: 1 }]}
                            onPress={() => handleViewDetail(item)}
                        >
                            <Ionicons name="eye-outline" size={18} color="#1890ff" />
                            <Text style={[styles.cardActionText, { color: '#1890ff' }]}>Xem chi tiết</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Render detail modal
    const renderDetailModal = () => {
        const app = selectedApplication;
        
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
                            <Text style={styles.modalTitle}>Chi tiết đơn từ</Text>
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
                        ) : app ? (
                            <ScrollView style={styles.modalBody}>
                                {/* Status Badge */}
                                <View style={styles.detailStatusRow}>
                                    <Chip
                                        mode="flat"
                                        style={[styles.detailStatusChip, { backgroundColor: getStatusColor(app.status) + '20' }]}
                                        textStyle={{ color: getStatusColor(app.status), fontWeight: '600' }}
                                    >
                                        {getStatusLabel(app.status)}
                                    </Chip>
                                </View>
                                
                                {/* Type */}
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Loại đơn</Text>
                                    <View style={styles.detailValueRow}>
                                        <Ionicons name={getTypeIcon(app.type)} size={18} color="#1890ff" />
                                        <Text style={styles.detailValue}>{getTypeLabel(app.type)}</Text>
                                    </View>
                                </View>
                                
                                {/* Creator */}
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Người tạo đơn</Text>
                                    <Text style={styles.detailValue}>
                                        {app.userInfo?.fullName || app.userInfo?.username || `User ID: ${app.userId}`}
                                    </Text>
                                    {app.userInfo?.department?.name && (
                                        <Text style={styles.detailSubValue}>
                                            {app.userInfo.department.name} • {app.userInfo.chevron?.name || ''}
                                        </Text>
                                    )}
                                </View>
                                
                                {/* Application Date */}
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Ngày tạo đơn</Text>
                                    <Text style={styles.detailValue}>{formatDateTime(app.applicationDate || app.created_at)}</Text>
                                </View>
                                
                                {/* Reason - có thể nằm trong app.reason hoặc app.data.reason */}
                                {(app.reason || app.data?.reason) && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Lý do</Text>
                                        <Text style={styles.detailValue}>{app.reason || app.data?.reason}</Text>
                                    </View>
                                )}
                                
                                {/* Data details based on type */}
                                {app.data && (
                                    <>
                                        {app.type === 'leave' && (
                                            <>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Từ ngày</Text>
                                                    <Text style={styles.detailValue}>{formatDate(app.data.startDate)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Đến ngày</Text>
                                                    <Text style={styles.detailValue}>{formatDate(app.data.endDate)}</Text>
                                                </View>
                                                {app.data.leaveType && (
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>Loại nghỉ</Text>
                                                        <Text style={styles.detailValue}>
                                                            {app.data.leaveType === 'leave' ? 'Nghỉ phép (có lương)' : 
                                                             app.data.leaveType === 'personal' ? 'Nghỉ việc riêng' :
                                                             app.data.leaveType === 'sick' ? 'Nghỉ ốm' :
                                                             app.data.leaveType}
                                                        </Text>
                                                    </View>
                                                )}
                                            </>
                                        )}
                                        
                                        {app.type === 'overtime' && (
                                            <>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Ngày làm thêm</Text>
                                                    <Text style={styles.detailValue}>{formatDate(app.data.date)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Số giờ</Text>
                                                    <Text style={styles.detailValue}>{app.data.hours} giờ</Text>
                                                </View>
                                            </>
                                        )}
                                        
                                        {app.type === 'business-trip' && (
                                            <>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Từ ngày</Text>
                                                    <Text style={styles.detailValue}>{formatDate(app.data.startDate)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Đến ngày</Text>
                                                    <Text style={styles.detailValue}>{formatDate(app.data.endDate)}</Text>
                                                </View>
                                                {app.data.destination && (
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>Địa điểm</Text>
                                                        <Text style={styles.detailValue}>{app.data.destination}</Text>
                                                    </View>
                                                )}
                                            </>
                                        )}
                                        
                                        {app.type === 'forgot-check' && (
                                            <>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Ngày</Text>
                                                    <Text style={styles.detailValue}>{formatDate(app.data?.forgotDate || app.data?.date)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Giờ</Text>
                                                    <Text style={styles.detailValue}>{app.data?.forgotTime || app.data?.time || '-'}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Loại</Text>
                                                    <Text style={styles.detailValue}>
                                                        {FORGOT_CHECK_TYPE_LABELS[app.data?.forgotType || app.data?.checkType] || (app.data?.forgotType || app.data?.checkType) || '-'}
                                                    </Text>
                                                </View>
                                            </>
                                        )}
                                    </>
                                )}
                                
                                {/* Note */}
                                {app.note && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Ghi chú duyệt</Text>
                                        <Text style={styles.detailValue}>{app.note}</Text>
                                    </View>
                                )}
                                
                                {/* Approver info */}
                                {app.approvedBy && (
                                    <>
                                        <Divider style={styles.detailDivider} />
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Người duyệt</Text>
                                            <Text style={styles.detailValue}>
                                                {app.approvedByInfo?.fullName || `ID: ${app.approvedBy}`}
                                            </Text>
                                        </View>
                                        {app.approvedDate && (
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Ngày duyệt</Text>
                                                <Text style={styles.detailValue}>{formatDateTime(app.approvedDate)}</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                                
                                {/* Rejection reason */}
                                {app.status === 2 && app.rejectionReason && (
                                    <View style={[styles.detailItem, styles.rejectionBox]}>
                                        <Text style={styles.detailLabel}>Lý do từ chối</Text>
                                        <Text style={[styles.detailValue, { color: '#ff4d4f' }]}>{app.rejectionReason}</Text>
                                    </View>
                                )}
                                
                                {/* Action buttons for pending */}
                                {app.status === 0 && (
                                    <View style={styles.detailActions}>
                                        <TouchableOpacity
                                            style={[styles.detailActionButton, styles.detailApproveButton]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleApprove(app);
                                            }}
                                        >
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                            <Text style={styles.detailActionButtonText}>Duyệt đơn</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.detailActionButton, styles.detailRejectButton]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleReject(app);
                                            }}
                                        >
                                            <Ionicons name="close" size={20} color="#fff" />
                                            <Text style={styles.detailActionButtonText}>Từ chối</Text>
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

    // Render filter modal
    const renderFilterModal = () => (
        <Modal
            visible={filterModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setFilterModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Bộ lọc</Text>
                        <IconButton
                            icon="close"
                            size={24}
                            onPress={() => setFilterModalVisible(false)}
                        />
                    </View>
                    <Divider />
                    
                    <ScrollView style={styles.modalBody}>
                        {/* Status filter */}
                        <Text style={styles.filterSectionTitle}>Trạng thái</Text>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === null && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(null)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === null && styles.filterOptionTextActive]}>
                                    Tất cả ({applications.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === 0 && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(0)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === 0 && styles.filterOptionTextActive]}>
                                    Chờ duyệt ({pendingCount})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === 1 && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(1)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === 1 && styles.filterOptionTextActive]}>
                                    Đã duyệt ({approvedCount})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === 2 && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(2)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === 2 && styles.filterOptionTextActive]}>
                                    Từ chối ({rejectedCount})
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Type filter */}
                        <Text style={styles.filterSectionTitle}>Loại đơn</Text>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterOption, filterType === null && styles.filterOptionActive]}
                                onPress={() => setFilterType(null)}
                            >
                                <Text style={[styles.filterOptionText, filterType === null && styles.filterOptionTextActive]}>
                                    Tất cả
                                </Text>
                            </TouchableOpacity>
                            {Object.entries(APPLICATION_TYPE_LABELS).map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.filterOption, filterType === key && styles.filterOptionActive]}
                                    onPress={() => setFilterType(key)}
                                >
                                    <Text style={[styles.filterOptionText, filterType === key && styles.filterOptionTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                    
                    <View style={styles.filterActions}>
                        <TouchableOpacity style={styles.clearFilterButton} onPress={clearFilters}>
                            <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyFilterButton}
                            onPress={() => setFilterModalVisible(false)}
                        >
                            <Text style={styles.applyFilterText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (loading && !refreshing && applications.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Stats bar */}
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
            
            {/* Search & Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm theo tên, loại đơn..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText !== '' && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons
                        name="filter"
                        size={20}
                        color={hasActiveFilters ? '#fff' : '#1890ff'}
                    />
                </TouchableOpacity>
            </View>

            {/* Header / Selection Bar */}
            {isSelectionMode ? (
                <View style={styles.selectionBar}>
                    <TouchableOpacity onPress={cancelSelection}>
                        <Text style={styles.cancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectedCountText}>Đã chọn: {selectedItems.length}</Text>
                    <TouchableOpacity
                        onPress={handleDeleteSelected}
                        disabled={selectedItems.length === 0}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={24}
                            color={selectedItems.length > 0 ? '#ff4d4f' : '#ccc'}
                        />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.headerBar}>
                    <Text style={styles.totalText}>
                        Hiển thị: {filteredApplications.length} / {total} đơn từ
                    </Text>
                </View>
            )}

            {/* List */}
            <FlatList
                data={filteredApplications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                onEndReached={loadMoreApplications}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>
                            {hasActiveFilters ? 'Không tìm thấy đơn từ phù hợp' : 'Chưa có đơn từ nào'}
                        </Text>
                        <Text style={styles.emptySubText}>
                            {hasActiveFilters ? 'Thử thay đổi bộ lọc' : 'Các đơn từ sẽ xuất hiện ở đây'}
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadMoreContainer}>
                            <ActivityIndicator size="small" color="#1890ff" />
                            <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
                        </View>
                    ) : hasMore && applications.length > 0 ? (
                        <View style={styles.loadMoreContainer}>
                            <Text style={styles.loadMoreHint}>Kéo xuống để tải thêm</Text>
                        </View>
                    ) : applications.length > 0 ? (
                        <View style={styles.loadMoreContainer}>
                            <Text style={styles.loadMoreHint}>Đã tải hết dữ liệu</Text>
                        </View>
                    ) : null
                }
            />

            {/* Modals */}
            {renderDetailModal()}
            {renderFilterModal()}

            {/* Approve Dialog */}
            <Portal>
                <Dialog visible={approveDialogVisible} onDismiss={() => setApproveDialogVisible(false)}>
                    <Dialog.Title>
                        <View style={styles.dialogTitleRow}>
                            <Ionicons name="checkmark-circle" size={24} color="#52c41a" />
                            <Text style={styles.dialogTitleText}>Duyệt đơn từ</Text>
                        </View>
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.dialogInfoText}>
                            Loại đơn: {getTypeLabel(targetApplication?.type)}
                        </Text>
                        <Text style={styles.dialogInfoText}>
                            Người tạo: {targetApplication?.userInfo?.fullName}
                        </Text>
                        <TextInput
                            style={styles.dialogInput}
                            placeholder="Ghi chú (không bắt buộc)"
                            value={approveNote}
                            onChangeText={setApproveNote}
                            multiline
                            numberOfLines={3}
                        />
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
                            <Text style={styles.dialogTitleText}>Từ chối đơn từ</Text>
                        </View>
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.dialogInfoText}>
                            Loại đơn: {getTypeLabel(targetApplication?.type)}
                        </Text>
                        <Text style={styles.dialogInfoText}>
                            Người tạo: {targetApplication?.userInfo?.fullName}
                        </Text>
                        <TextInput
                            style={styles.dialogInput}
                            placeholder="Lý do từ chối (không bắt buộc)"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={3}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setRejectDialogVisible(false)}>Hủy</Button>
                        <Button onPress={confirmReject} textColor="#ff4d4f">Từ chối</Button>
                    </Dialog.Actions>
                </Dialog>

                {/* Delete Dialogs */}
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
                    <Dialog.Title>Xác nhận xóa</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>
                            Bạn có chắc chắn muốn xóa đơn "{getTypeLabel(deleteTarget?.type)}"?
                        </Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
                        <Button onPress={confirmDelete} textColor="#ff4d4f">Xóa</Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog visible={deleteMultipleDialogVisible} onDismiss={() => setDeleteMultipleDialogVisible(false)}>
                    <Dialog.Title>Xác nhận xóa</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>
                            Bạn có chắc chắn muốn xóa {selectedItems.length} đơn từ đã chọn?
                        </Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteMultipleDialogVisible(false)}>Hủy</Button>
                        <Button onPress={confirmDeleteMultiple} textColor="#ff4d4f">Xóa</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
    },
    loadingText: {
        marginTop: 12,
        color: '#8c8c8c',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    
    // Stats bar
    statsBar: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11,
        color: '#8c8c8c',
        marginTop: 2,
    },
    
    // Search
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginRight: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#e6f7ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#1890ff',
    },
    
    // Header
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    totalText: {
        fontSize: 14,
        color: '#595959',
    },
    
    // Selection bar
    selectionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#e6f7ff',
    },
    cancelText: {
        color: '#1890ff',
        fontWeight: '600',
    },
    selectedCountText: {
        color: '#262626',
        fontWeight: '600',
    },
    
    // List
    listContainer: {
        padding: 16,
    },
    
    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    selectedCard: {
        backgroundColor: '#e6f7ff',
        borderWidth: 1,
        borderColor: '#1890ff',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
    },
    checkboxContainer: {
        marginRight: 12,
        marginTop: 4,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        // allow children to align properly on small screens
    },
    typeName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#262626',
        flex: 1,
        marginRight: 8,
        // ensure title truncates instead of pushing the status chip off-screen
    },
    statusChip: {
        height: 24,
        minWidth: 80,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        flexShrink: 0,
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    creatorName: {
        fontSize: 13,
        color: '#1890ff',
        marginLeft: 6,
        fontWeight: '500',
    },
    creatorDept: {
        fontSize: 12,
        color: '#8c8c8c',
        marginBottom: 4,
    },
    reason: {
        fontSize: 13,
        color: '#595959',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    date: {
        fontSize: 12,
        color: '#8c8c8c',
    },
    
    // Card actions
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cardActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    approveButton: {
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    rejectButton: {
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    viewButton: {},
    cardActionText: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
    },
    
    // Empty
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#8c8c8c',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#bfbfbf',
        marginTop: 8,
    },
    
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#262626',
    },
    modalBody: {
        padding: 20,
    },
    
    // Detail modal
    detailStatusRow: {
        alignItems: 'center',
        marginBottom: 20,
    },
    detailStatusChip: {
        paddingHorizontal: 16,
        minWidth: 120,
        justifyContent: 'center',
        alignItems: 'center'
    },
    detailItem: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 13,
        color: '#8c8c8c',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        color: '#262626',
        marginLeft: 6,
    },
    detailSubValue: {
        fontSize: 13,
        color: '#8c8c8c',
        marginTop: 2,
    },
    detailValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailDivider: {
        marginVertical: 16,
    },
    rejectionBox: {
        backgroundColor: '#fff2f0',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#ff4d4f',
    },
    detailActions: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    detailActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    detailApproveButton: {
        backgroundColor: '#52c41a',
    },
    detailRejectButton: {
        backgroundColor: '#ff4d4f',
    },
    detailActionButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
    },
    
    // Filter modal
    filterSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#262626',
        marginBottom: 12,
        marginTop: 8,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    filterOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: 8,
        marginBottom: 8,
    },
    filterOptionActive: {
        backgroundColor: '#1890ff',
    },
    filterOptionText: {
        fontSize: 13,
        color: '#595959',
    },
    filterOptionTextActive: {
        color: '#fff',
    },
    filterActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    clearFilterButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    clearFilterText: {
        color: '#595959',
        fontWeight: '600',
    },
    applyFilterButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#1890ff',
    },
    applyFilterText: {
        color: '#fff',
        fontWeight: '600',
    },
    
    // Dialog
    dialogTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dialogTitleText: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    dialogInfoText: {
        fontSize: 14,
        color: '#595959',
        marginBottom: 8,
    },
    dialogInput: {
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        fontSize: 14,
        textAlignVertical: 'top',
        minHeight: 80,
    },
    
    // Load more
    loadMoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    loadMoreText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#1890ff',
    },
    loadMoreHint: {
        fontSize: 13,
        color: '#8c8c8c',
    },
});

export default ApplicationManagementScreen;

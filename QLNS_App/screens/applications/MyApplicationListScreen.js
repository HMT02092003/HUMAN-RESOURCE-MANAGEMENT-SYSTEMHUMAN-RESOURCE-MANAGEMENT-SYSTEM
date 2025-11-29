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

const MyApplicationListScreen = ({ navigation }) => {
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
    const [filterStatus, setFilterStatus] = useState(null); // null = all, 0 = pending, 1 = approved, 2 = rejected
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
            const response = await ApplicationService.getMyApplications({
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
        const s = normalizeStatus(status);
        return APPLICATION_STATUS_LABELS[s] || APPLICATION_STATUS_LABELS[String(s)] || 'Không xác định';
    };

    const getStatusColor = (status) => {
        const s = normalizeStatus(status);
        return APPLICATION_STATUS_COLORS[s] || APPLICATION_STATUS_COLORS[String(s)] || '#8c8c8c';
    };

    // Normalize status which may come as number, numeric-string, or named string
    const normalizeStatus = (status) => {
        if (status === null || status === undefined) return status;
        if (typeof status === 'number') return status;
        const s = String(status).toLowerCase().trim();
        if (s === '0' || s === 'pending' || s === 'chờ duyệt') return 0;
        if (s === '1' || s === 'approved' || s === 'đã duyệt' || s === 'approved') return 1;
        if (s === '2' || s === 'rejected' || s === 'từ chối') return 2;
        const n = parseInt(s, 10);
        if (!isNaN(n)) return n;
        return status;
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
        // Chỉ cho phép chọn đơn đang chờ duyệt
        const app = applications.find(a => a.id === id);
        if (app && app.status === 0) {
            setIsSelectionMode(true);
            setSelectedItems([id]);
        }
    };

    const toggleSelection = (id) => {
        const app = applications.find(a => a.id === id);
        if (app && app.status !== 0) return; // Chỉ cho chọn đơn pending
        
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

    // Edit handler - chỉ cho phép edit đơn pending
    const handleEdit = (item) => {
        if (item.status !== 0) {
            Alert.alert('Thông báo', 'Chỉ có thể chỉnh sửa đơn đang chờ duyệt');
            return;
        }
        // Navigate to edit screen based on application type
        const screenMap = {
            'leave': 'LeaveApplication',
            'overtime': 'OvertimeApplication',
            'business-trip': 'BusinessTripApplication',
            'forgot-check': 'ForgotCheckApplication',
            'resignation': 'ResignationApplication',
            'shift-registration': 'ShiftApplication',
        };
        const screenName = screenMap[item.type] || 'LeaveApplication';
        navigation.navigate(screenName, { 
            mode: 'edit', 
            applicationId: item.id,
            applicationData: item 
        });
    };

    // Delete handlers
    const handleDelete = (item) => {
        if (item.status !== 0) {
            Alert.alert('Thông báo', 'Chỉ có thể xóa đơn đang chờ duyệt');
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
        // Search filter
        const appReason = app.data?.reason || app.reason || '';
        const searchMatch = 
            getTypeLabel(app.type).toLowerCase().includes(searchText.toLowerCase()) ||
            appReason.toLowerCase().includes(searchText.toLowerCase());
        
        // Status filter
        const statusMatch = filterStatus === null || app.status === filterStatus;
        
        // Type filter
        const typeMatch = filterType === null || app.type === filterType;
        
        return searchMatch && statusMatch && typeMatch;
    });

    const clearFilters = () => {
        setFilterStatus(null);
        setFilterType(null);
        setFilterModalVisible(false);
    };

    const hasActiveFilters = filterStatus !== null || filterType !== null;

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
                            <Text style={styles.typeName} numberOfLines={1} ellipsizeMode="tail">{getTypeLabel(item.type)}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>
                        
                        {(item.reason || item.data?.reason) && (
                            <Text style={styles.reason} numberOfLines={2}>
                                Lý do: {item.reason || item.data?.reason}
                            </Text>
                        )}
                        
                        <View style={styles.metaRow}>
                            <Text style={styles.date}>
                                <Ionicons name="calendar-outline" size={12} color="#8c8c8c" /> {formatDate(item.applicationDate || item.created_at)}
                            </Text>
                            {item.approvedByInfo && (
                                <Text style={styles.approver}>
                                    <Ionicons name="person-outline" size={12} color="#8c8c8c" /> {item.approvedByInfo.fullName}
                                </Text>
                            )}
                        </View>
                    </View>
                    
                    {!isSelectionMode && (
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleViewDetail(item)}
                            >
                                <Ionicons name="eye-outline" size={20} color="#1890ff" />
                            </TouchableOpacity>
                            {isPending && (
                                <>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleEdit(item)}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#52c41a" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleDelete(item)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>
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
                                            style={[styles.detailStatusChip, { backgroundColor: getStatusColor(app.status)}]}
                                            textStyle={{ color: '#fff', fontWeight: '600' }}
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
                                                    <Text style={styles.detailValue}>{formatDate(app.data.date)}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>Loại</Text>
                                                    <Text style={styles.detailValue}>
                                                        {FORGOT_CHECK_TYPE_LABELS[app.data.checkType] || app.data.checkType}
                                                    </Text>
                                                </View>
                                            </>
                                        )}
                                    </>
                                )}
                                
                                {/* Note */}
                                {app.note && (
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailLabel}>Ghi chú</Text>
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
                                    Tất cả
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === 0 && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(0)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === 0 && styles.filterOptionTextActive]}>
                                    Chờ duyệt
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === 1 && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(1)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === 1 && styles.filterOptionTextActive]}>
                                    Đã duyệt
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterStatus === 2 && styles.filterOptionActive]}
                                onPress={() => setFilterStatus(2)}
                            >
                                <Text style={[styles.filterOptionText, filterStatus === 2 && styles.filterOptionTextActive]}>
                                    Từ chối
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
            {/* Search & Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm đơn từ..."
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
                        Tổng số: {filteredApplications.length} đơn từ
                    </Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate('SelectApplicationType')}
                    >
                        <Ionicons name="add-circle" size={24} color="#fff" />
                        <Text style={styles.addButtonText}>Tạo đơn</Text>
                    </TouchableOpacity>
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
                            {hasActiveFilters ? 'Không tìm thấy đơn từ phù hợp' : 'Bạn chưa có đơn từ nào'}
                        </Text>
                        <Text style={styles.emptySubText}>
                            {hasActiveFilters ? 'Thử thay đổi bộ lọc' : 'Tạo đơn từ đầu tiên của bạn'}
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

            {/* Delete Dialog */}
            <Portal>
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
                    <Dialog.Title>Xác nhận xóa</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>
                            Bạn có chắc chắn muốn xóa đơn "{getTypeLabel(deleteTarget?.type)}"?
                            Hành động này không thể hoàn tác.
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
                            Hành động này không thể hoàn tác.
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
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1890ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        marginLeft: 6,
        fontWeight: '600',
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
    },
    selectedCard: {
        backgroundColor: '#e6f7ff',
        borderWidth: 1,
        borderColor: '#1890ff',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    checkboxContainer: {
        marginRight: 12,
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
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    typeName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#262626',
        flex: 1,
        marginRight: 8,
        flexShrink: 1,
    },
    statusChip: {
        height: 26,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: 120,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
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
        marginRight: 16,
    },
    approver: {
        fontSize: 12,
        color: '#8c8c8c',
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
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
        maxHeight: '80%',
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
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

export default MyApplicationListScreen;

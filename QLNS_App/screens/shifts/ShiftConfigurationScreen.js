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
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal, Dialog, Button, Divider, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import ShiftService from '../../services/ShiftService';

const ShiftConfigurationScreen = ({ navigation }) => {
    const [configurations, setConfigurations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Create/Edit modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        start_time: new Date(),
        end_time: new Date(),
        working_unit: '1.0',
        description: '',
    });
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // Delete dialog
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Selection
    const [selectedItems, setSelectedItems] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const loadConfigurations = async () => {
        setLoading(true);
        try {
            const response = await ShiftService.getAllShiftConfigurations();
            const data = response?.data || [];
            setConfigurations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading configurations:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách cấu hình ca');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadConfigurations();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadConfigurations();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setRefreshing(true);
        loadConfigurations();
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

    const formatTime = (date) => {
        if (!date) return '-';
        if (typeof date === 'string') {
            return date.substring(0, 5);
        }
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const formatTimeForAPI = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}:00`;
    };

    const handleOpenModal = async (config = null) => {
        if (config) {
            try {
                setLoading(true);
                const response = await ShiftService.getShiftConfigurationById(config.id);
                const cfg = response?.data || config;
                setEditingConfig(cfg);
                setFormData({
                    name: cfg.name || '',
                    start_time: parseTimeString(cfg.start_time),
                    end_time: parseTimeString(cfg.end_time),
                    working_unit: cfg.working_unit?.toString() || '1.0',
                    description: cfg.description || '',
                });
            } catch (error) {
                console.error('Error loading config:', error);
                setEditingConfig(config);
                setFormData({
                    name: config.name || '',
                    start_time: parseTimeString(config.start_time),
                    end_time: parseTimeString(config.end_time),
                    working_unit: config.working_unit?.toString() || '1.0',
                    description: config.description || '',
                });
            } finally {
                setLoading(false);
            }
        } else {
            setEditingConfig(null);
            setFormData({
                name: '',
                start_time: new Date(),
                end_time: new Date(),
                working_unit: '1.0',
                description: '',
            });
        }
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setEditingConfig(null);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên ca');
            return;
        }

        try {
            setLoading(true);
            const data = {
                name: formData.name.trim(),
                start_time: formatTimeForAPI(formData.start_time),
                end_time: formatTimeForAPI(formData.end_time),
                working_unit: parseFloat(formData.working_unit) || 1.0,
                description: formData.description.trim(),
            };

            if (editingConfig) {
                await ShiftService.updateShiftConfiguration(editingConfig.id, data);
                Alert.alert('Thành công', 'Đã cập nhật cấu hình ca');
            } else {
                await ShiftService.createShiftConfiguration(data);
                Alert.alert('Thành công', 'Đã tạo cấu hình ca mới');
            }

            handleCloseModal();
            loadConfigurations();
        } catch (error) {
            console.error('Error saving config:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu cấu hình ca');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (item) => {
        setDeleteTarget(item);
        setDeleteDialogVisible(true);
    };

    const confirmDelete = async () => {
        setDeleteDialogVisible(false);
        if (!deleteTarget) return;

        try {
            setLoading(true);
            await ShiftService.deleteShiftConfiguration(deleteTarget.id);
            Alert.alert('Thành công', 'Đã xóa cấu hình ca');
            loadConfigurations();
        } catch (error) {
            console.error('Error deleting config:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa cấu hình ca');
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    };

    // Selection handlers
    const handleLongPress = (id) => {
        setIsSelectionMode(true);
        setSelectedItems([id]);
    };

    const toggleSelection = (id) => {
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

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;

        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa ${selectedItems.length} cấu hình ca?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await ShiftService.bulkDeleteShiftConfigurations(selectedItems);
                            Alert.alert('Thành công', 'Đã xóa các cấu hình ca');
                            cancelSelection();
                            loadConfigurations();
                        } catch (error) {
                            console.error('Error bulk deleting:', error);
                            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa các cấu hình');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleStartTimeChange = (event, date) => {
        setShowStartTimePicker(false);
        if (date) {
            setFormData({ ...formData, start_time: date });
        }
    };

    const handleEndTimeChange = (event, date) => {
        setShowEndTimePicker(false);
        if (date) {
            setFormData({ ...formData, end_time: date });
        }
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedItems.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => {
                    if (isSelectionMode) {
                        toggleSelection(item.id);
                    } else {
                        handleOpenModal(item);
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
                                color={isSelected ? '#1890ff' : '#666'}
                            />
                        </View>
                    )}

                    <View style={styles.iconContainer}>
                        <Ionicons name="time" size={24} color="#1890ff" />
                    </View>

                    <View style={styles.info}>
                        <Text style={styles.shiftName}>{item.name}</Text>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>
                                {formatTime(item.start_time)} - {formatTime(item.end_time)}
                            </Text>
                            <View style={[
                                styles.unitBadge,
                                parseFloat(item.working_unit) > 1 && styles.unitBadgeHigh
                            ]}>
                                <Text style={[
                                    styles.unitText,
                                    parseFloat(item.working_unit) > 1 && styles.unitTextHigh
                                ]}>
                                    x{item.working_unit}
                                </Text>
                            </View>
                        </View>
                        {item.description && (
                            <Text style={styles.description} numberOfLines={1}>
                                {item.description}
                            </Text>
                        )}
                    </View>

                    {!isSelectionMode && (
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleOpenModal(item)}
                            >
                                <Ionicons name="create-outline" size={20} color="#1890ff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDelete(item)}
                            >
                                <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderModal = () => (
        <Modal
            visible={modalVisible}
            transparent
            animationType="slide"
            onRequestClose={handleCloseModal}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingConfig ? 'Chỉnh sửa cấu hình ca' : 'Thêm cấu hình ca'}
                        </Text>
                        <IconButton
                            icon="close"
                            size={24}
                            onPress={handleCloseModal}
                        />
                    </View>
                    <Divider />

                    <ScrollView style={styles.modalBody}>
                        {/* Tên ca */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tên ca <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Nhập tên ca..."
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                            />
                        </View>

                        {/* Thời gian bắt đầu */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Thời gian bắt đầu <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.timeBox}
                                onPress={() => setShowStartTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color="#1890ff" />
                                <Text style={styles.timeBoxText}>{formatTime(formData.start_time)}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Thời gian kết thúc */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Thời gian kết thúc <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.timeBox}
                                onPress={() => setShowEndTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color="#1890ff" />
                                <Text style={styles.timeBoxText}>{formatTime(formData.end_time)}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Hệ số công */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Hệ số công</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1.0"
                                value={formData.working_unit}
                                onChangeText={(text) => setFormData({ ...formData, working_unit: text })}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        {/* Mô tả */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Mô tả</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Nhập mô tả..."
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCloseModal}
                        >
                            <Text style={styles.cancelButtonText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="save" size={18} color="#fff" />
                                    <Text style={styles.submitButtonText}>
                                        {editingConfig ? 'Cập nhật' : 'Tạo mới'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Time Pickers */}
            {showStartTimePicker && (
                <DateTimePicker
                    value={formData.start_time}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleStartTimeChange}
                />
            )}
            {showEndTimePicker && (
                <DateTimePicker
                    value={formData.end_time}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleEndTimeChange}
                />
            )}
        </Modal>
    );

    if (loading && configurations.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Bar */}
            {isSelectionMode ? (
                <View style={styles.selectionBar}>
                    <TouchableOpacity onPress={cancelSelection}>
                        <Text style={styles.cancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectedCount}>Đã chọn: {selectedItems.length}</Text>
                    <TouchableOpacity
                        style={styles.bulkDeleteButton}
                        onPress={handleBulkDelete}
                        disabled={selectedItems.length === 0}
                    >
                        <Ionicons name="trash" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.addBar}>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleOpenModal()}
                    >
                        <Ionicons name="add-circle" size={22} color="#fff" />
                        <Text style={styles.addButtonText}>Thêm cấu hình ca</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* List */}
            <FlatList
                data={configurations}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="settings-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Chưa có cấu hình ca nào</Text>
                        <Text style={styles.emptySubText}>Bấm "Thêm cấu hình ca" để tạo mới</Text>
                    </View>
                }
            />

            {/* Modal */}
            {renderModal()}

            {/* Delete Dialog */}
            <Portal>
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
                    <Dialog.Title>Xác nhận xóa</Dialog.Title>
                    <Dialog.Content>
                        <Text>
                            Bạn có chắc chắn muốn xóa cấu hình ca "{deleteTarget?.name}"?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>Hủy</Button>
                        <Button onPress={confirmDelete} textColor="#ff4d4f">Xóa</Button>
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

    // Add Bar
    addBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1890ff', paddingVertical: 12, borderRadius: 8 },
    addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 15 },

    // Selection
    selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e6f7ff', paddingHorizontal: 16, paddingVertical: 12 },
    cancelText: { color: '#1890ff', fontWeight: '600' },
    selectedCount: { color: '#1890ff', fontWeight: '600' },
    bulkDeleteButton: { backgroundColor: '#ff4d4f', padding: 8, borderRadius: 6 },

    // List
    listContainer: { padding: 12 },
    card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    selectedCard: { borderWidth: 2, borderColor: '#1890ff' },
    cardContent: { flexDirection: 'row', padding: 14, alignItems: 'center' },
    checkboxContainer: { marginRight: 10 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#e6f7ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    info: { flex: 1 },
    shiftName: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 14, color: '#1890ff', fontWeight: '500' },
    unitBadge: { marginLeft: 10, backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    unitBadgeHigh: { backgroundColor: '#fff7e6' },
    unitText: { fontSize: 12, color: '#8c8c8c' },
    unitTextHigh: { color: '#fa8c16', fontWeight: '600' },
    description: { fontSize: 13, color: '#8c8c8c', marginTop: 4 },
    actions: { flexDirection: 'row' },
    editButton: { padding: 8 },
    deleteButton: { padding: 8 },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#8c8c8c', marginTop: 16 },
    emptySubText: { fontSize: 13, color: '#bfbfbf', marginTop: 4 },

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
    input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    timeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12 },
    timeBoxText: { marginLeft: 10, fontSize: 15, color: '#262626' },
    textArea: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80 },
    cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9' },
    cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#595959' },
    submitButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: '#1890ff' },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 },
});

export default ShiftConfigurationScreen;

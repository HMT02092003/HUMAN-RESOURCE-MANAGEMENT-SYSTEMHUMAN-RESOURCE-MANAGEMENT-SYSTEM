import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Modal,
    TextInput,
    Platform,
    ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import api from '../../services/apiService';
import { ActivityIndicator, FAB } from 'react-native-paper';
import CheckPermission from '../../components/CheckPermission';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

const emptyForm = () => ({
    name: '',
    start_date: new Date(),
    end_date: new Date(),
    description: '',
    importance: 1,
});

const HolidayScreen = ({ navigation }) => {
    const [year, setYear] = useState(CURRENT_YEAR);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [submitting, setSubmitting] = useState(false);

    // Date pickers
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const loadHolidays = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/holidays', { params: { year } });
            const data = response.data?.data ?? response.data ?? [];
            setHolidays(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading holidays:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách ngày lễ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadHolidays(); }, [year]);

    useEffect(() => {
        const unsubscribe = navigation?.addListener?.('focus', () => loadHolidays());
        return unsubscribe;
    }, [navigation, year]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadHolidays();
        setRefreshing(false);
    }, [year]);

    const openCreateModal = () => {
        setEditingId(null);
        setForm(emptyForm());
        setModalVisible(true);
    };

    const openEditModal = (holiday) => {
        setEditingId(holiday.id);
        setForm({
            name: holiday.name || '',
            start_date: holiday.start_date ? new Date(holiday.start_date) : new Date(),
            end_date: holiday.end_date ? new Date(holiday.end_date) : new Date(),
            description: holiday.description || '',
            importance: holiday.importance ?? 1,
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập tên ngày lễ');
            return;
        }
        if (form.start_date > form.end_date) {
            Alert.alert('Thông báo', 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
            return;
        }
        const payload = {
            name: form.name.trim(),
            start_date: dayjs(form.start_date).format('YYYY-MM-DD'),
            end_date: dayjs(form.end_date).format('YYYY-MM-DD'),
            description: form.description.trim(),
            importance: Number(form.importance) || 1,
        };
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/attendance/holidays/${editingId}`, payload);
                Alert.alert('Thành công', 'Cập nhật ngày lễ thành công!');
            } else {
                await api.post('/attendance/holidays', payload);
                Alert.alert('Thành công', 'Tạo ngày lễ thành công!');
            }
            setModalVisible(false);
            loadHolidays();
        } catch (error) {
            const msg =
                error?.response?.data?.message || error?.message || 'Lưu thất bại';
            Alert.alert('Lỗi', msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (holiday) => {
        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa ngày lễ "${holiday.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/attendance/holidays/${holiday.id}`);
                            loadHolidays();
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể xóa ngày lễ');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return dayjs(dateStr).format('DD/MM/YYYY');
    };

    const getImportanceInfo = (importance) => {
        const map = {
            1: { label: 'Thấp', color: '#52c41a' },
            2: { label: 'Trung bình', color: '#fa8c16' },
            3: { label: 'Cao', color: '#f5222d' },
        };
        return map[importance] || { label: `Cấp ${importance}`, color: '#1890ff' };
    };

    const renderHolidayItem = ({ item }) => {
        const imp = getImportanceInfo(item.importance);
        const days = dayjs(item.end_date).diff(dayjs(item.start_date), 'day') + 1;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                        <MaterialCommunityIcons name="calendar-star" size={20} color="#1890ff" />
                        <Text style={styles.cardTitle}>{item.name}</Text>
                    </View>
                    <View style={[styles.importanceBadge, { backgroundColor: imp.color + '20', borderColor: imp.color }]}>
                        <Text style={[styles.importanceText, { color: imp.color }]}>{imp.label}</Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <MaterialCommunityIcons name="calendar-range" size={16} color="#595959" />
                    <Text style={styles.dateText}>
                        {formatDate(item.start_date)} — {formatDate(item.end_date)}
                        {' '}
                        <Text style={styles.daysCount}>({days} ngày)</Text>
                    </Text>
                </View>

                {item.description ? (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                <View style={styles.cardActions}>
                    <CheckPermission permissionKey="holidays" requiredType="update">
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => openEditModal(item)}
                        >
                            <MaterialCommunityIcons name="pencil" size={16} color="#1890ff" />
                            <Text style={styles.editBtnText}>Sửa</Text>
                        </TouchableOpacity>
                    </CheckPermission>
                    <CheckPermission permissionKey="holidays" requiredType="delete">
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item)}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ff4d4f" />
                            <Text style={styles.deleteBtnText}>Xóa</Text>
                        </TouchableOpacity>
                    </CheckPermission>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Year selector */}
            <View style={styles.yearBar}>
                <Text style={styles.yearLabel}>Năm:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScrollView}>
                    {YEARS.map((y) => (
                        <TouchableOpacity
                            key={y}
                            style={[styles.yearChip, y === year && styles.yearChipActive]}
                            onPress={() => setYear(y)}
                        >
                            <Text style={[styles.yearChipText, y === year && styles.yearChipTextActive]}>
                                {y}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            {loading && !refreshing ? (
                <View style={styles.centerView}>
                    <ActivityIndicator size="large" color="#1890ff" />
                </View>
            ) : (
                <FlatList
                    data={holidays}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderHolidayItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyView}>
                            <MaterialCommunityIcons name="calendar-remove" size={60} color="#d9d9d9" />
                            <Text style={styles.emptyText}>Không có ngày lễ nào trong năm {year}</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <CheckPermission permissionKey="holidays" requiredType="create">
                <FAB
                    icon="plus"
                    style={styles.fab}
                    color="#fff"
                    onPress={openCreateModal}
                />
            </CheckPermission>

            {/* Create/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingId ? 'Chỉnh sửa ngày lễ' : 'Tạo ngày lễ mới'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#262626" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Name */}
                            <Text style={styles.fieldLabel}>Tên ngày lễ <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="VD: Tết Nguyên Đán"
                                value={form.name}
                                onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
                            />

                            {/* Start date */}
                            <Text style={styles.fieldLabel}>Ngày bắt đầu <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.dateField}
                                onPress={() => setShowStartPicker(true)}
                            >
                                <MaterialCommunityIcons name="calendar" size={18} color="#1890ff" />
                                <Text style={styles.dateFieldText}>
                                    {dayjs(form.start_date).format('DD/MM/YYYY')}
                                </Text>
                            </TouchableOpacity>
                            {showStartPicker && (
                                <DateTimePicker
                                    value={form.start_date}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                        setShowStartPicker(Platform.OS === 'ios');
                                        if (selectedDate) {
                                            setForm((f) => ({ ...f, start_date: selectedDate }));
                                        }
                                    }}
                                />
                            )}

                            {/* End date */}
                            <Text style={styles.fieldLabel}>Ngày kết thúc <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.dateField}
                                onPress={() => setShowEndPicker(true)}
                            >
                                <MaterialCommunityIcons name="calendar" size={18} color="#1890ff" />
                                <Text style={styles.dateFieldText}>
                                    {dayjs(form.end_date).format('DD/MM/YYYY')}
                                </Text>
                            </TouchableOpacity>
                            {showEndPicker && (
                                <DateTimePicker
                                    value={form.end_date}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                        setShowEndPicker(Platform.OS === 'ios');
                                        if (selectedDate) {
                                            setForm((f) => ({ ...f, end_date: selectedDate }));
                                        }
                                    }}
                                />
                            )}

                            {/* Description */}
                            <Text style={styles.fieldLabel}>Mô tả</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                placeholder="Mô tả về ngày lễ..."
                                value={form.description}
                                onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
                                multiline
                                numberOfLines={3}
                            />

                            {/* Importance */}
                            <Text style={styles.fieldLabel}>Mức độ quan trọng</Text>
                            <View style={styles.importanceRow}>
                                {[1, 2, 3].map((val) => {
                                    const info = getImportanceInfo(val);
                                    return (
                                        <TouchableOpacity
                                            key={val}
                                            style={[
                                                styles.importanceBtn,
                                                form.importance === val && {
                                                    backgroundColor: info.color,
                                                    borderColor: info.color,
                                                },
                                            ]}
                                            onPress={() => setForm((f) => ({ ...f, importance: val }))}
                                        >
                                            <Text
                                                style={[
                                                    styles.importanceBtnText,
                                                    form.importance === val && { color: '#fff' },
                                                ]}
                                            >
                                                {info.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Action buttons */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setModalVisible(false)}
                                disabled={submitting}
                            >
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveBtnText}>
                                        {editingId ? 'Cập nhật' : 'Tạo mới'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    yearBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },
    yearLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#262626',
    },
    yearScrollView: {
        flexDirection: 'row',
    },
    yearChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: '#f0f0f0',
    },
    yearChipActive: {
        backgroundColor: '#1890ff',
    },
    yearChipText: {
        fontSize: 14,
        color: '#595959',
        fontWeight: '500',
    },
    yearChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    centerView: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
    },
    card: {
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#262626',
        flex: 1,
    },
    importanceBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderWidth: 1,
        marginLeft: 8,
    },
    importanceText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 13,
        color: '#595959',
    },
    daysCount: {
        color: '#1890ff',
        fontWeight: '500',
    },
    descriptionText: {
        fontSize: 13,
        color: '#8c8c8c',
        marginBottom: 12,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#e6f4ff',
    },
    editBtnText: {
        color: '#1890ff',
        fontSize: 13,
        fontWeight: '500',
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#fff1f0',
    },
    deleteBtnText: {
        color: '#ff4d4f',
        fontSize: 13,
        fontWeight: '500',
    },
    emptyView: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        gap: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#8c8c8c',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        backgroundColor: '#1890ff',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#262626',
    },
    modalBody: {
        padding: 20,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#595959',
        marginBottom: 6,
        marginTop: 12,
    },
    required: {
        color: '#ff4d4f',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#262626',
        backgroundColor: '#fafafa',
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fafafa',
    },
    dateFieldText: {
        fontSize: 14,
        color: '#262626',
    },
    importanceRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    importanceBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        backgroundColor: '#fafafa',
    },
    importanceBtnText: {
        fontSize: 13,
        color: '#595959',
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cancelBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    cancelBtnText: {
        fontSize: 15,
        color: '#595959',
        fontWeight: '500',
    },
    saveBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#1890ff',
    },
    saveBtnDisabled: {
        backgroundColor: '#91caff',
    },
    saveBtnText: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '600',
    },
});

export default HolidayScreen;


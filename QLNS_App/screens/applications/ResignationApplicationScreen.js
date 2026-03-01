import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    Platform,
    Modal,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import ApplicationService from '../../services/ApplicationService';
import UserService from '../../services/UserService';
import DetailViewScreen from '../../components/DetailViewScreen';

const RESIGNATION_REASONS = [
    { value: 'personal', label: 'Lý do cá nhân' },
    { value: 'health', label: 'Lý do sức khỏe' },
    { value: 'family', label: 'Lý do gia đình' },
    { value: 'career', label: 'Cơ hội nghề nghiệp khác' },
    { value: 'relocation', label: 'Chuyển nơi ở' },
    { value: 'study', label: 'Tiếp tục học tập' },
    { value: 'other', label: 'Lý do khác' },
];

const ResignationApplicationScreen = ({ navigation, route }) => {
    const { mode = 'create', applicationId, applicationData } = route.params || {};
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'view';

    // Form state
    const [lastWorkingDate, setLastWorkingDate] = useState(
        dayjs().add(30, 'day').toDate()
    );
    const [resignationReason, setResignationReason] = useState('');
    const [reasonDetail, setReasonDetail] = useState('');
    const [handoverTo, setHandoverTo] = useState(null);
    const [handoverNotes, setHandoverNotes] = useState('');
    
    // Picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showReasonPicker, setShowReasonPicker] = useState(false);
    const [showEmployeePicker, setShowEmployeePicker] = useState(false);
    
    // Data state
    const [employees, setEmployees] = useState([]);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [applicationFullData, setApplicationFullData] = useState(null);

    useEffect(() => {
        console.log('🔄 [ResignationApp] Mode:', mode, 'ApplicationId:', applicationId);
        loadEmployees();
        if ((isEditMode || isViewMode) && applicationId) {
            console.log('📥 [ResignationApp] Loading data for edit/view');
            loadApplicationData();
        } else if (!isEditMode && !isViewMode) {
            // Reset form to defaults when in create mode
            console.log('🆕 [ResignationApp] CREATE MODE - Resetting form to defaults');
            setApplicationFullData(null);
            setLastWorkingDate(dayjs().add(30, 'day').toDate());
            setResignationReason('');
            setReasonDetail('');
            setHandoverTo(null);
            setHandoverNotes('');
        }
    }, [isEditMode, isViewMode, applicationId]);

    const loadEmployees = async () => {
        try {
            const response = await UserService.getUsers({ status: 'active' });
            const data = response?.data?.data || response?.data || [];
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const loadApplicationData = async () => {
        setLoading(true);
        try {
            const response = await ApplicationService.getApplicationById(applicationId);
            const data = response?.data || response;
            setApplicationFullData(data);
            const formData = data?.data || data;
            
            if (formData) {
                setResignationReason(formData.resignationReason || '');
                setReasonDetail(formData.reasonDetail || '');
                setHandoverNotes(formData.handoverNotes || '');
                
                if (formData.lastWorkingDate) {
                    setLastWorkingDate(new Date(formData.lastWorkingDate));
                }
                if (formData.handoverTo) {
                    const emp = employees.find(e => e.id === formData.handoverTo);
                    setHandoverTo(emp || { id: formData.handoverTo, fullName: formData.handoverToName });
                }
            }
        } catch (error) {
            console.error('Error loading application:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin đơn từ');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => dayjs(date).format('DD/MM/YYYY');

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setLastWorkingDate(selectedDate);
        }
    };

    const getSelectedReasonLabel = () => {
        const reason = RESIGNATION_REASONS.find(r => r.value === resignationReason);
        return reason ? reason.label : 'Chọn lý do...';
    };

    const calculateNoticeDays = () => {
        const today = dayjs().startOf('day');
        const lastDay = dayjs(lastWorkingDate).startOf('day');
        return lastDay.diff(today, 'day');
    };

    const validateForm = () => {
        if (!resignationReason) {
            Alert.alert('Lỗi', 'Vui lòng chọn lý do nghỉ việc');
            return false;
        }
        
        const noticeDays = calculateNoticeDays();
        if (noticeDays < 30) {
            Alert.alert(
                'Cảnh báo',
                `Theo quy định, bạn cần thông báo trước ít nhất 30 ngày. Hiện tại bạn chỉ thông báo trước ${noticeDays} ngày. Bạn có muốn tiếp tục?`,
                [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Tiếp tục', onPress: () => submitForm() }
                ]
            );
            return false;
        }
        return true;
    };

    const submitForm = async () => {
        setSubmitting(true);
        try {
            const payload = {
                type: 'resignation',
                data: {
                    lastWorkingDate: dayjs(lastWorkingDate).format('YYYY-MM-DD'),
                    resignationReason,
                    reasonDetail: reasonDetail.trim(),
                    handoverTo: handoverTo?.id || null,
                    handoverToName: handoverTo?.fullName || null,
                    handoverNotes: handoverNotes.trim(),
                },
            };

            if (isEditMode) {
                await ApplicationService.updateApplication(applicationId, { data: payload.data });
                Alert.alert('Thành công', 'Đã cập nhật đơn nghỉ việc', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await ApplicationService.createApplication(payload);
                Alert.alert('Thành công', 'Đã gửi đơn nghỉ việc', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu đơn từ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        await submitForm();
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    // View mode - Display read-only detail view
    if (isViewMode && applicationFullData) {
        const appData = applicationFullData.data || {};
        const STATUS_LABELS = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Từ chối' };
        const STATUS_COLORS = { 0: '#fa8c16', 1: '#52c41a', 2: '#ff4d4f' };

        const sections = [
            {
                title: 'Thông tin thôi việc',
                icon: 'exit-run',
                fields: [
                    { label: 'Ngày làm việc cuối', value: appData.lastWorkingDate, type: 'date', icon: 'calendar-end' },
                    {
                        label: 'Lý do thôi việc',
                        value: RESIGNATION_REASONS.find(r => r.value === appData.resignationReason)?.label || appData.resignationReason || 'N/A',
                        icon: 'tag-outline'
                    },
                    { label: 'Chi tiết', value: appData.reasonDetail || 'N/A', icon: 'text' }
                ]
            },
            {
                title: 'Bàn giao công việc',
                icon: 'account-switch',
                fields: [
                    {
                        label: 'Người nhận bàn giao',
                        value: appData.handoverToName || handoverTo?.fullName || 'Chưa xác định',
                        icon: 'account-arrow-right'
                    },
                    { label: 'Ghi chú bàn giao', value: appData.handoverNotes || 'Không có', icon: 'note-text' }
                ]
            },
            {
                title: 'Trạng thái & Phê duyệt',
                icon: 'information-outline',
                fields: [
                    {
                        label: 'Trạng thái',
                        value: STATUS_LABELS[applicationFullData.status] || 'N/A',
                        type: 'chip',
                        chipStyle: { backgroundColor: STATUS_COLORS[applicationFullData.status] + '20' },
                        chipTextStyle: { color: STATUS_COLORS[applicationFullData.status], fontWeight: '600' },
                        icon: 'checkbox-marked-circle-outline'
                    },
                    ...(applicationFullData.approvedByInfo ? [{
                        label: 'Người duyệt',
                        value: applicationFullData.approvedByInfo.fullName,
                        icon: 'account-check'
                    }] : []),
                    ...(applicationFullData.approvedDate ? [{
                        label: 'Ngày duyệt',
                        value: applicationFullData.approvedDate,
                        type: 'datetime',
                        icon: 'calendar-check'
                    }] : []),
                    ...(appData.rejectReason ? [{
                        label: 'Lý do từ chối',
                        value: appData.rejectReason,
                        icon: 'close-circle-outline',
                        valueStyle: { color: '#ff4d4f' }
                    }] : []),
                    { label: 'Ngày tạo', value: applicationFullData.created_at, type: 'datetime', icon: 'calendar-plus' }
                ]
            }
        ];

        const actions = [
            ...(applicationFullData.status === 0 ? [{
                label: 'Chỉnh sửa đơn',
                icon: 'pencil',
                color: '#1890ff',
                mode: 'contained',
                onPress: () => navigation.replace('ResignationApplication', { mode: 'edit', applicationId })
            }] : [])
        ];

        return (
            <DetailViewScreen
                title="Chi tiết đơn thôi việc"
                sections={sections}
                actions={actions}
                loading={loading}
                onBack={() => navigation.goBack()}
            />
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#262626" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditMode ? 'Chỉnh sửa đơn' : 'Đơn xin nghỉ việc'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Cảnh báo */}
                <View style={styles.warningBox}>
                    <Ionicons name="warning" size={24} color="#fa541c" />
                    <View style={styles.warningContent}>
                        <Text style={styles.warningTitle}>Lưu ý quan trọng</Text>
                        <Text style={styles.warningText}>
                            Đơn xin nghỉ việc cần thông báo trước ít nhất 30 ngày theo quy định.
                        </Text>
                    </View>
                </View>

                {/* Ngày làm việc cuối */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Ngày làm việc cuối cùng <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(lastWorkingDate)}</Text>
                    </TouchableOpacity>
                    <Text style={styles.hint}>
                        Thông báo trước: <Text style={{ fontWeight: '700' }}>{calculateNoticeDays()} ngày</Text>
                    </Text>
                </View>

                {/* Lý do nghỉ việc */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Lý do nghỉ việc <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setShowReasonPicker(true)}>
                        <Text style={[styles.selectText, !resignationReason && styles.placeholder]}>
                            {getSelectedReasonLabel()}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#8c8c8c" />
                    </TouchableOpacity>
                </View>

                {/* Chi tiết lý do */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Chi tiết lý do</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Mô tả chi tiết lý do nghỉ việc (không bắt buộc)..."
                        value={reasonDetail}
                        onChangeText={setReasonDetail}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* Bàn giao cho */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Bàn giao công việc cho</Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setShowEmployeePicker(true)}>
                        <Text style={[styles.selectText, !handoverTo && styles.placeholder]}>
                            {handoverTo ? handoverTo.fullName : 'Chọn nhân viên...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#8c8c8c" />
                    </TouchableOpacity>
                </View>

                {/* Ghi chú bàn giao */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Ghi chú bàn giao</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Ghi chú về công việc cần bàn giao..."
                        value={handoverNotes}
                        onChangeText={setHandoverNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.submitButtonText}>
                                {isEditMode ? 'Cập nhật' : 'Gửi đơn'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={lastWorkingDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}

            {/* Reason Picker Modal */}
            <Modal visible={showReasonPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn lý do nghỉ việc</Text>
                            <TouchableOpacity onPress={() => setShowReasonPicker(false)}>
                                <Ionicons name="close" size={24} color="#262626" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={RESIGNATION_REASONS}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        resignationReason === item.value && styles.optionItemSelected
                                    ]}
                                    onPress={() => {
                                        setResignationReason(item.value);
                                        setShowReasonPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        resignationReason === item.value && styles.optionTextSelected
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {resignationReason === item.value && (
                                        <Ionicons name="checkmark" size={20} color="#1890ff" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Employee Picker Modal */}
            <Modal visible={showEmployeePicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn nhân viên bàn giao</Text>
                            <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                                <Ionicons name="close" size={24} color="#262626" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={employees}
                            keyExtractor={(item) => item.id?.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        handoverTo?.id === item.id && styles.optionItemSelected
                                    ]}
                                    onPress={() => {
                                        setHandoverTo(item);
                                        setShowEmployeePicker(false);
                                    }}
                                >
                                    <View>
                                        <Text style={[
                                            styles.optionText,
                                            handoverTo?.id === item.id && styles.optionTextSelected
                                        ]}>
                                            {item.fullName}
                                        </Text>
                                        <Text style={styles.optionSubtext}>{item.email}</Text>
                                    </View>
                                    {handoverTo?.id === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#1890ff" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>Không có nhân viên</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
    loadingText: { marginTop: 12, color: '#8c8c8c' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#262626' },
    placeholder: { width: 40 },
    content: { flex: 1, padding: 16 },
    warningBox: {
        flexDirection: 'row', backgroundColor: '#fff7e6', borderRadius: 8,
        padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#ffd591',
    },
    warningContent: { flex: 1, marginLeft: 12 },
    warningTitle: { fontSize: 15, fontWeight: '600', color: '#fa541c', marginBottom: 4 },
    warningText: { fontSize: 13, color: '#d46b08', lineHeight: 20 },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#262626', marginBottom: 8 },
    required: { color: '#ff4d4f' },
    hint: { marginTop: 6, fontSize: 13, color: '#8c8c8c' },
    dateBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    dateIcon: { marginRight: 10 },
    dateText: { fontSize: 15, color: '#262626' },
    selectBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    selectText: { fontSize: 15, color: '#262626' },
    textArea: {
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80,
    },
    footer: {
        flexDirection: 'row', padding: 16, backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#f0f0f0',
    },
    cancelButton: {
        flex: 1, paddingVertical: 12, alignItems: 'center', marginRight: 10,
        borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
    },
    cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#595959' },
    submitButton: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 8, backgroundColor: '#fa541c',
    },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
        maxHeight: '60%', paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    modalTitle: { fontSize: 16, fontWeight: '600', color: '#262626' },
    optionItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    optionItemSelected: { backgroundColor: '#e6f7ff' },
    optionText: { fontSize: 15, color: '#262626' },
    optionTextSelected: { color: '#1890ff', fontWeight: '600' },
    optionSubtext: { fontSize: 12, color: '#8c8c8c', marginTop: 2 },
    emptyText: { textAlign: 'center', padding: 20, color: '#8c8c8c' },
});

export default ResignationApplicationScreen;

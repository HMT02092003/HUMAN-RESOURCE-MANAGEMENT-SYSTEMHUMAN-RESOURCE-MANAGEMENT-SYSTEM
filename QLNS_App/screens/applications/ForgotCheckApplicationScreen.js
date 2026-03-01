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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import ApplicationService, { FORGOT_CHECK_TYPE_LABELS } from '../../services/ApplicationService';
import DetailViewScreen from '../../components/DetailViewScreen';

const FORGOT_CHECK_TYPES = [
    { value: 'check-in', label: 'Quên check in' },
    { value: 'check-out', label: 'Quên check out' },
];

const ForgotCheckApplicationScreen = ({ navigation, route }) => {
    const { mode = 'create', applicationId, applicationData } = route.params || {};
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'view';

    // Form state
    const [forgotDate, setForgotDate] = useState(new Date());
    const [forgotTime, setForgotTime] = useState(new Date());
    const [forgotType, setForgotType] = useState('check-in');
    const [reason, setReason] = useState('');
    
    // Picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [applicationFullData, setApplicationFullData] = useState(null);

    useEffect(() => {
        console.log('🔄 [ForgotCheckApp] Mode:', mode, 'ApplicationId:', applicationId);
        if ((isEditMode || isViewMode) && applicationId) {
            console.log('📥 [ForgotCheckApp] Loading data for edit/view');
            loadApplicationData();
        } else if (!isEditMode && !isViewMode) {
            // Reset form to defaults when in create mode
            console.log('🆕 [ForgotCheckApp] CREATE MODE - Resetting form to defaults');
            setApplicationFullData(null);
            setForgotDate(new Date());
            setForgotTime(new Date());
            setForgotType('check-in');
            setReason('');
        }
    }, [isEditMode, isViewMode, applicationId]);

    const loadApplicationData = async () => {
        setLoading(true);
        try {
            const response = await ApplicationService.getApplicationById(applicationId);
            const data = response?.data || response;
            setApplicationFullData(data);
            const formData = data?.data || data;
            
            if (formData) {
                setReason(formData.reason || '');
                setForgotType(formData.forgotType || 'check-in');
                
                if (formData.forgotDate) {
                    setForgotDate(new Date(formData.forgotDate));
                }
                if (formData.forgotTime) {
                    const [hours, minutes] = formData.forgotTime.split(':');
                    const time = new Date();
                    time.setHours(parseInt(hours), parseInt(minutes));
                    setForgotTime(time);
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
    const formatTime = (date) => dayjs(date).format('HH:mm');

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setForgotDate(selectedDate);
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            setForgotTime(selectedTime);
        }
    };

    const validateForm = () => {
        if (!reason.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập lý do quên chấm công');
            return false;
        }
        
        // Kiểm tra ngày quên check không quá 3 ngày trước
        const threeDaysAgo = dayjs().subtract(3, 'day');
        if (dayjs(forgotDate).isBefore(threeDaysAgo, 'day')) {
            Alert.alert('Lỗi', 'Đã quá thời hạn làm đơn quên chấm công (tối đa 3 ngày)');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        setSubmitting(true);
        try {
            const payload = {
                type: 'forgot-check',
                data: {
                    forgotDate: dayjs(forgotDate).format('YYYY-MM-DD'),
                    forgotTime: formatTime(forgotTime),
                    forgotType,
                    reason: reason.trim(),
                },
            };

            if (isEditMode) {
                await ApplicationService.updateApplication(applicationId, { data: payload.data });
                Alert.alert('Thành công', 'Đã cập nhật đơn quên chấm công', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await ApplicationService.createApplication(payload);
                Alert.alert('Thành công', 'Đã tạo đơn quên chấm công', [
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
                title: 'Thông tin quên chấm công',
                icon: 'alarm',
                fields: [
                    { 
                        label: 'Loại', 
                        value: FORGOT_CHECK_TYPES.find(t => t.value === appData.forgotType)?.label || 'N/A',
                        icon: 'tag-outline' 
                    },
                    { label: 'Ngày quên', value: appData.forgotDate, type: 'date', icon: 'calendar' },
                    { label: 'Giờ quên chấm', value: appData.forgotTime, icon: 'clock-time-three-outline' },
                    { label: 'Lý do', value: appData.reason || 'N/A', icon: 'text' }
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
                onPress: () => navigation.replace('ForgotCheckApplication', { mode: 'edit', applicationId })
            }] : [])
        ];

        return (
            <DetailViewScreen
                title="Chi tiết đơn quên chấm công"
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
                    {isEditMode ? 'Chỉnh sửa đơn' : 'Quên check in/out'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Loại quên check */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Loại <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setShowTypeModal(true)}>
                        <Text style={styles.selectText}>
                            {FORGOT_CHECK_TYPES.find(t => t.value === forgotType)?.label}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#8c8c8c" />
                    </TouchableOpacity>
                </View>

                {/* Ngày quên check */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Ngày <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(forgotDate)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Giờ quên check */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>
                        Giờ {forgotType === 'check-in' ? 'vào' : 'ra'} thực tế <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowTimePicker(true)}>
                        <Ionicons name="time-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatTime(forgotTime)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Lý do */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Lý do <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Nhập lý do quên chấm công..."
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Hướng dẫn */}
                <View style={styles.guideBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#eb2f96" />
                    <Text style={styles.guideText}>
                        Đơn quên chấm công chỉ được gửi trong vòng 3 ngày kể từ ngày quên. 
                        Vui lòng cung cấp lý do chính đáng.
                    </Text>
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
                    value={forgotDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)}
                />
            )}

            {/* Time Picker */}
            {showTimePicker && (
                <DateTimePicker
                    value={forgotTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                />
            )}

            {/* Type Selection Modal */}
            {showTypeModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn loại</Text>
                            <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                                <Ionicons name="close" size={24} color="#262626" />
                            </TouchableOpacity>
                        </View>
                        {FORGOT_CHECK_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.value}
                                style={[styles.modalOption, forgotType === type.value && styles.modalOptionActive]}
                                onPress={() => {
                                    setForgotType(type.value);
                                    setShowTypeModal(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, forgotType === type.value && styles.modalOptionTextActive]}>
                                    {type.label}
                                </Text>
                                {forgotType === type.value && (
                                    <Ionicons name="checkmark" size={20} color="#1890ff" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
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
    formGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#262626', marginBottom: 8 },
    required: { color: '#ff4d4f' },
    selectBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    selectText: { fontSize: 15, color: '#262626' },
    dateBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    dateIcon: { marginRight: 10 },
    dateText: { fontSize: 15, color: '#262626' },
    textArea: {
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100,
    },
    guideBox: {
        flexDirection: 'row', backgroundColor: '#fff0f6', borderRadius: 8,
        padding: 12, marginTop: 10, alignItems: 'flex-start',
    },
    guideText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#eb2f96', lineHeight: 20 },
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
        paddingVertical: 12, borderRadius: 8, backgroundColor: '#1890ff',
    },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 },
    modalOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    modalTitle: { fontSize: 16, fontWeight: '600', color: '#262626' },
    modalOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    modalOptionActive: { backgroundColor: '#e6f7ff' },
    modalOptionText: { fontSize: 15, color: '#262626' },
    modalOptionTextActive: { color: '#1890ff', fontWeight: '600' },
});

export default ForgotCheckApplicationScreen;

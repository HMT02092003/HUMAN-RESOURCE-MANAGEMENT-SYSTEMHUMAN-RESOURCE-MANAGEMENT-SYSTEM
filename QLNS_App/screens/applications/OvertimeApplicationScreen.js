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
import ApplicationService from '../../services/ApplicationService';
import DetailViewScreen from '../../components/DetailViewScreen';

const OVERTIME_HOURS_OPTIONS = [
    { value: 2, label: '2 giờ' },
    { value: 3, label: '3 giờ' },
    { value: 4, label: '4 giờ' },
];

const OvertimeApplicationScreen = ({ navigation, route }) => {
    const { mode = 'create', applicationId, applicationData } = route.params || {};
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'view';

    // Form state
    const [overtimeDate, setOvertimeDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [overtimeHours, setOvertimeHours] = useState(2);
    const [reason, setReason] = useState('');
    
    // Picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showHoursModal, setShowHoursModal] = useState(false);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [applicationFullData, setApplicationFullData] = useState(null);

    useEffect(() => {
        console.log('🔄 [OvertimeApp] Mode:', mode, 'ApplicationId:', applicationId);
        if ((isEditMode || isViewMode) && applicationId) {
            console.log('📥 [OvertimeApp] Loading data for edit/view');
            loadApplicationData();
        } else if (!isEditMode && !isViewMode) {
            // Reset form to defaults when in create mode
            console.log('🆕 [OvertimeApp] CREATE MODE - Resetting form to defaults');
            setApplicationFullData(null);
            setOvertimeDate(new Date());
            setStartTime(new Date());
            setOvertimeHours(2);
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
                setOvertimeHours(formData.overtimeHours || 2);
                
                if (formData.overtimeDate) {
                    setOvertimeDate(new Date(formData.overtimeDate));
                }
                if (formData.startTime) {
                    const [hours, minutes] = formData.startTime.split(':');
                    const time = new Date();
                    time.setHours(parseInt(hours), parseInt(minutes));
                    setStartTime(time);
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

    const calculateEndTime = () => {
        const endTime = dayjs(startTime).add(overtimeHours, 'hour');
        return endTime.format('HH:mm');
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setOvertimeDate(selectedDate);
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            setStartTime(selectedTime);
        }
    };

    const validateForm = () => {
        if (!reason.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập lý do làm thêm giờ');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        setSubmitting(true);
        try {
            const payload = {
                type: 'overtime',
                data: {
                    overtimeDate: dayjs(overtimeDate).format('YYYY-MM-DD'),
                    startTime: formatTime(startTime),
                    overtimeHours,
                    reason: reason.trim(),
                },
            };

            if (isEditMode) {
                await ApplicationService.updateApplication(applicationId, { data: payload.data });
                Alert.alert('Thành công', 'Đã cập nhật đơn làm thêm giờ', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await ApplicationService.createApplication(payload);
                Alert.alert('Thành công', 'Đã tạo đơn làm thêm giờ', [
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
                title: 'Thông tin làm thêm giờ',
                icon: 'clock-plus-outline',
                fields: [
                    { label: 'Ngày làm thêm', value: appData.overtimeDate, type: 'date', icon: 'calendar' },
                    { label: 'Giờ bắt đầu', value: appData.startTime, icon: 'clock-time-three-outline' },
                    { label: 'Số giờ làm thêm', value: `${appData.overtimeHours || 0} giờ`, icon: 'timer-outline' },
                    { label: 'Giờ kết thúc (dự kiến)', value: calculateEndTime(), icon: 'clock-end' },
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
                onPress: () => navigation.replace('OvertimeApplication', { mode: 'edit', applicationId })
            }] : [])
        ];

        return (
            <DetailViewScreen
                title="Chi tiết đơn làm thêm giờ"
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
                    {isEditMode ? 'Chỉnh sửa đơn tăng ca' : 'Tạo đơn làm thêm giờ'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Ngày tăng ca */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Ngày tăng ca <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(overtimeDate)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Giờ bắt đầu */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Giờ bắt đầu <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowTimePicker(true)}>
                        <Ionicons name="time-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatTime(startTime)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Số giờ tăng ca */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Số giờ tăng ca <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.selectBox} onPress={() => setShowHoursModal(true)}>
                        <Text style={styles.selectText}>{overtimeHours} giờ</Text>
                        <Ionicons name="chevron-down" size={20} color="#8c8c8c" />
                    </TouchableOpacity>
                </View>

                {/* Giờ kết thúc (tự động tính) */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Giờ kết thúc (dự kiến)</Text>
                    <View style={[styles.dateBox, { backgroundColor: '#f5f5f5' }]}>
                        <Ionicons name="time-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={[styles.dateText, { color: '#1890ff', fontWeight: '600' }]}>
                            {calculateEndTime()}
                        </Text>
                    </View>
                </View>

                {/* Thông tin tóm tắt */}
                <View style={styles.summaryBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#1890ff" />
                    <Text style={styles.summaryText}>
                        Bạn đăng ký làm thêm {overtimeHours} giờ vào ngày {formatDate(overtimeDate)}, 
                        từ {formatTime(startTime)} đến {calculateEndTime()}.
                    </Text>
                </View>

                {/* Lý do */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Lý do <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Nhập lý do làm thêm giờ..."
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Hướng dẫn */}
                <View style={styles.guideBox}>
                    <Ionicons name="bulb-outline" size={20} color="#fa8c16" />
                    <Text style={styles.guideText}>
                        Đơn làm thêm giờ cần được gửi trước ngày làm thêm. Giờ làm thêm không được nằm trong giờ hành chính.
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
                    value={overtimeDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}

            {/* Time Picker */}
            {showTimePicker && (
                <DateTimePicker
                    value={startTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                />
            )}

            {/* Hours Selection Modal */}
            {showHoursModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn số giờ</Text>
                            <TouchableOpacity onPress={() => setShowHoursModal(false)}>
                                <Ionicons name="close" size={24} color="#262626" />
                            </TouchableOpacity>
                        </View>
                        {OVERTIME_HOURS_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.modalOption, overtimeHours === option.value && styles.modalOptionActive]}
                                onPress={() => {
                                    setOvertimeHours(option.value);
                                    setShowHoursModal(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, overtimeHours === option.value && styles.modalOptionTextActive]}>
                                    {option.label}
                                </Text>
                                {overtimeHours === option.value && (
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
    summaryBox: {
        flexDirection: 'row', backgroundColor: '#e6f7ff', borderRadius: 8,
        padding: 12, marginBottom: 20, alignItems: 'flex-start',
    },
    summaryText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#1890ff', lineHeight: 20 },
    textArea: {
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100,
    },
    guideBox: {
        flexDirection: 'row', backgroundColor: '#fff7e6', borderRadius: 8,
        padding: 12, marginTop: 10, alignItems: 'flex-start',
    },
    guideText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#fa8c16', lineHeight: 20 },
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

export default OvertimeApplicationScreen;

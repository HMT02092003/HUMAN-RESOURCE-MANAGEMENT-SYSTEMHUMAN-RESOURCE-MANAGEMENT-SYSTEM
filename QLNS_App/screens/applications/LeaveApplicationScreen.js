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

const LEAVE_TYPES = [
    { value: 'leave', label: 'Nghỉ phép (có lương)' },
    { value: 'personal', label: 'Nghỉ việc riêng (không lương)' },
    { value: 'sick', label: 'Nghỉ ốm' },
];

const LeaveApplicationScreen = ({ navigation, route }) => {
    const { mode = 'create', applicationId, applicationData } = route.params || {};
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'view';

    // Form state
    const [leaveType, setLeaveType] = useState('leave');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    
    // Date picker state
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
    const [applicationFullData, setApplicationFullData] = useState(null);

    // Load data if edit/view mode
    useEffect(() => {
        if ((isEditMode || isViewMode) && applicationId) {
            loadApplicationData();
        }
    }, [isEditMode, isViewMode, applicationId]);

    const loadApplicationData = async () => {
        setLoading(true);
        try {
            const response = await ApplicationService.getApplicationById(applicationId);
            const data = response?.data || response;
            setApplicationFullData(data);
            const formData = data?.data || data;
            
            console.log('📥 Loaded application data:', formData);
            
            if (formData) {
                setLeaveType(formData.leaveType || 'leave');
                setReason(formData.reason || '');
                
                if (formData.startDate) {
                    setStartDate(new Date(formData.startDate));
                }
                if (formData.endDate) {
                    setEndDate(new Date(formData.endDate));
                }
            }
        } catch (error) {
            console.error('Error loading application:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin đơn từ');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return dayjs(date).format('DD/MM/YYYY');
    };

    const calculateDays = () => {
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).startOf('day');
        return end.diff(start, 'day') + 1;
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartPicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);
            // Nếu ngày bắt đầu > ngày kết thúc, tự động update
            if (selectedDate > endDate) {
                setEndDate(selectedDate);
            }
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndPicker(false);
        if (selectedDate) {
            if (selectedDate < startDate) {
                Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
                return;
            }
            setEndDate(selectedDate);
        }
    };

    const validateForm = () => {
        if (!reason.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập lý do nghỉ phép');
            return false;
        }
        if (endDate < startDate) {
            Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        setSubmitting(true);
        try {
            const payload = {
                type: 'leave',
                data: {
                    leaveType,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    reason: reason.trim(),
                },
            };

            if (isEditMode) {
                await ApplicationService.updateApplication(applicationId, { data: payload.data });
                Alert.alert('Thành công', 'Đã cập nhật đơn nghỉ phép', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await ApplicationService.createApplication(payload);
                Alert.alert('Thành công', 'Đã tạo đơn nghỉ phép', [
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
        const STATUS_LABELS = {
            0: 'Chờ duyệt',
            1: 'Đã duyệt',
            2: 'Từ chối'
        };
        const STATUS_COLORS = {
            0: '#fa8c16',
            1: '#52c41a',
            2: '#ff4d4f'
        };

        const sections = [
            {
                title: 'Thông tin đơn nghỉ phép',
                icon: 'file-document-outline',
                fields: [
                    {
                        label: 'Loại nghỉ',
                        value: LEAVE_TYPES.find(t => t.value === appData.leaveType)?.label || 'N/A',
                        icon: 'tag-outline'
                    },
                    {
                        label: 'Từ ngày',
                        value: appData.startDate,
                        type: 'date',
                        icon: 'calendar-start'
                    },
                    {
                        label: 'Đến ngày',
                        value: appData.endDate,
                        type: 'date',
                        icon: 'calendar-end'
                    },
                    {
                        label: 'Số ngày nghỉ',
                        value: `${calculateDays()} ngày`,
                        icon: 'calendar-clock'
                    },
                    {
                        label: 'Lý do',
                        value: appData.reason || 'N/A',
                        icon: 'text'
                    }
                ]
            },
            {
                title: 'Trạng thái',
                icon: 'information-outline',
                fields: [
                    {
                        label: 'Trạng thái',
                        value: STATUS_LABELS[applicationFullData.status] || 'N/A',
                        type: 'chip',
                        chipStyle: { backgroundColor: STATUS_COLORS[applicationFullData.status] + '20' },
                        chipTextStyle: { color: STATUS_COLORS[applicationFullData.status] },
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
                    ...(applicationFullData.data?.rejectReason ? [{
                        label: 'Lý do từ chối',
                        value: applicationFullData.data.rejectReason,
                        icon: 'close-circle-outline',
                        valueStyle: { color: '#ff4d4f' }
                    }] : []),
                    {
                        label: 'Ngày tạo',
                        value: applicationFullData.created_at,
                        type: 'datetime',
                        icon: 'calendar-plus'
                    }
                ]
            }
        ];

        const actions = [
            ...(applicationFullData.status === 0 ? [{
                label: 'Chỉnh sửa',
                icon: 'pencil',
                color: '#1890ff',
                onPress: () => navigation.replace('LeaveApplication', { mode: 'edit', applicationId })
            }] : [])
        ];

        return (
            <DetailViewScreen
                title="Chi tiết đơn nghỉ phép"
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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#262626" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditMode ? 'Chỉnh sửa đơn nghỉ phép' : 'Tạo đơn nghỉ phép'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Loại nghỉ */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Loại nghỉ <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowLeaveTypeModal(true)}
                    >
                        <Text style={styles.selectText}>
                            {LEAVE_TYPES.find(t => t.value === leaveType)?.label}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#8c8c8c" />
                    </TouchableOpacity>
                </View>

                {/* Từ ngày */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Từ ngày <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                        style={styles.dateBox}
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Đến ngày */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Đến ngày <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                        style={styles.dateBox}
                        onPress={() => setShowEndPicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Số ngày */}
                <View style={styles.daysInfo}>
                    <Text style={styles.daysLabel}>Tổng số ngày nghỉ:</Text>
                    <Text style={styles.daysValue}>{calculateDays()} ngày</Text>
                </View>

                {/* Lý do */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Lý do <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Nhập lý do xin nghỉ..."
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Hướng dẫn */}
                <View style={styles.guideBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#1890ff" />
                    <Text style={styles.guideText}>
                        Đơn nghỉ phép cần được gửi trước ít nhất 3 ngày. Sau khi gửi, đơn sẽ được chuyển đến quản lý trực tiếp để phê duyệt.
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                >
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

            {/* Date Pickers */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="spinner"
                    onChange={handleStartDateChange}
                    minimumDate={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)} // 3 ngày trước
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="spinner"
                    onChange={handleEndDateChange}
                    minimumDate={startDate}
                />
            )}

            {/* Leave Type Modal */}
            {showLeaveTypeModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn loại nghỉ</Text>
                            <TouchableOpacity onPress={() => setShowLeaveTypeModal(false)}>
                                <Ionicons name="close" size={24} color="#262626" />
                            </TouchableOpacity>
                        </View>
                        {LEAVE_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.value}
                                style={[
                                    styles.modalOption,
                                    leaveType === type.value && styles.modalOptionActive
                                ]}
                                onPress={() => {
                                    setLeaveType(type.value);
                                    setShowLeaveTypeModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    leaveType === type.value && styles.modalOptionTextActive
                                ]}>
                                    {type.label}
                                </Text>
                                {leaveType === type.value && (
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#262626',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#262626',
        marginBottom: 8,
    },
    required: {
        color: '#ff4d4f',
    },
    selectBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    selectText: {
        fontSize: 15,
        color: '#262626',
    },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dateIcon: {
        marginRight: 10,
    },
    dateText: {
        fontSize: 15,
        color: '#262626',
    },
    daysInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e6f7ff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    daysLabel: {
        fontSize: 14,
        color: '#1890ff',
    },
    daysValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1890ff',
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 100,
    },
    guideBox: {
        flexDirection: 'row',
        backgroundColor: '#f0f5ff',
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
    },
    guideText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: '#1890ff',
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#595959',
    },
    submitButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#1890ff',
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    // Modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#262626',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalOptionActive: {
        backgroundColor: '#e6f7ff',
    },
    modalOptionText: {
        fontSize: 15,
        color: '#262626',
    },
    modalOptionTextActive: {
        color: '#1890ff',
        fontWeight: '600',
    },
});

export default LeaveApplicationScreen;

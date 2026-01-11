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

const LEAVE_TYPES = [
    { value: 'leave', label: 'Nghỉ phép (có lương)' },
    { value: 'personal', label: 'Nghỉ việc riêng (không lương)' },
    { value: 'sick', label: 'Nghỉ ốm' },
];

const LeaveApplicationEditScreen = ({ navigation, route }) => {
    const { applicationId } = route.params || {};

    // Form state
    const [leaveType, setLeaveType] = useState('leave');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    
    // Date picker state
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    
    // UI state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);

    // Load dữ liệu đơn từ khi vào màn edit
    useEffect(() => {
        if (applicationId) {
            loadApplicationData();
        }
    }, [applicationId]);

    const loadApplicationData = async () => {
        setLoading(true);
        try {
            console.log('📥 Loading application data for editing:', applicationId);
            const response = await ApplicationService.getApplicationById(applicationId);
            const data = response?.data || response;
            const formData = data?.data || data;
            
            console.log('✅ Loaded application data:', formData);
            
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
            console.error('❌ Error loading application:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin đơn từ', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
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
        setShowStartPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setStartDate(selectedDate);
            if (selectedDate > endDate) {
                setEndDate(selectedDate);
            }
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEndDate(selectedDate);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!reason.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập lý do xin nghỉ');
            return;
        }

        if (startDate > endDate) {
            Alert.alert('Thông báo', 'Ngày kết thúc phải sau ngày bắt đầu');
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                data: {
                    leaveType,
                    startDate: dayjs(startDate).format('YYYY-MM-DD'),
                    endDate: dayjs(endDate).format('YYYY-MM-DD'),
                    reason: reason.trim()
                }
            };

            console.log('📤 Updating leave application:', applicationId, payload);

            await ApplicationService.updateApplication(applicationId, payload);

            Alert.alert(
                'Thành công',
                'Đơn nghỉ phép đã được cập nhật',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('❌ Error updating leave application:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật đơn nghỉ phép';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
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
                <Text style={styles.headerTitle}>Chỉnh sửa đơn nghỉ phép</Text>
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
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={styles.submitButtonText}>Cập nhật</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Date Pickers */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleStartDateChange}
                    minimumDate={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
        padding: 12,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    selectText: {
        fontSize: 14,
        color: '#262626',
    },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    dateIcon: {
        marginRight: 12,
    },
    dateText: {
        fontSize: 14,
        color: '#262626',
    },
    daysInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e6f7ff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    daysLabel: {
        fontSize: 14,
        color: '#0050b3',
        fontWeight: '500',
    },
    daysValue: {
        fontSize: 16,
        color: '#0050b3',
        fontWeight: '600',
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        minHeight: 100,
        fontSize: 14,
        color: '#262626',
    },
    guideBox: {
        flexDirection: 'row',
        backgroundColor: '#e6f7ff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    guideText: {
        flex: 1,
        fontSize: 13,
        color: '#0050b3',
        marginLeft: 8,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#595959',
    },
    submitButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#1890ff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#fff',
    },
    disabledButton: {
        backgroundColor: '#91d5ff',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: '85%',
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#262626',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 8,
        marginBottom: 8,
    },
    modalOptionActive: {
        backgroundColor: '#e6f7ff',
    },
    modalOptionText: {
        fontSize: 14,
        color: '#595959',
    },
    modalOptionTextActive: {
        color: '#1890ff',
        fontWeight: '500',
    },
});

export default LeaveApplicationEditScreen;

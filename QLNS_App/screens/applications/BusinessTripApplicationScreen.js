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

const BusinessTripApplicationScreen = ({ navigation, route }) => {
    const { mode = 'create', applicationId, applicationData } = route.params || {};
    const isEditMode = mode === 'edit';
    const isViewMode = mode === 'view';

    // Form state
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [destination, setDestination] = useState('');
    const [purpose, setPurpose] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    
    // Picker state
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [applicationFullData, setApplicationFullData] = useState(null);

    useEffect(() => {
        console.log('🔄 [BusinessTripApp] Mode:', mode, 'ApplicationId:', applicationId);
        if ((isEditMode || isViewMode) && applicationId) {
            console.log('📥 [BusinessTripApp] Loading data for edit/view');
            loadApplicationData();
        } else if (!isEditMode && !isViewMode) {
            // Reset form to defaults when in create mode
            console.log('🆕 [BusinessTripApp] CREATE MODE - Resetting form to defaults');
            setApplicationFullData(null);
            setStartDate(new Date());
            setEndDate(new Date());
            setDestination('');
            setPurpose('');
            setEstimatedCost('');
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
                setDestination(formData.destination || '');
                setPurpose(formData.purpose || '');
                setEstimatedCost(formData.estimatedCost?.toString() || '');
                
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

    const formatDate = (date) => dayjs(date).format('DD/MM/YYYY');

    const calculateDays = () => {
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).startOf('day');
        return end.diff(start, 'day') + 1;
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartPicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);
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
        if (!destination.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập địa điểm công tác');
            return false;
        }
        if (!purpose.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập mục đích công tác');
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
                type: 'business-trip',
                data: {
                    startDate: dayjs(startDate).format('YYYY-MM-DD'),
                    endDate: dayjs(endDate).format('YYYY-MM-DD'),
                    destination: destination.trim(),
                    purpose: purpose.trim(),
                    estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
                },
            };

            if (isEditMode) {
                await ApplicationService.updateApplication(applicationId, { data: payload.data });
                Alert.alert('Thành công', 'Đã cập nhật đơn công tác', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await ApplicationService.createApplication(payload);
                Alert.alert('Thành công', 'Đã tạo đơn công tác', [
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
                title: 'Thông tin công tác',
                icon: 'airplane',
                fields: [
                    { label: 'Từ ngày', value: appData.startDate, type: 'date', icon: 'calendar-start' },
                    { label: 'Đến ngày', value: appData.endDate, type: 'date', icon: 'calendar-end' },
                    { label: 'Số ngày', value: `${calculateDays()} ngày`, icon: 'calendar-clock' },
                    { label: 'Địa điểm', value: appData.destination || 'N/A', icon: 'map-marker' },
                    { label: 'Mục đích', value: appData.purpose || 'N/A', icon: 'text' },
                    { 
                        label: 'Chi phí dự kiến', 
                        value: appData.estimatedCost || 0, 
                        type: 'currency', 
                        icon: 'cash' 
                    }
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
                onPress: () => navigation.replace('BusinessTripApplication', { mode: 'edit', applicationId })
            }] : [])
        ];

        return (
            <DetailViewScreen
                title="Chi tiết đơn công tác"
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
                    {isEditMode ? 'Chỉnh sửa đơn' : 'Đơn công tác'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Từ ngày */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Từ ngày <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowStartPicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Đến ngày */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Đến ngày <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dateBox} onPress={() => setShowEndPicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#1890ff" style={styles.dateIcon} />
                        <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Số ngày */}
                <View style={styles.daysInfo}>
                    <Text style={styles.daysLabel}>Tổng số ngày công tác:</Text>
                    <Text style={styles.daysValue}>{calculateDays()} ngày</Text>
                </View>

                {/* Địa điểm */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Địa điểm công tác <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập địa điểm công tác..."
                        value={destination}
                        onChangeText={setDestination}
                    />
                </View>

                {/* Mục đích */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Mục đích <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Nhập mục đích công tác..."
                        value={purpose}
                        onChangeText={setPurpose}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Chi phí dự kiến */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Chi phí dự kiến (VNĐ)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập chi phí dự kiến..."
                        value={estimatedCost}
                        onChangeText={setEstimatedCost}
                        keyboardType="numeric"
                    />
                </View>

                {/* Hướng dẫn */}
                <View style={styles.guideBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#722ed1" />
                    <Text style={styles.guideText}>
                        Đơn công tác cần được gửi trước ít nhất 3 ngày. 
                        Chi phí thực tế sẽ được thanh toán sau khi hoàn thành công tác.
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

            {/* Date Pickers */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="spinner"
                    onChange={handleStartDateChange}
                    minimumDate={new Date()}
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
    input: {
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    },
    dateBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12,
    },
    dateIcon: { marginRight: 10 },
    dateText: { fontSize: 15, color: '#262626' },
    daysInfo: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#f9f0ff', borderRadius: 8, padding: 12, marginBottom: 20,
    },
    daysLabel: { fontSize: 14, color: '#722ed1' },
    daysValue: { fontSize: 16, fontWeight: '700', color: '#722ed1' },
    textArea: {
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9',
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100,
    },
    guideBox: {
        flexDirection: 'row', backgroundColor: '#f9f0ff', borderRadius: 8,
        padding: 12, marginTop: 10, alignItems: 'flex-start',
    },
    guideText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#722ed1', lineHeight: 20 },
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
});

export default BusinessTripApplicationScreen;

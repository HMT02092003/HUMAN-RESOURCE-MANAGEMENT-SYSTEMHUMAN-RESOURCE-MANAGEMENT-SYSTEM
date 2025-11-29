import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Switch,
    TextInput,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import SettingsService from '../../services/SettingsService';

// Day labels for WorkingDays
const DAY_LABELS = {
    monday: 'Thứ 2',
    tuesday: 'Thứ 3',
    wednesday: 'Thứ 4',
    thursday: 'Thứ 5',
    friday: 'Thứ 6',
    saturday: 'Thứ 7',
    sunday: 'Chủ nhật'
};

const SettingsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('time'); // 'time', 'rates', 'days', 'insurance'

    // Settings data
    const [settings, setSettings] = useState({
        WorkingHours: { start: '08:00', end: '17:00' },
        LunchBreak: { start: '12:00', end: '13:00' },
        OvertimeRate: { rate: 1.5 },
        HolidayRate: { rate: 3.0 },
        PenaltyRate: { rate: 0.001 },
        UnauthorizedAbsencePenaltyRate: { rate: 5 },
        WorkingDays: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
        },
        BHXH: { rate: 8.0 },
        BHYT: { rate: 1.5 },
        TNCN: { rate: 0.0 }
    });

    // Time picker state
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [currentTimeField, setCurrentTimeField] = useState(null);
    const [tempTime, setTempTime] = useState(new Date());

    // Load settings
    const loadSettings = useCallback(async () => {
        try {
            const data = await SettingsService.getAllSettings();
            if (data) {
                setSettings(prev => ({
                    ...prev,
                    ...data
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            Alert.alert('Lỗi', 'Không thể tải cấu hình hệ thống');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const onRefresh = () => {
        setRefreshing(true);
        loadSettings();
    };

    // Parse time string to Date
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    // Format Date to time string
    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Open time picker
    const openTimePicker = (field) => {
        let initialTime;
        if (field === 'lunchBreakStart') {
            initialTime = parseTime(settings.LunchBreak.start);
        } else if (field === 'lunchBreakEnd') {
            initialTime = parseTime(settings.LunchBreak.end);
        }
        setCurrentTimeField(field);
        setTempTime(initialTime);
        setShowTimePicker(true);
    };

    // Handle time change
    const handleTimeChange = (event, selectedTime) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        
        if (selectedTime && currentTimeField) {
            const timeStr = formatTime(selectedTime);
            setSettings(prev => {
                const newSettings = { ...prev };
                if (currentTimeField === 'lunchBreakStart') {
                    newSettings.LunchBreak = { ...newSettings.LunchBreak, start: timeStr };
                } else if (currentTimeField === 'lunchBreakEnd') {
                    newSettings.LunchBreak = { ...newSettings.LunchBreak, end: timeStr };
                }
                return newSettings;
            });
            setTempTime(selectedTime);
        }
    };

    // Confirm time selection (iOS)
    const confirmTimeSelection = () => {
        setShowTimePicker(false);
    };

    // Save individual setting
    const saveSetting = async (key, value) => {
        try {
            setSaving(true);
            await SettingsService.updateSetting(key, value);
            Alert.alert('Thành công', 'Đã lưu cấu hình');
        } catch (error) {
            console.error('Error saving setting:', error);
            Alert.alert('Lỗi', 'Không thể lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    // Save lunch break
    const saveLunchBreak = () => {
        saveSetting('LunchBreak', settings.LunchBreak);
    };

    // Save working days
    const saveWorkingDays = () => {
        saveSetting('WorkingDays', settings.WorkingDays);
    };

    // Toggle working day
    const toggleWorkingDay = (day) => {
        setSettings(prev => ({
            ...prev,
            WorkingDays: {
                ...prev.WorkingDays,
                [day]: !prev.WorkingDays[day]
            }
        }));
    };

    // Update rate value
    const updateRate = (key, value) => {
        const numValue = parseFloat(value) || 0;
        setSettings(prev => ({
            ...prev,
            [key]: { rate: numValue }
        }));
    };

    // Save rate
    const saveRate = (key) => {
        saveSetting(key, settings[key]);
    };

    // Render tabs
    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'time' && styles.activeTab]}
                    onPress={() => setActiveTab('time')}
                >
                    <Ionicons name="cafe-outline" size={18} color={activeTab === 'time' ? '#fff' : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'time' && styles.activeTabText]}>Giờ nghỉ trưa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'rates' && styles.activeTab]}
                    onPress={() => setActiveTab('rates')}
                >
                    <Ionicons name="cash-outline" size={18} color={activeTab === 'rates' ? '#fff' : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'rates' && styles.activeTabText]}>Tỷ lệ lương</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'days' && styles.activeTab]}
                    onPress={() => setActiveTab('days')}
                >
                    <Ionicons name="calendar-outline" size={18} color={activeTab === 'days' ? '#fff' : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'days' && styles.activeTabText]}>Ngày làm việc</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'insurance' && styles.activeTab]}
                    onPress={() => setActiveTab('insurance')}
                >
                    <Ionicons name="shield-checkmark-outline" size={18} color={activeTab === 'insurance' ? '#fff' : '#666'} />
                    <Text style={[styles.tabText, activeTab === 'insurance' && styles.activeTabText]}>Bảo hiểm</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    // Render time settings (only Lunch Break, WorkingHours removed per web request)
    const renderTimeSettings = () => (
        <View style={styles.section}>
            {/* Giờ nghỉ trưa */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="cafe-outline" size={22} color="#52c41a" />
                    <Text style={styles.cardTitle}>Giờ nghỉ trưa</Text>
                </View>
                <Text style={styles.cardDescription}>Cấu hình thời gian nghỉ trưa</Text>
                
                <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>Bắt đầu</Text>
                        <TouchableOpacity
                            style={styles.timeInput}
                            onPress={() => openTimePicker('lunchBreakStart')}
                        >
                            <Ionicons name="time-outline" size={20} color="#52c41a" />
                            <Text style={styles.timeValue}>{settings.LunchBreak.start}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.timeSeparator}>
                        <Text style={styles.timeSeparatorText}>→</Text>
                    </View>
                    <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>Kết thúc</Text>
                        <TouchableOpacity
                            style={styles.timeInput}
                            onPress={() => openTimePicker('lunchBreakEnd')}
                        >
                            <Ionicons name="time-outline" size={20} color="#52c41a" />
                            <Text style={styles.timeValue}>{settings.LunchBreak.end}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#52c41a' }]}
                    onPress={saveLunchBreak}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={styles.saveButtonText}>Lưu giờ nghỉ trưa</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render rate settings
    const renderRateSettings = () => (
        <View style={styles.section}>
            {/* Tỷ lệ OT ngày thường */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="trending-up-outline" size={22} color="#fa8c16" />
                    <Text style={styles.cardTitle}>Tỷ lệ OT ngày thường</Text>
                </View>
                <Text style={styles.cardDescription}>Hệ số nhân lương khi làm thêm giờ ngày thường</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.OvertimeRate.rate)}
                        onChangeText={(text) => updateRate('OvertimeRate', text)}
                        keyboardType="decimal-pad"
                        placeholder="1.5"
                    />
                    <Text style={styles.rateUnit}>x lương cơ bản</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#fa8c16' }]}
                    onPress={() => saveRate('OvertimeRate')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>

            {/* Tỷ lệ OT ngày lễ */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="gift-outline" size={22} color="#eb2f96" />
                    <Text style={styles.cardTitle}>Tỷ lệ OT ngày lễ</Text>
                </View>
                <Text style={styles.cardDescription}>Hệ số nhân lương khi làm thêm giờ ngày lễ</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.HolidayRate.rate)}
                        onChangeText={(text) => updateRate('HolidayRate', text)}
                        keyboardType="decimal-pad"
                        placeholder="3.0"
                    />
                    <Text style={styles.rateUnit}>x lương cơ bản</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#eb2f96' }]}
                    onPress={() => saveRate('HolidayRate')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>

            {/* Tỷ lệ phạt đi muộn/về sớm */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="warning-outline" size={22} color="#ff4d4f" />
                    <Text style={styles.cardTitle}>Tỷ lệ phạt đi muộn/về sớm</Text>
                </View>
                <Text style={styles.cardDescription}>Tỷ lệ trừ lương khi đi muộn hoặc về sớm</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.PenaltyRate.rate)}
                        onChangeText={(text) => updateRate('PenaltyRate', text)}
                        keyboardType="decimal-pad"
                        placeholder="0.001"
                    />
                    <Text style={styles.rateUnit}>% / phút</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#ff4d4f' }]}
                    onPress={() => saveRate('PenaltyRate')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>

            {/* Tỷ lệ phạt vắng không phép */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="close-circle-outline" size={22} color="#722ed1" />
                    <Text style={styles.cardTitle}>Phạt vắng không phép</Text>
                </View>
                <Text style={styles.cardDescription}>Số ngày lương trừ khi vắng không phép</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.UnauthorizedAbsencePenaltyRate.rate)}
                        onChangeText={(text) => updateRate('UnauthorizedAbsencePenaltyRate', text)}
                        keyboardType="decimal-pad"
                        placeholder="5"
                    />
                    <Text style={styles.rateUnit}>ngày lương / ngày vắng</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#722ed1' }]}
                    onPress={() => saveRate('UnauthorizedAbsencePenaltyRate')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render working days settings
    const renderDaysSettings = () => (
        <View style={styles.section}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="calendar-outline" size={22} color="#1890ff" />
                    <Text style={styles.cardTitle}>Ngày làm việc trong tuần</Text>
                </View>
                <Text style={styles.cardDescription}>Chọn các ngày làm việc trong tuần</Text>
                
                <View style={styles.daysContainer}>
                    {Object.entries(DAY_LABELS).map(([key, label]) => (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.dayItem,
                                settings.WorkingDays[key] && styles.dayItemActive
                            ]}
                            onPress={() => toggleWorkingDay(key)}
                        >
                            <View style={[
                                styles.dayCheckbox,
                                settings.WorkingDays[key] && styles.dayCheckboxActive
                            ]}>
                                {settings.WorkingDays[key] && (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                )}
                            </View>
                            <Text style={[
                                styles.dayLabel,
                                settings.WorkingDays[key] && styles.dayLabelActive
                            ]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveWorkingDays}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={styles.saveButtonText}>Lưu ngày làm việc</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render insurance settings
    const renderInsuranceSettings = () => (
        <View style={styles.section}>
            {/* BHXH */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="medkit-outline" size={22} color="#13c2c2" />
                    <Text style={styles.cardTitle}>BHXH (Bảo hiểm xã hội)</Text>
                </View>
                <Text style={styles.cardDescription}>Tỷ lệ đóng bảo hiểm xã hội của người lao động</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.BHXH?.rate || 8)}
                        onChangeText={(text) => updateRate('BHXH', text)}
                        keyboardType="decimal-pad"
                        placeholder="8"
                    />
                    <Text style={styles.rateUnit}>%</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#13c2c2' }]}
                    onPress={() => saveRate('BHXH')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>

            {/* BHYT */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="heart-outline" size={22} color="#52c41a" />
                    <Text style={styles.cardTitle}>BHYT (Bảo hiểm y tế)</Text>
                </View>
                <Text style={styles.cardDescription}>Tỷ lệ đóng bảo hiểm y tế của người lao động</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.BHYT?.rate || 1.5)}
                        onChangeText={(text) => updateRate('BHYT', text)}
                        keyboardType="decimal-pad"
                        placeholder="1.5"
                    />
                    <Text style={styles.rateUnit}>%</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#52c41a' }]}
                    onPress={() => saveRate('BHYT')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>

            {/* TNCN */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="document-text-outline" size={22} color="#fa8c16" />
                    <Text style={styles.cardTitle}>TNCN (Thuế thu nhập cá nhân)</Text>
                </View>
                <Text style={styles.cardDescription}>Tỷ lệ thuế thu nhập cá nhân mặc định</Text>
                
                <View style={styles.rateInputContainer}>
                    <TextInput
                        style={styles.rateInput}
                        value={String(settings.TNCN?.rate || 0)}
                        onChangeText={(text) => updateRate('TNCN', text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                    />
                    <Text style={styles.rateUnit}>%</Text>
                </View>
                
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#fa8c16' }]}
                    onPress={() => saveRate('TNCN')}
                    disabled={saving}
                >
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'time':
                return renderTimeSettings();
            case 'rates':
                return renderRateSettings();
            case 'days':
                return renderDaysSettings();
            case 'insurance':
                return renderInsuranceSettings();
            default:
                return renderTimeSettings();
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải cấu hình...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Tabs */}
            {renderTabs()}

            {/* Content */}
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {renderContent()}
                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Time Picker Modal */}
            {showTimePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        transparent
                        animationType="slide"
                        visible={showTimePicker}
                        onRequestClose={() => setShowTimePicker(false)}
                    >
                        <View style={styles.timePickerModal}>
                            <View style={styles.timePickerContent}>
                                <View style={styles.timePickerHeader}>
                                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                        <Text style={styles.timePickerCancel}>Hủy</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.timePickerTitle}>Chọn giờ</Text>
                                    <TouchableOpacity onPress={confirmTimeSelection}>
                                        <Text style={styles.timePickerConfirm}>Xong</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={handleTimeChange}
                                    locale="vi-VN"
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={tempTime}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={handleTimeChange}
                    />
                )
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    tabContainer: {
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingBottom: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    activeTab: {
        backgroundColor: '#1890ff',
    },
    tabText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#262626',
        marginLeft: 10,
    },
    cardDescription: {
        fontSize: 13,
        color: '#8c8c8c',
        marginBottom: 16,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeField: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 13,
        color: '#8c8c8c',
        marginBottom: 8,
    },
    timeInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    timeValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#262626',
        marginLeft: 8,
    },
    timeSeparator: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    timeSeparatorText: {
        fontSize: 20,
        color: '#bfbfbf',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1890ff',
        borderRadius: 8,
        paddingVertical: 12,
        marginTop: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 6,
    },
    rateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rateInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 18,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#e8e8e8',
        marginRight: 12,
    },
    rateUnit: {
        fontSize: 14,
        color: '#8c8c8c',
        minWidth: 100,
    },
    daysContainer: {
        marginBottom: 16,
    },
    dayItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginBottom: 8,
    },
    dayItemActive: {
        backgroundColor: '#e6f7ff',
        borderWidth: 1,
        borderColor: '#1890ff',
    },
    dayCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#d9d9d9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dayCheckboxActive: {
        backgroundColor: '#1890ff',
        borderColor: '#1890ff',
    },
    dayLabel: {
        fontSize: 15,
        color: '#595959',
    },
    dayLabelActive: {
        color: '#1890ff',
        fontWeight: '600',
    },
    bottomPadding: {
        height: 40,
    },
    timePickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    timePickerContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    timePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
    },
    timePickerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#262626',
    },
    timePickerCancel: {
        fontSize: 16,
        color: '#8c8c8c',
    },
    timePickerConfirm: {
        fontSize: 16,
        color: '#1890ff',
        fontWeight: '600',
    },
});

export default SettingsScreen;
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronService } from '../../services/ChevronService';

const ChevronEditScreen = ({ route, navigation }) => {
    const { chevronId } = route.params;
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        chevronCoefficient: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchChevronDetail();
    }, [chevronId]);

    const fetchChevronDetail = async () => {
        try {
            const data = await ChevronService.getChevronDetail(chevronId);
            if (data) {
                setFormData({
                    name: data.name,
                    description: data.description || '',
                    chevronCoefficient: data.chevronCoefficient ? data.chevronCoefficient.toString() : '',
                });
            }
        } catch (error) {
            console.error('Error fetching chevron detail:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin chức vụ');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Tên chức vụ là bắt buộc';
        }
        if (formData.chevronCoefficient === undefined || formData.chevronCoefficient === null || formData.chevronCoefficient.toString().trim() === '') {
            newErrors.chevronCoefficient = 'Vui lòng nhập hệ số chức vụ';
        } else {
            const coef = parseFloat(formData.chevronCoefficient);
            if (isNaN(coef) || coef < 0 || coef > 5) {
                newErrors.chevronCoefficient = 'Hệ số phải từ 0 đến 5';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            const submitData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                chevronCoefficient: Number(formData.chevronCoefficient),
            };
            await ChevronService.updateChevron(parseInt(chevronId), submitData);
            Alert.alert('Thành công', 'Cập nhật chức vụ thành công', [
                {
                    text: 'OK',
                    onPress: () => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('ChevronList');
                        }
                    },
                },
            ]);
        } catch (error) {
            console.error('Error updating chevron:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật chức vụ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa chức vụ này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ChevronService.deleteChevron(chevronId);
                            Alert.alert('Thành công', 'Xóa chức vụ thành công', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        if (navigation.canGoBack()) {
                                            navigation.goBack();
                                        } else {
                                            navigation.navigate('ChevronList');
                                        }
                                    },
                                },
                            ]);
                        } catch (error) {
                            console.error('Error deleting chevron:', error);
                            Alert.alert('Lỗi', 'Không thể xóa chức vụ');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên chức vụ <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(text) => {
                                setFormData({ ...formData, name: text });
                                if (errors.name) setErrors({ ...errors, name: null });
                            }}
                            placeholder="Nhập tên chức vụ"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Hệ số chức vụ <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.chevronCoefficient && styles.inputError]}
                            value={formData.chevronCoefficient}
                            onChangeText={(text) => {
                                setFormData({ ...formData, chevronCoefficient: text });
                                if (errors.chevronCoefficient) setErrors({ ...errors, chevronCoefficient: null });
                            }}
                            placeholder="Nhập hệ số (0-5)"
                            keyboardType="numeric"
                        />
                        {errors.chevronCoefficient && <Text style={styles.errorText}>{errors.chevronCoefficient}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(text) => setFormData({ ...formData, description: text })}
                            placeholder="Nhập mô tả chức vụ"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, saving && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={saving}
                    >
                        <Text style={styles.submitButtonText}>
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Text>
                    </TouchableOpacity>

                    {/* Delete button removed as requested */}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 14, color: '#8c8c8c' },
    scrollContent: { padding: 16 },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    inputGroup: { marginBottom: 16 },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#262626',
        marginBottom: 8,
    },
    required: { color: '#ff4d4f' },
    input: {
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: '#262626',
        backgroundColor: '#fff',
    },
    inputError: { borderColor: '#ff4d4f' },
    textArea: { height: 100 },
    errorText: { color: '#ff4d4f', fontSize: 12, marginTop: 4 },
    submitButton: {
        backgroundColor: '#1890ff',
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 16,
    },
    disabledButton: { backgroundColor: '#bae7ff' },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ff4d4f',
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 12,
    },
    deleteButtonText: {
        color: '#ff4d4f',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ChevronEditScreen;

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronService } from '../../services/ChevronService';

const ChevronCreateScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        chevronCoefficient: '',
    });
    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name || formData.name.trim() === '') {
            newErrors.name = 'Vui lòng nhập tên chức vụ';
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
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                chevronCoefficient: Number(formData.chevronCoefficient),
            };

            await ChevronService.createChevron(submitData);
            setTimeout(() => {
                Alert.alert('Thành công', 'Tạo mới chức vụ thành công', [
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
            }, 100);
        } catch (error) {
            console.error('Error creating chevron:', error);
            const errorMessage =
                error.response?.data?.message || error.response?.data?.error || 'Lỗi server không phản hồi';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                <View style={styles.formContainer}>
                    {/* Name Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Tên chức vụ <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            placeholder="Nhập tên chức vụ"
                            value={formData.name}
                            onChangeText={(value) => handleInputChange('name', value)}
                        />
                        {errors.name && (
                            <Text style={styles.errorText}>{errors.name}</Text>
                        )}
                    </View>

                    {/* Coefficient Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Hệ số chức vụ <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.chevronCoefficient && styles.inputError]}
                            placeholder="Nhập hệ số (0-5)"
                            value={formData.chevronCoefficient}
                            onChangeText={(value) => handleInputChange('chevronCoefficient', value)}
                            keyboardType="numeric"
                        />
                        {errors.chevronCoefficient && (
                            <Text style={styles.errorText}>{errors.chevronCoefficient}</Text>
                        )}
                    </View>

                    {/* Description Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Nhập mô tả chức vụ"
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    disabled={loading}
                >
                    <Ionicons name="arrow-back" size={20} color="#666" />
                    <Text style={styles.backButtonText}>Trở về</Text>
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
                            <Ionicons name="save" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Lưu</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    scrollView: { flex: 1 },
    formContainer: { padding: 20 },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 },
    required: { color: 'red' },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    inputError: { borderColor: 'red' },
    textArea: { height: 100, textAlignVertical: 'top' },
    errorText: { color: 'red', fontSize: 12, marginTop: 5 },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    backButtonText: { marginLeft: 5, color: '#666', fontWeight: '600' },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#1890ff',
        paddingHorizontal: 20,
    },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { marginLeft: 5, color: '#fff', fontWeight: '600' },
});

export default ChevronCreateScreen;

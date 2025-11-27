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
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Divider, IconButton, List } from 'react-native-paper';
import { ContractTypeService } from '../../services/ContractTypeService';

const ContractTypeCreateScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 1, // Default to Intern
        contractTerm: '',
        insurance: '',
        description: '',
    });
    const [errors, setErrors] = useState({});
    const [showTypeModal, setShowTypeModal] = useState(false);

    // Danh sách các loại hợp đồng
    const contractTypeOptions = [
        { id: 1, name: 'Hợp đồng Thực tập', description: 'Dành cho sinh viên thực tập' },
        { id: 2, name: 'Hợp đồng Thử việc', description: 'Thời gian thử việc trước khi ký chính thức' },
        { id: 3, name: 'Hợp đồng Lao động (Có thời hạn)', description: 'Hợp đồng có thời hạn xác định' },
        { id: 4, name: 'Hợp đồng Lao động (Không thời hạn)', description: 'Hợp đồng không xác định thời hạn' },
        { id: 5, name: 'Hợp đồng Đào tạo nghề', description: 'Hợp đồng đào tạo kỹ năng nghề' },
        { id: 6, name: 'Hợp đồng Cộng tác viên (CTV)', description: 'Hợp đồng làm việc bán thời gian' },
        { id: 7, name: 'Hợp đồng Khoán việc', description: 'Hợp đồng theo công việc cụ thể' },
    ];

    const getTypeLabel = () => {
        const found = contractTypeOptions.find(item => item.id === formData.type);
        return found ? found.name : 'Chọn loại hợp đồng';
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name || formData.name.trim() === '') {
            newErrors.name = 'Vui lòng nhập tên loại hợp đồng';
        }
        if (!formData.contractTerm || formData.contractTerm.toString().trim() === '') {
            newErrors.contractTerm = 'Vui lòng nhập thời hạn hợp đồng';
        }
        if (!formData.insurance || formData.insurance.toString().trim() === '') {
            newErrors.insurance = 'Vui lòng nhập mức bảo hiểm';
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
                type: parseInt(formData.type),
                contractTerm: parseInt(formData.contractTerm),
                insurance: parseFloat(formData.insurance),
                description: formData.description.trim(),
            };

            await ContractTypeService.createContractType(submitData);
            setTimeout(() => {
                Alert.alert('Thành công', 'Tạo mới loại hợp đồng thành công', [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('ContractTypeList');
                            }
                        },
                    },
                ]);
            }, 100);
        } catch (error) {
            console.error('Error creating contract type:', error);
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
                            Tên loại hợp đồng <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            placeholder="Nhập tên loại hợp đồng"
                            value={formData.name}
                            onChangeText={(value) => handleInputChange('name', value)}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Type Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Loại hợp đồng <Text style={styles.required}>*</Text>
                        </Text>
                        <TouchableOpacity 
                            style={styles.selectContainer}
                            onPress={() => setShowTypeModal(true)}
                        >
                            <Text style={styles.selectText}>{getTypeLabel()}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Term Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Thời hạn (tháng) <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.contractTerm && styles.inputError]}
                            placeholder="Nhập số tháng"
                            value={formData.contractTerm}
                            onChangeText={(value) => handleInputChange('contractTerm', value)}
                            keyboardType="numeric"
                        />
                        {errors.contractTerm && <Text style={styles.errorText}>{errors.contractTerm}</Text>}
                    </View>

                    {/* Insurance Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Bảo hiểm (VND) <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.insurance && styles.inputError]}
                            placeholder="Nhập mức bảo hiểm"
                            value={formData.insurance}
                            onChangeText={(value) => handleInputChange('insurance', value)}
                            keyboardType="numeric"
                        />
                        {errors.insurance && <Text style={styles.errorText}>{errors.insurance}</Text>}
                    </View>

                    {/* Description Field */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Nhập mô tả"
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>
            </ScrollView>

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

            {/* Selection Modal for Contract Type - Giống style của UserFormComponent */}
            <Modal 
                visible={showTypeModal} 
                transparent 
                animationType="slide" 
                onRequestClose={() => setShowTypeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn loại hợp đồng</Text>
                            <IconButton icon="close" size={24} onPress={() => setShowTypeModal(false)} />
                        </View>
                        <Divider />
                        <ScrollView>
                            {contractTypeOptions.map((item) => (
                                <List.Item
                                    key={String(item.id)}
                                    title={item.name}
                                    description={item.description}
                                    onPress={() => {
                                        handleInputChange('type', item.id);
                                        setShowTypeModal(false);
                                    }}
                                    style={styles.listItem}
                                />
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1890ff',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 15,
    },
    headerButton: { padding: 5 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
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
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
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
    // Styles cho Select Container (giống UserFormComponent)
    selectContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
    },
    selectText: {
        fontSize: 16,
        color: '#333',
    },
    // Styles cho Modal (giống UserFormComponent)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
});

export default ContractTypeCreateScreen;

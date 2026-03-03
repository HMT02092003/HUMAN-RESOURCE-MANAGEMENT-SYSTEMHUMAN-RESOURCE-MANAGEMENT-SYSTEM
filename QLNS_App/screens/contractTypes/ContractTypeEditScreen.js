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
import { Modal, Divider, IconButton, List } from 'react-native-paper';
import { ContractTypeService } from '../../services/ContractTypeService';

const ContractTypeEditScreen = ({ route, navigation }) => {
    const { contractTypeId } = route.params;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 1,
        contractTerm: '',
        insurance: '',
        description: '',
    });
    const [errors, setErrors] = useState({});
    const [showTypeModal, setShowTypeModal] = useState(false);

    useEffect(() => {
        fetchContractTypeDetail();
    }, [contractTypeId]);

    const fetchContractTypeDetail = async () => {
        try {
            const data = await ContractTypeService.getContractTypeDetail(contractTypeId);
            if (data) {
                setFormData({
                    name: data.name,
                    type: data.type,
                    contractTerm: data.contractTerm ? data.contractTerm.toString() : '',
                    insurance: data.insurance ? data.insurance.toString() : '',
                    description: data.description || '',
                });
            }
        } catch (error) {
            console.error('Error fetching contract type detail:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin loại hợp đồng');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
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
        if (!validateForm()) return;

        setSaving(true);
        try {
            const submitData = {
                ...formData,
                type: parseInt(formData.type),
                contractTerm: parseInt(formData.contractTerm),
                insurance: parseFloat(formData.insurance),
            };
            await ContractTypeService.updateContractType(contractTypeId, submitData);
            Alert.alert('Thành công', 'Cập nhật loại hợp đồng thành công', [
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
        } catch (error) {
            console.error('Error updating contract type:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật loại hợp đồng');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa loại hợp đồng này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ContractTypeService.deleteContractType(contractTypeId);
                            Alert.alert('Thành công', 'Xóa loại hợp đồng thành công', [
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
                        } catch (error) {
                            console.error('Error deleting contract type:', error);
                            Alert.alert('Lỗi', 'Không thể xóa loại hợp đồng');
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
                        <Text style={styles.label}>Tên loại hợp đồng <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(text) => {
                                setFormData({ ...formData, name: text });
                                if (errors.name) setErrors({ ...errors, name: null });
                            }}
                            placeholder="Nhập tên loại hợp đồng"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Loại hợp đồng <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity onPress={() => setShowTypeModal(true)}>
                            <View style={[styles.input, styles.pickerContainer]}>
                                <Text>{
                                    formData.type === 1 ? 'Hợp đồng Thực tập' :
                                        formData.type === 2 ? 'Hợp đồng Thử việc' :
                                            formData.type === 3 ? 'Hợp đồng Lao động (Có thời hạn)' :
                                                formData.type === 4 ? 'Hợp đồng Lao động (Không thời hạn)' :
                                                    formData.type === 5 ? 'Hợp đồng Đào tạo nghề' :
                                                        formData.type === 6 ? 'Hợp đồng Cộng tác viên (CTV)' :
                                                            formData.type === 7 ? 'Hợp đồng Khoán việc' : 'Chọn loại hợp đồng'
                                }</Text>
                            </View>
                        </TouchableOpacity>

                        <Modal visible={showTypeModal} onDismiss={() => setShowTypeModal(false)} contentContainerStyle={styles.modalContent}>
                            <View style={{ maxHeight: 320 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '600' }}>Chọn loại hợp đồng</Text>
                                    <IconButton icon="close" onPress={() => setShowTypeModal(false)} />
                                </View>
                                <Divider />
                                <ScrollView>
                                    {[
                                        { id: 1, name: 'Hợp đồng Thực tập' },
                                        { id: 2, name: 'Hợp đồng Thử việc' },
                                        { id: 3, name: 'Hợp đồng Lao động (Có thời hạn)' },
                                        { id: 4, name: 'Hợp đồng Lao động (Không thời hạn)' },
                                        { id: 5, name: 'Hợp đồng Đào tạo nghề' },
                                        { id: 6, name: 'Hợp đồng Cộng tác viên (CTV)' },
                                        { id: 7, name: 'Hợp đồng Khoán việc' },
                                    ].map(item => (
                                        <List.Item
                                            key={String(item.id)}
                                            title={item.name}
                                            onPress={() => { setFormData({ ...formData, type: item.id }); setShowTypeModal(false); }}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        </Modal>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Thời hạn (tháng) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.contractTerm && styles.inputError]}
                            value={formData.contractTerm}
                            onChangeText={(text) => {
                                setFormData({ ...formData, contractTerm: text });
                                if (errors.contractTerm) setErrors({ ...errors, contractTerm: null });
                            }}
                            placeholder="Nhập số tháng"
                            keyboardType="numeric"
                        />
                        {errors.contractTerm && <Text style={styles.errorText}>{errors.contractTerm}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bảo hiểm (VND) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, errors.insurance && styles.inputError]}
                            value={formData.insurance}
                            onChangeText={(text) => {
                                setFormData({ ...formData, insurance: text });
                                if (errors.insurance) setErrors({ ...errors, insurance: null });
                            }}
                            placeholder="Nhập mức bảo hiểm"
                            keyboardType="numeric"
                        />
                        {errors.insurance && <Text style={styles.errorText}>{errors.insurance}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mô tả</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(text) => setFormData({ ...formData, description: text })}
                            placeholder="Nhập mô tả"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                </View>
            </ScrollView>

            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={saving}>
                    <Ionicons name="arrow-back" size={20} color="#666" />
                    <Text style={styles.backButtonText}>Trở về</Text>
                </TouchableOpacity>

                <View style={styles.rightButtons}>
                    <TouchableOpacity style={[styles.submitButton, saving && styles.disabledButton]} onPress={handleSubmit} disabled={saving}>
                        {saving ? (
                            <Text style={styles.submitButtonText}>Đang lưu...</Text>
                        ) : (
                            <>
                                <Ionicons name="save" size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Lưu</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={saving}>
                        <Ionicons name="trash" size={20} color="#fff" />
                        <Text style={styles.deleteButtonText}>Xóa</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1890ff',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        paddingHorizontal: 15,
    },
    headerButton: { padding: 5 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
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
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    inputError: { borderColor: '#ff4d4f' },
    textArea: { height: 100 },
    errorText: { color: '#ff4d4f', fontSize: 12, marginTop: 4 },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: '#1890ff',
        marginLeft: 8,
    },
    disabledButton: { backgroundColor: '#bae7ff' },
    submitButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: '#ff4d4f',
        marginLeft: 8,
    },
    deleteButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    actionBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e8e8' },
    backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: '#d9d9d9', backgroundColor: '#fff' },
    backButtonText: { marginLeft: 8, fontSize: 16, color: '#666' },
    rightButtons: { flexDirection: 'row' },
});

export default ContractTypeEditScreen;

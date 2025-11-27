import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RoleService from '../../services/RoleService';

const RoleCreateScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Vui lòng nhập tên vai trò';
    }
    if (formData.description && formData.description.length > 255) {
      newErrors.description = 'Mô tả không được vượt quá 255 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };
      await RoleService.createRole(submitData);
      setTimeout(() => {
        Alert.alert('Thành công', 'Tạo vai trò thành công', [
          {
            text: 'OK',
            onPress: () => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('RoleList');
            },
          },
        ]);
      }, 100);
    } catch (error) {
      console.error('Error creating role:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi server không phản hồi';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Tên vai trò <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Nhập tên vai trò"
              value={formData.name}
              onChangeText={(v) => handleInputChange('name', v)}
              maxLength={255}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Nhập mô tả"
              value={formData.description}
              onChangeText={(v) => handleInputChange('description', v)}
              multiline
              numberOfLines={4}
              maxLength={255}
            />
            <Text style={styles.charCount}>{formData.description.length}/255</Text>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Trở về</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitButton, loading && styles.disabledButton]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Lưu</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  formContainer: { padding: 16 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 8 },
  required: { color: '#ff4d4f' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9d9d9', borderRadius: 4, padding: 12, fontSize: 16, color: '#262626' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputError: { borderColor: '#ff4d4f' },
  errorText: { color: '#ff4d4f', fontSize: 14, marginTop: 4 },
  charCount: { fontSize: 12, color: '#8c8c8c', textAlign: 'right', marginTop: 4 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e8e8' },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: '#d9d9d9', backgroundColor: '#fff' },
  backButtonText: { marginLeft: 8, fontSize: 16, color: '#666' },
  submitButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, backgroundColor: '#1890ff' },
  submitButtonText: { marginLeft: 8, fontSize: 16, color: '#fff', fontWeight: '600' },
  disabledButton: { backgroundColor: '#91d5ff' },
});

export default RoleCreateScreen;

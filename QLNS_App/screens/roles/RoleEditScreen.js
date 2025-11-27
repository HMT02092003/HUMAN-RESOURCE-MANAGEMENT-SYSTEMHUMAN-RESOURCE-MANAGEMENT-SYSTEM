import React, { useState, useEffect } from 'react';
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

const RoleEditScreen = ({ route, navigation }) => {
  const { roleId } = route.params;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchRoleDetail();
  }, [roleId]);

  const fetchRoleDetail = async () => {
    try {
      setInitialLoading(true);
      const data = await RoleService.getRoleDetail(roleId.toString());
      setFormData({ name: data.name || '', description: data.description || '' });
    } catch (error) {
      console.error('Failed to fetch role:', error);
      const errorCode = error.response?.data?.code || 'Unknown error';
      Alert.alert('Lỗi', `Lỗi: ${errorCode}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setInitialLoading(false);
    }
  };

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
      const submitData = { name: formData.name.trim(), description: formData.description.trim() };
      await RoleService.updateRole(roleId.toString(), submitData);
      setTimeout(() => {
        Alert.alert('Thành công', 'Cập nhật thành công!', [
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
      console.error('Error updating role:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi cập nhật.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Bạn xác nhận xóa vai trò này?', 'Vai trò này sẽ bị xóa vĩnh viễn', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await RoleService.deleteRole(roleId.toString());
            setTimeout(() => {
              Alert.alert('Thành công', 'Xóa thành công!', [
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
            console.error('Error deleting role:', error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi xóa.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (initialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

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

        <View style={styles.rightButtons}>
          <TouchableOpacity style={[styles.submitButton, loading && styles.disabledButton]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Lưu</Text>
            </>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={loading}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
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
  rightButtons: { flexDirection: 'row', gap: 8 },
  submitButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, backgroundColor: '#1890ff', marginRight: 8 },
  submitButtonText: { marginLeft: 8, fontSize: 16, color: '#fff', fontWeight: '600' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, backgroundColor: '#ff4d4f' },
  deleteButtonText: { marginLeft: 8, fontSize: 16, color: '#fff', fontWeight: '600' },
  disabledButton: { backgroundColor: '#91d5ff' },
});

export default RoleEditScreen;

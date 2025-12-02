import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Switch,
  HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SalaryService from '../../services/SalaryService';

// ==================== MAIN COMPONENT ====================
const AllowanceFormScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const editId = route?.params?.id;
  const isEditMode = !!editId;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    default_amount: '',
    is_taxable: false,
    description: '',
  });
  const [errors, setErrors] = useState({});

  // ==================== LOAD DATA FOR EDIT ====================
  useEffect(() => {
    if (isEditMode) {
      loadData();
    }
  }, [editId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await SalaryService.getAllowanceType(editId);
      setFormData({
        name: data.name || '',
        default_amount: data.default_amount?.toString() || '',
        is_taxable: data.is_taxable || false,
        description: data.description || '',
      });
    } catch (error) {
      console.error('Error loading allowance type:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin phụ cấp');
      navigation.navigate('Cấu hình phụ cấp');
    } finally {
      setLoading(false);
    }
  };

  // ==================== VALIDATION ====================
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên phụ cấp';
    }

    if (!formData.default_amount || isNaN(Number(formData.default_amount))) {
      newErrors.default_amount = 'Vui lòng nhập số tiền hợp lệ';
    } else if (Number(formData.default_amount) < 0) {
      newErrors.default_amount = 'Số tiền không được âm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        default_amount: Number(formData.default_amount),
        is_taxable: formData.is_taxable,
        description: formData.description.trim() || null,
      };

      if (isEditMode) {
        await SalaryService.updateAllowanceType(editId, payload);
        Alert.alert('Thành công', 'Đã cập nhật phụ cấp');
      } else {
        await SalaryService.createAllowanceType(payload);
        Alert.alert('Thành công', 'Đã tạo phụ cấp mới');
      }
      // Navigate về màn danh sách phụ cấp thay vì goBack
      navigation.navigate('Cấu hình phụ cấp');
    } catch (error) {
      console.error('Error saving allowance type:', error);
      Alert.alert('Lỗi', 'Không thể lưu phụ cấp');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('Cấu hình phụ cấp');
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Form */}
        <Surface style={styles.formContainer} elevation={1}>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Tên phụ cấp <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Nhập tên phụ cấp"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              error={!!errors.name}
              style={styles.input}
            />
            {errors.name && (
              <HelperText type="error" visible={true}>
                {errors.name}
              </HelperText>
            )}
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Số tiền phụ cấp (VNĐ) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Nhập số tiền"
              value={formData.default_amount}
              onChangeText={(text) => updateField('default_amount', text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              error={!!errors.default_amount}
              style={styles.input}
              left={<TextInput.Icon icon="cash" />}
            />
            {errors.default_amount && (
              <HelperText type="error" visible={true}>
                {errors.default_amount}
              </HelperText>
            )}
          </View>

          {/* Taxable */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#595959" />
              <Text style={styles.switchText}>Có tính thuế TNCN</Text>
            </View>
            <Switch
              value={formData.is_taxable}
              onValueChange={(value) => updateField('is_taxable', value)}
              color={theme.colors.primary}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mô tả</Text>
            <TextInput
              mode="outlined"
              placeholder="Nhập mô tả (tùy chọn)"
              value={formData.description}
              onChangeText={(text) => updateField('description', text)}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </View>
        </Surface>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.actionButton}
            icon="arrow-left"
          >
            Hủy
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={[styles.actionButton, styles.saveButton]}
            icon="content-save"
          >
            {isEditMode ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8c8c8c',
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 8,
  },
  required: {
    color: '#ff4d4f',
  },
  input: {
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#595959',
    marginLeft: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
});

export default AllowanceFormScreen;

/**
 * ============================================
 * FORM SCREEN COMPONENT
 * ============================================
 * 
 * Component form tổng quát với UI đẹp, hiện đại
 * - Grouped sections (optional)
 * - Dynamic field types: text, textarea, dropdown, date, switch
 * - Validation support
 * - Bottom action buttons
 * 
 * Props:
 * - title: string - Tiêu đề màn hình
 * - sections: array of { title?, fields: [{ name, label, type, required, ... }] }
 * - initialValues: object - Giá trị ban đầu
 * - onSubmit: async function(values) - Xử lý submit
 * - onCancel: function - Xử lý hủy
 * - submitLabel: string - Label nút submit (mặc định: "Lưu")
 * - loading: boolean
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import {
  Surface,
  Text,
  Switch,
  Button,
  useTheme
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

const FormScreen = ({
  title,
  sections = [],
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Lưu',
  loading = false
}) => {
  const theme = useTheme();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    sections.forEach(section => {
      section.fields?.forEach(field => {
        if (field.required) {
          const value = values[field.name];
          if (!value || (typeof value === 'string' && !value.trim())) {
            newErrors[field.name] = field.errorMessage || `${field.label} là bắt buộc`;
          }
        }
        // Custom validation
        if (field.validate && values[field.name]) {
          const error = field.validate(values[field.name], values);
          if (error) {
            newErrors[field.name] = error;
          }
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = values[field.name];
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'phone':
        return (
          <View style={styles.fieldContainer} key={field.name}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={[styles.inputWrapper, error && styles.inputError]}>
              {field.icon && (
                <MaterialCommunityIcons
                  name={field.icon}
                  size={20}
                  color="#8c8c8c"
                  style={styles.inputIcon}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
                value={value?.toString() || ''}
                onChangeText={(text) => handleChange(field.name, text)}
                keyboardType={
                  field.type === 'number' ? 'numeric' :
                  field.type === 'phone' ? 'phone-pad' :
                  field.type === 'email' ? 'email-address' : 'default'
                }
                editable={!field.disabled}
                maxLength={field.maxLength}
              />
            </View>
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#ff4d4f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {field.maxLength && (
              <Text style={styles.charCount}>
                {(value?.toString() || '').length}/{field.maxLength}
              </Text>
            )}
          </View>
        );

      case 'textarea':
        return (
          <View style={styles.fieldContainer} key={field.name}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={[styles.textareaWrapper, error && styles.inputError]}>
              <TextInput
                style={styles.textarea}
                placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
                value={value || ''}
                onChangeText={(text) => handleChange(field.name, text)}
                multiline
                numberOfLines={field.rows || 4}
                textAlignVertical="top"
                maxLength={field.maxLength}
              />
            </View>
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#ff4d4f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {field.maxLength && (
              <Text style={styles.charCount}>
                {(value || '').length}/{field.maxLength}
              </Text>
            )}
          </View>
        );

      case 'dropdown':
        return (
          <View style={styles.fieldContainer} key={field.name}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TouchableOpacity
              style={[styles.dropdownButton, error && styles.inputError]}
              onPress={() => setShowDropdown(field.name)}
              disabled={field.disabled}
            >
              {field.icon && (
                <MaterialCommunityIcons
                  name={field.icon}
                  size={20}
                  color="#8c8c8c"
                  style={styles.inputIcon}
                />
              )}
              <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
                {value
                  ? field.options?.find(opt => opt.value === value)?.label || value
                  : field.placeholder || `Chọn ${field.label.toLowerCase()}...`}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#8c8c8c" />
            </TouchableOpacity>
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#ff4d4f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Dropdown Modal */}
            <Modal
              visible={showDropdown === field.name}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDropdown(null)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDropdown(null)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{field.label}</Text>
                    <TouchableOpacity onPress={() => setShowDropdown(null)}>
                      <MaterialCommunityIcons name="close" size={24} color="#262626" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.optionsList}>
                    {field.options?.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionItem,
                          value === option.value && styles.optionItemActive
                        ]}
                        onPress={() => {
                          handleChange(field.name, option.value);
                          setShowDropdown(null);
                        }}
                      >
                        <Text style={[
                          styles.optionText,
                          value === option.value && styles.optionTextActive
                        ]}>
                          {option.label}
                        </Text>
                        {value === option.value && (
                          <MaterialCommunityIcons name="check" size={20} color="#1890ff" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );

      case 'date':
        return (
          <View style={styles.fieldContainer} key={field.name}>
            <Text style={styles.label}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TouchableOpacity
              style={[styles.dateButton, error && styles.inputError]}
              onPress={() => setShowDatePicker(field.name)}
              disabled={field.disabled}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color="#1890ff"
                style={styles.inputIcon}
              />
              <Text style={[styles.dateText, !value && styles.placeholderText]}>
                {value ? dayjs(value).format('DD/MM/YYYY') : `Chọn ${field.label.toLowerCase()}...`}
              </Text>
            </TouchableOpacity>
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#ff4d4f" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {showDatePicker === field.name && (
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(null);
                  if (selectedDate) {
                    handleChange(field.name, selectedDate.toISOString());
                  }
                }}
              />
            )}
          </View>
        );

      case 'switch':
        return (
          <View style={[styles.fieldContainer, styles.switchContainer]} key={field.name}>
            <View style={styles.switchLabelContainer}>
              {field.icon && (
                <MaterialCommunityIcons
                  name={field.icon}
                  size={20}
                  color="#8c8c8c"
                  style={styles.switchIcon}
                />
              )}
              <Text style={styles.label}>{field.label}</Text>
            </View>
            <Switch
              value={!!value}
              onValueChange={(val) => handleChange(field.name, val)}
              color="#1890ff"
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={onCancel}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#262626" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRight} />
        </View>
      </Surface>

      {/* Form Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section, sectionIndex) => (
          <Surface key={sectionIndex} style={styles.section} elevation={1}>
            {section.title && (
              <View style={styles.sectionHeader}>
                {section.icon && (
                  <MaterialCommunityIcons
                    name={section.icon}
                    size={20}
                    color={theme.colors.primary}
                    style={styles.sectionIcon}
                  />
                )}
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            )}
            {section.fields?.map(renderField)}
          </Surface>
        ))}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <Surface style={styles.footer} elevation={4}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.cancelButton}
          labelStyle={styles.cancelButtonLabel}
        >
          Hủy
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
          labelStyle={styles.submitButtonLabel}
          icon="content-save"
        >
          {submitLabel}
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c'
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginHorizontal: 12
  },
  headerRight: {
    width: 40
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  sectionIcon: {
    marginRight: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626'
  },
  fieldContainer: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 8
  },
  required: {
    color: '#ff4d4f'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 12,
    minHeight: 48
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#262626',
    paddingVertical: 12
  },
  inputError: {
    borderColor: '#ff4d4f'
  },
  textareaWrapper: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    padding: 12
  },
  textarea: {
    fontSize: 15,
    color: '#262626',
    minHeight: 100
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 12,
    minHeight: 48
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: '#262626'
  },
  placeholderText: {
    color: '#bfbfbf'
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 12,
    minHeight: 48
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: '#262626'
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  switchIcon: {
    marginRight: 8
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  errorText: {
    fontSize: 12,
    color: '#ff4d4f',
    marginLeft: 4
  },
  charCount: {
    fontSize: 12,
    color: '#8c8c8c',
    textAlign: 'right',
    marginTop: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626'
  },
  optionsList: {
    maxHeight: 400
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  optionItemActive: {
    backgroundColor: '#e6f7ff'
  },
  optionText: {
    fontSize: 15,
    color: '#262626'
  },
  optionTextActive: {
    color: '#1890ff',
    fontWeight: '500'
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#d9d9d9'
  },
  cancelButtonLabel: {
    fontSize: 15,
    fontWeight: '500'
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#1890ff'
  },
  submitButtonLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  bottomPadding: {
    height: 32
  }
});

export default FormScreen;

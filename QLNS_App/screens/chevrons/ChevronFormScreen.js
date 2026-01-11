import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import FormScreen from '../../components/FormScreen';
import { ChevronService } from '../../services/ChevronService';

const ChevronFormScreen = ({ navigation, route }) => {
  const { mode = 'create', chevronId } = route.params || {};
  const isEditMode = mode === 'edit';
  
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (isEditMode && chevronId) {
      loadChevronData();
    }
  }, [isEditMode, chevronId]);

  const loadChevronData = async () => {
    setLoading(true);
    try {
      const response = await ChevronService.getChevronDetail(chevronId);
      const chevron = response?.data || response;
      setInitialValues({
        name: chevron.name || '',
        description: chevron.description || ''
      });
    } catch (error) {
      console.error('Error loading chevron:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin chức vụ');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formSections = [
    {
      fields: [
        {
          name: 'name',
          label: 'Tên chức vụ',
          type: 'text',
          icon: 'shield-star',
          required: true,
          placeholder: 'Nhập tên chức vụ...',
          errorMessage: 'Vui lòng nhập tên chức vụ'
        },
        {
          name: 'description',
          label: 'Mô tả',
          type: 'textarea',
          icon: 'text',
          placeholder: 'Nhập mô tả về chức vụ...',
          rows: 4,
          maxLength: 255
        }
      ]
    }
  ];

  const handleSubmit = async (values) => {
    try {
      if (isEditMode) {
        await ChevronService.updateChevron(chevronId, values);
        Alert.alert('✅ Thành công', 'Đã cập nhật chức vụ', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ChevronService.createChevron(values);
        Alert.alert('✅ Thành công', 'Đã tạo chức vụ mới', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error submitting chevron:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu chức vụ');
      throw error;
    }
  };

  return (
    <FormScreen
      title={isEditMode ? 'Chỉnh sửa chức vụ' : 'Tạo chức vụ mới'}
      sections={formSections}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={() => navigation.goBack()}
      submitLabel={isEditMode ? 'Cập nhật' : 'Tạo mới'}
      loading={loading}
    />
  );
};

export default ChevronFormScreen;

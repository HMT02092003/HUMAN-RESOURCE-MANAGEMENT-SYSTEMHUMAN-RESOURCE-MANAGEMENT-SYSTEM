import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import FormScreen from '../../components/FormScreen';
import { DepartmentService } from '../../services/DepartmentService';

const DepartmentFormScreen = ({ navigation, route }) => {
  const { mode = 'create', departmentId } = route.params || {};
  const isEditMode = mode === 'edit';
  
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (isEditMode && departmentId) {
      loadDepartmentData();
    }
  }, [isEditMode, departmentId]);

  const loadDepartmentData = async () => {
    setLoading(true);
    try {
      const response = await DepartmentService.getDepartmentDetail(departmentId);
      const dept = response?.data || response;
      setInitialValues({
        name: dept.name || '',
        description: dept.description || ''
      });
    } catch (error) {
      console.error('Error loading department:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin phòng ban');
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
          label: 'Tên phòng ban',
          type: 'text',
          icon: 'office-building',
          required: true,
          placeholder: 'Nhập tên phòng ban...',
          errorMessage: 'Vui lòng nhập tên phòng ban'
        },
        {
          name: 'description',
          label: 'Mô tả',
          type: 'textarea',
          icon: 'text',
          placeholder: 'Nhập mô tả về phòng ban...',
          rows: 4,
          maxLength: 255
        }
      ]
    }
  ];

  const handleSubmit = async (values) => {
    try {
      if (isEditMode) {
        await DepartmentService.updateDepartment(departmentId, values);
        Alert.alert('✅ Thành công', 'Đã cập nhật phòng ban', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await DepartmentService.createDepartment(values);
        Alert.alert('✅ Thành công', 'Đã tạo phòng ban mới', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error submitting department:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu phòng ban');
      throw error;
    }
  };

  return (
    <FormScreen
      title={isEditMode ? 'Chỉnh sửa phòng ban' : 'Tạo phòng ban mới'}
      sections={formSections}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={() => navigation.goBack()}
      submitLabel={isEditMode ? 'Cập nhật' : 'Tạo mới'}
      loading={loading}
    />
  );
};

export default DepartmentFormScreen;

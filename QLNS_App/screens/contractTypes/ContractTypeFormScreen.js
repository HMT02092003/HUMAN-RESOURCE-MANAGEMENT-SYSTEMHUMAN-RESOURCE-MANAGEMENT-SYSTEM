import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import FormScreen from '../../components/FormScreen';
import { ContractTypeService } from '../../services/ContractTypeService';

const ContractTypeFormScreen = ({ navigation, route }) => {
  const { mode = 'create', contractTypeId } = route.params || {};
  const isEditMode = mode === 'edit';
  
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (isEditMode && contractTypeId) {
      loadContractTypeData();
    }
  }, [isEditMode, contractTypeId]);

  const loadContractTypeData = async () => {
    setLoading(true);
    try {
      const response = await ContractTypeService.getContractTypeDetail(contractTypeId);
      const contractType = response?.data || response;
      setInitialValues({
        name: contractType.name || '',
        description: contractType.description || ''
      });
    } catch (error) {
      console.error('Error loading contract type:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin loại hợp đồng');
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
          label: 'Tên loại hợp đồng',
          type: 'text',
          icon: 'file-document',
          required: true,
          placeholder: 'Nhập tên loại hợp đồng...',
          errorMessage: 'Vui lòng nhập tên loại hợp đồng'
        },
        {
          name: 'description',
          label: 'Mô tả',
          type: 'textarea',
          icon: 'text',
          placeholder: 'Nhập mô tả về loại hợp đồng...',
          rows: 4,
          maxLength: 255
        }
      ]
    }
  ];

  const handleSubmit = async (values) => {
    try {
      if (isEditMode) {
        await ContractTypeService.updateContractType(contractTypeId, values);
        Alert.alert('✅ Thành công', 'Đã cập nhật loại hợp đồng', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ContractTypeService.createContractType(values);
        Alert.alert('✅ Thành công', 'Đã tạo loại hợp đồng mới', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error submitting contract type:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu loại hợp đồng');
      throw error;
    }
  };

  return (
    <FormScreen
      title={isEditMode ? 'Chỉnh sửa loại hợp đồng' : 'Tạo loại hợp đồng mới'}
      sections={formSections}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={() => navigation.goBack()}
      submitLabel={isEditMode ? 'Cập nhật' : 'Tạo mới'}
      loading={loading}
    />
  );
};

export default ContractTypeFormScreen;

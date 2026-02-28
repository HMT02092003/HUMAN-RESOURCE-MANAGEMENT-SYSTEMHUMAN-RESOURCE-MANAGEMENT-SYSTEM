import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import FormScreen from '../../components/FormScreen';
import { ContractTypeService } from '../../services/ContractTypeService';

const CONTRACT_TYPE_OPTIONS = [
  { value: 1, label: 'Hợp đồng thử việc' },
  { value: 2, label: 'Hợp đồng có thời hạn' },
  { value: 3, label: 'Hợp đồng không thời hạn' },
];

const ContractTypeFormScreen = ({ navigation, route }) => {
  const { mode = 'create', contractTypeId } = route.params || {};
  const isEditMode = mode === 'edit';
  
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: '',
    contractTerm: '',
    type: '',
    insurance: '',
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
        description: contractType.description || '',
        contractTerm: contractType.contractTerm != null ? String(contractType.contractTerm) : '',
        type: contractType.type != null ? String(contractType.type) : '',
        insurance: contractType.insurance != null ? String(contractType.insurance) : '',
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
      title: 'Thông tin cơ bản',
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
    },
    {
      title: 'Chi tiết hợp đồng',
      fields: [
        {
          name: 'type',
          label: 'Loại',
          type: 'dropdown',
          icon: 'format-list-bulleted',
          required: true,
          options: CONTRACT_TYPE_OPTIONS,
          errorMessage: 'Vui lòng chọn loại hợp đồng'
        },
        {
          name: 'contractTerm',
          label: 'Thời hạn hợp đồng (tháng)',
          type: 'number',
          icon: 'calendar-clock',
          required: true,
          placeholder: 'Nhập thời hạn (tháng)...',
          errorMessage: 'Vui lòng nhập thời hạn hợp đồng'
        },
        {
          name: 'insurance',
          label: 'Bảo hiểm (VND)',
          type: 'number',
          icon: 'shield-check',
          required: true,
          placeholder: 'Nhập số tiền bảo hiểm...',
          errorMessage: 'Vui lòng nhập số tiền bảo hiểm'
        }
      ]
    }
  ];

  const handleSubmit = async (values) => {
    try {
      // Convert numeric fields from string to number
      const payload = {
        name: values.name,
        description: values.description || '',
        contractTerm: Number(values.contractTerm) || 0,
        type: Number(values.type) || 1,
        insurance: Number(values.insurance) || 0,
      };

      if (isEditMode) {
        await ContractTypeService.updateContractType(contractTypeId, payload);
        Alert.alert('✅ Thành công', 'Đã cập nhật loại hợp đồng', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ContractTypeService.createContractType(payload);
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

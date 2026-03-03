import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, Modal, ScrollView } from 'react-native';
import { Card, Text, TextInput, HelperText, Button, Divider, IconButton, List } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { ContractTypeService } from '../services/ContractTypeService';
import { ChevronService } from '../services/ChevronService';
import DepartmentService from '../services/DepartmentService';
import SalaryService from '../services/SalaryService';

/**
 * Props:
 * - initialValues: object (may be null/undefined)
 * - isEdit: boolean
 * - roles, departments, chevrons: arrays
 * - onSubmit(values, photo) => Promise
 * - onCancel()
 */
const UserFormComponent = ({ initialValues = {}, isEdit = false, roles = [], departments = [], chevrons = [], contractTypes = [], onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    rePassword: '',
    fullName: '',
    email: '',
    birthday: null,
    gender: null,
    phone: '',
    status: 1,
    roleId: null,
    startDate: new Date(),
    chevronId: null,
    contractTypeId: null,
    departmentId: null,
    identificationPhoto: null,
    // Contract fields
    salary: '',
    contractSignDate: null,
    contractActiveDay: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Date pickers
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  // Selection modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showChevronModal, setShowChevronModal] = useState(false);
  const [showContractTypeModal, setShowContractTypeModal] = useState(false);

  const [localContractTypes, setLocalContractTypes] = useState(contractTypes || []);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [contractTypesLoading, setContractTypesLoading] = useState(false);
  const [localDepartments, setLocalDepartments] = useState([]);
  const [localChevrons, setLocalChevrons] = useState([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [selectedAllowanceTypeIds, setSelectedAllowanceTypeIds] = useState([]);
  const [showContractSignDatePicker, setShowContractSignDatePicker] = useState(false);
  const [showContractActiveDayPicker, setShowContractActiveDayPicker] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);

  const genderOptions = [
    { key: 1, value: 'Nam' },
    { key: 2, value: 'Nữ' },
    { key: 3, value: 'Khác' },
  ];

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setForm((f) => ({
        ...f,
        username: initialValues.username || '',
        fullName: initialValues.fullName || '',
        email: initialValues.email || '',
        birthday: initialValues.birthday ? new Date(initialValues.birthday) : null,
        gender: initialValues.gender || null,
        phone: initialValues.phone || '',
        status: initialValues.status === '1' || initialValues.status === 1 ? 1 : 0,
        roleId: initialValues.role?.id || null,
        startDate: initialValues.startDate ? new Date(initialValues.startDate) : new Date(),
        chevronId: initialValues.chevron?.id || null,
        departmentId: initialValues.department?.id || null,
        contractTypeId: initialValues.contractTypeId || initialValues.contractType?.id || null,
        contractTerm: initialValues.contractTerm || initialValues.contractType?.contractTerm || null,
        contractInsurance: initialValues.insurance || initialValues.contractType?.insurance || null,
        identificationPhoto: initialValues.identificationPhoto || null,
        salary: initialValues.salary || initialValues.contract?.salary || '',
        contractSignDate: initialValues.contract?.startDate ? new Date(initialValues.contract.startDate) : null,
        contractActiveDay: initialValues.contract?.activeDay ? new Date(initialValues.contract.activeDay) : null,
      }));
    } else {
      // Reset for create to avoid stale values
      setForm({
        username: '',
        password: '',
        rePassword: '',
        fullName: '',
        email: '',
        birthday: null,
        gender: null,
        phone: '',
        status: 1,
        roleId: null,
        startDate: new Date(),
        chevronId: null,
        departmentId: null,
        contractTypeId: null,
        contractTerm: null,
        contractInsurance: null,
        identificationPhoto: null,
        salary: '',
        contractSignDate: null,
        contractActiveDay: null,
      });
    }
    setErrors({});
    // For edit mode: load filtered dept/chevron for the existing role
    if (initialValues?.role?.id) {
      loadFilteredForRole(initialValues.role.id);
    } else if (!initialValues || Object.keys(initialValues).length === 0) {
      // Reset for create mode
      setLocalDepartments([]);
      setLocalChevrons([]);
    }
  }, [initialValues]);

  useEffect(() => {
    // debug: log contractTypes passed from parent
    console.log('[UserFormComponent] contractTypes prop received:', Array.isArray(contractTypes) ? contractTypes.length : 'not-array');
    if (Array.isArray(contractTypes) && contractTypes.length > 0) {
      console.log('[UserFormComponent] First 3 contractTypes:', JSON.stringify(contractTypes.slice(0, 3), null, 2));
    }
  }, [contractTypes]);

  useEffect(() => {
    setLocalContractTypes(contractTypes || []);
  }, [contractTypes]);

  // Tự động load contract types nếu prop rỗng
  useEffect(() => {
    if ((!contractTypes || contractTypes.length === 0) && !contractTypesLoading) {
      console.log('[UserFormComponent] contractTypes empty, auto-loading...');
      reloadContractTypes();
    }
  }, []);

  // Load allowance types
  useEffect(() => {
    const loadAllowanceTypes = async () => {
      try {
        const res = await SalaryService.getAllAllowanceTypes();
        const data = res?.data ?? res ?? [];
        setAllowanceTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('[UserFormComponent] loadAllowanceTypes failed:', err.message);
      }
    };
    loadAllowanceTypes();
  }, []);

  const reloadContractTypes = async () => {
    console.log('[UserFormComponent] reloadContractTypes called');
    setContractTypesLoading(true);
    try {
      const types = await ContractTypeService.getAllContractTypes();
      console.log('[UserFormComponent] reloadContractTypes fetched:', types?.length || 0);
      if (Array.isArray(types)) {
        setLocalContractTypes(types);
      } else {
        console.warn('[UserFormComponent] Unexpected response type:', typeof types);
        setLocalContractTypes([]);
      }
    } catch (err) {
      console.error('[UserFormComponent] reloadContractTypes failed:', err.message);
      setLocalContractTypes([]);
    } finally {
      setContractTypesLoading(false);
    }
  };

  const loadFilteredForRole = async (roleId) => {
    if (!roleId) return;
    setRoleLoading(true);
    try {
      const [depts, chevs] = await Promise.all([
        DepartmentService.getAllDepartmentsForSelect(), // Omit roleId to fetch all items for all roles
        ChevronService.getAllChevronsForSelect(), // Omit roleId to fetch all items for all roles
      ]);
      setLocalDepartments(Array.isArray(depts) ? depts : []);
      setLocalChevrons(Array.isArray(chevs) ? chevs : []);
    } catch (err) {
      console.error('[UserFormComponent] loadFilteredForRole error:', err);
      setLocalDepartments([]);
      setLocalChevrons([]);
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRoleChange = async (roleId) => {
    setForm(f => ({ ...f, roleId, departmentId: null, chevronId: null }));
    setErrors(e => ({ ...e, roleId: null, departmentId: null, chevronId: null }));
    setLocalDepartments([]);
    setLocalChevrons([]);
    await loadFilteredForRole(roleId);
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getContractEndDate = () => {
    if (!form.contractActiveDay || !form.contractTerm) return null;
    const d = new Date(form.contractActiveDay);
    d.setMonth(d.getMonth() + Number(form.contractTerm));
    return d;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.username?.trim()) newErrors.username = 'Vui lòng nhập tên đăng nhập';
    if (!isEdit) {
      if (!form.password) newErrors.password = 'Vui lòng nhập mật khẩu';
      if (form.password !== form.rePassword) newErrors.rePassword = 'Mật khẩu không khớp';
      if (form.password && form.password.length < 6) newErrors.password = 'Mật khẩu phải ít nhất 6 ký tự';
    }
    if (!form.fullName?.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    if (!form.email?.trim()) newErrors.email = 'Vui lòng nhập email';
    if (!form.phone?.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại';
    if (!form.roleId) newErrors.roleId = 'Vui lòng chọn vai trò';
    if (!form.departmentId) newErrors.departmentId = 'Vui lòng chọn phòng ban';
    if (!form.chevronId) newErrors.chevronId = 'Vui lòng chọn chức vụ';
    if (!form.startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm({ ...form, identificationPhoto: result.assets[0] });
      }
    } catch (error) {
      console.error('pick image error', error);
    }
  };

  const onPressSubmit = async () => {
    if (!validateForm()) return;
    const payload = {
      username: form.username,
      fullName: form.fullName,
      email: form.email,
      birthday: form.birthday ? formatDateToYYYYMMDD(form.birthday) : null,
      gender: form.gender,
      phone: form.phone,
      status: form.status,
      roleId: form.roleId,
      startDate: formatDateToYYYYMMDD(form.startDate),
      chevronId: form.chevronId,
      departmentId: form.departmentId,
      // Nest contract data like web frontend
      contract: {
        contractTypeId: form.contractTypeId,
        startDate: formatDateToYYYYMMDD(form.contractSignDate),
        activeDay: formatDateToYYYYMMDD(form.contractActiveDay || form.startDate),
        endDate: formatDateToYYYYMMDD(getContractEndDate()),
        salary: form.salary ? Number(form.salary) : 0,
        allowance_type_ids: selectedAllowanceTypeIds,
      },
    };
    if (!isEdit) payload.password = form.password;

    try {
      setLoading(true);
      await onSubmit(payload, form.identificationPhoto);
    } catch (error) {
      console.error('submit error', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'Chọn ngày';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getLabelById = (list, id, fallback) => {
    if (!list || list.length === 0) return fallback;
    const found = list.find((i) => {
      // support multiple id field names
      return i?.id === id || i?._id === id || i?.value === id || i?.key === id;
    });
    return found ? found.name || found.label || found.value || fallback : fallback;
  };

  const getGenderLabel = () => {
    const gender = genderOptions.find(g => g.key === form.gender);
    return gender ? gender.value : 'Chọn giới tính';
  };

  const renderSelectionModal = (visible, setVisible, items, onSelect, title) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <IconButton icon="close" size={24} onPress={() => setVisible(false)} />
          </View>
          <Divider />
          <ScrollView>
            {(items || []).map((item, index) => (
              <List.Item
                key={String(item?.id || item?._id || item?.key || index)}
                title={item.name || item.value || item.label}
                description={item.description}
                onPress={() => {
                  console.log('Selection modal pick:', title, item);
                  onSelect(item);
                  setVisible(false);
                }}
                style={styles.listItem}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View>
      {/* Photo */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Ảnh nhận diện (Tùy chọn)</Text>
          <Divider style={styles.divider} />
          <View style={{ alignItems: 'center' }}>
            {form.identificationPhoto ? (
              <View>
                <Image source={{ uri: typeof form.identificationPhoto === 'string' ? form.identificationPhoto : form.identificationPhoto.uri }} style={styles.photo} />
                <IconButton icon="close" onPress={() => setForm({ ...form, identificationPhoto: null })} />
              </View>
            ) : (
              <TouchableOpacity onPress={handlePickImage} style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus" size={40} color="#8c8c8c" />
                <Text style={{ marginTop: 8 }}>Chọn ảnh</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Login info (create only) or readonly username (edit) */}
      {!isEdit ? (
        <Card style={styles.card}>
          <Card.Content>
            <TextInput label="Tên đăng nhập *" value={form.username} onChangeText={(t) => setForm({ ...form, username: t })} style={styles.input} />
            {errors.username && <HelperText type="error">{errors.username}</HelperText>}
            <TextInput label="Mật khẩu *" secureTextEntry value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} style={styles.input} />
            {errors.password && <HelperText type="error">{errors.password}</HelperText>}
            <TextInput label="Xác nhận mật khẩu *" secureTextEntry value={form.rePassword} onChangeText={(t) => setForm({ ...form, rePassword: t })} style={styles.input} />
            {errors.rePassword && <HelperText type="error">{errors.rePassword}</HelperText>}
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <TextInput label="Tên đăng nhập" value={form.username} disabled style={styles.input} />
          </Card.Content>
        </Card>
      )}

      {/* Personal */}
      <Card style={styles.card}>
        <Card.Content>
          <TextInput label="Họ và tên *" value={form.fullName} onChangeText={(t) => setForm({ ...form, fullName: t })} style={styles.input} />
          {errors.fullName && <HelperText type="error">{errors.fullName}</HelperText>}
          <TextInput label="Email *" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} style={styles.input} />
          {errors.email && <HelperText type="error">{errors.email}</HelperText>}
          <TouchableOpacity onPress={() => setShowBirthdayPicker(true)}>
            <TextInput label="Ngày sinh" value={formatDateDisplay(form.birthday)} editable={false} style={styles.input} pointerEvents="none" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGenderModal(true)}>
            <TextInput label="Giới tính" value={getGenderLabel()} editable={false} style={styles.input} pointerEvents="none" right={<TextInput.Icon icon="chevron-down" />} />
          </TouchableOpacity>
          <TextInput label="Số điện thoại *" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} style={styles.input} />
          {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}
        </Card.Content>
      </Card>

      {/* Work Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Thông tin công việc</Text>
          <Divider style={styles.divider} />
          <TouchableOpacity onPress={() => setShowRoleModal(true)}>
            <TextInput label="Vai trò *" value={getLabelById(roles, form.roleId, 'Chọn vai trò')} editable={false} style={styles.input} pointerEvents="none" right={<TextInput.Icon icon="chevron-down" />} />
          </TouchableOpacity>
          {errors.roleId && <HelperText type="error">{errors.roleId}</HelperText>}
          <TouchableOpacity onPress={() => !roleLoading && form.roleId && setShowDepartmentModal(true)}>
            <TextInput
              label="Phòng ban *"
              value={!form.roleId ? 'Chọn vai trò trước' : roleLoading ? 'Đang tải...' : getLabelById(localDepartments, form.departmentId, 'Chọn phòng ban')}
              editable={false}
              style={[styles.input, { opacity: !form.roleId ? 0.6 : 1 }]}
              pointerEvents="none"
              right={<TextInput.Icon icon="chevron-down" />}
            />
          </TouchableOpacity>
          {errors.departmentId && <HelperText type="error">{errors.departmentId}</HelperText>}
          <TouchableOpacity onPress={() => !roleLoading && form.roleId && setShowChevronModal(true)}>
            <TextInput
              label="Chức vụ *"
              value={!form.roleId ? 'Chọn vai trò trước' : roleLoading ? 'Đang tải...' : getLabelById(localChevrons, form.chevronId, 'Chọn chức vụ')}
              editable={false}
              style={[styles.input, { opacity: !form.roleId ? 0.6 : 1 }]}
              pointerEvents="none"
              right={<TextInput.Icon icon="chevron-down" />}
            />
          </TouchableOpacity>
          {errors.chevronId && <HelperText type="error">{errors.chevronId}</HelperText>}
          <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
            <TextInput label="Ngày bắt đầu *" value={formatDateDisplay(form.startDate)} editable={false} style={styles.input} pointerEvents="none" right={<TextInput.Icon icon="chevron-down" />} />
          </TouchableOpacity>
          {errors.startDate && <HelperText type="error">{errors.startDate}</HelperText>}
        </Card.Content>
      </Card>

      {/* Contract Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Thông tin hợp đồng</Text>
          <Divider style={styles.divider} />
          <View>
            <TouchableOpacity onPress={() => setShowContractTypeModal(true)}>
              <TextInput label="Loại hợp đồng" value={getLabelById(localContractTypes, form.contractTypeId, 'Chọn loại hợp đồng')} editable={false} style={styles.input} pointerEvents="none" right={<TextInput.Icon icon="chevron-down" />} />
            </TouchableOpacity>
            {contractTypesLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: '#1890ff', marginRight: 8 }}>Đang tải loại hợp đồng...</Text>
              </View>
            ) : (!localContractTypes || localContractTypes.length === 0) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: '#8c8c8c', marginRight: 8 }}>Không có loại hợp đồng</Text>
                <Button mode="outlined" compact onPress={reloadContractTypes}>Tải lại</Button>
              </View>
            )}
          </View>

          {/* Show read-only contract fields populated from selected contract type */}
          <View style={{ marginTop: 8 }}>
            <TextInput label="Thời hạn hợp đồng (tháng)" value={form.contractTerm !== null && form.contractTerm !== undefined ? String(form.contractTerm) : ''} editable={false} style={styles.input} />
            <TextInput label="Bảo hiểm (VND)" value={form.contractInsurance !== null && form.contractInsurance !== undefined ? String(form.contractInsurance) : ''} editable={false} style={styles.input} />
          </View>
          <TextInput
            label="Lương cơ bản (VND)"
            value={form.salary?.toString() || ''}
            onChangeText={(t) => setForm({ ...form, salary: t })}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Nhập lương cơ bản..."
          />
          <TouchableOpacity onPress={() => setShowContractSignDatePicker(true)}>
            <TextInput label="Ngày ký hợp đồng" value={formatDateDisplay(form.contractSignDate)} editable={false} style={styles.input} pointerEvents="none" right={<TextInput.Icon icon="calendar" />} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowContractActiveDayPicker(true)}>
            <TextInput label="Ngày hiệu lực" value={formatDateDisplay(form.contractActiveDay)} editable={false} style={styles.input} pointerEvents="none" right={<TextInput.Icon icon="calendar" />} />
          </TouchableOpacity>
          {getContractEndDate() && (
            <TextInput label="Ngày kết thúc (tự tính)" value={formatDateDisplay(getContractEndDate())} editable={false} style={styles.input} />
          )}
          <TouchableOpacity onPress={() => setShowAllowanceModal(true)}>
            <TextInput
              label="Phụ cấp"
              value={selectedAllowanceTypeIds.length > 0 ? `Đã chọn ${selectedAllowanceTypeIds.length} loại phụ cấp` : 'Chọn phụ cấp...'}
              editable={false}
              style={styles.input}
              pointerEvents="none"
              right={<TextInput.Icon icon="chevron-down" />}
            />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button mode="outlined" onPress={onCancel} style={styles.cancelBtn}>Hủy</Button>
        <Button mode="contained" loading={loading} onPress={onPressSubmit} style={styles.submitBtn}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
      </View>

      {showBirthdayPicker && (
        <DateTimePicker value={form.birthday || new Date()} mode="date" display="spinner" onChange={(e, d) => { setShowBirthdayPicker(false); if (d) setForm({ ...form, birthday: d }); }} />
      )}
      {showStartDatePicker && (
        <DateTimePicker value={form.startDate || new Date()} mode="date" display="spinner" onChange={(e, d) => { setShowStartDatePicker(false); if (d) setForm({ ...form, startDate: d }); }} />
      )}
      {showContractSignDatePicker && (
        <DateTimePicker value={form.contractSignDate || new Date()} mode="date" display="spinner" onChange={(e, d) => { setShowContractSignDatePicker(false); if (d) setForm({ ...form, contractSignDate: d }); }} />
      )}
      {showContractActiveDayPicker && (
        <DateTimePicker value={form.contractActiveDay || new Date()} mode="date" display="spinner" onChange={(e, d) => { setShowContractActiveDayPicker(false); if (d) setForm({ ...form, contractActiveDay: d }); }} />
      )}

      {/* Selection Modals */}
      {renderSelectionModal(showRoleModal, setShowRoleModal, roles, (item) => {
        handleRoleChange(item.id);
      }, 'Chọn vai trò')}

      {renderSelectionModal(showDepartmentModal, setShowDepartmentModal, localDepartments, (item) => {
        setForm({ ...form, departmentId: item.id });
        setErrors({ ...errors, departmentId: null });
      }, 'Chọn phòng ban')}

      {renderSelectionModal(showChevronModal, setShowChevronModal, localChevrons, (item) => {
        setForm({ ...form, chevronId: item.id });
        setErrors({ ...errors, chevronId: null });
      }, 'Chọn chức vụ')}

      {renderSelectionModal(showContractTypeModal, setShowContractTypeModal, localContractTypes, (item) => {
        setForm({
          ...form,
          contractTypeId: item.id || item._id || item.key || item.value,
          contractTerm: item.contractTerm || item.contractTerm === 0 ? item.contractTerm : form.contractTerm,
          contractInsurance: item.insurance || item.insurance === 0 ? item.insurance : form.contractInsurance,
        });
      }, 'Chọn loại hợp đồng')}

      {renderSelectionModal(showGenderModal, setShowGenderModal, genderOptions, (item) => {
        setForm({ ...form, gender: item.key });
      }, 'Chọn giới tính')}

      {/* Allowance Type Multi-Select Modal */}
      <Modal visible={showAllowanceModal} transparent animationType="slide" onRequestClose={() => setShowAllowanceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phụ cấp</Text>
              <IconButton icon="close" size={24} onPress={() => setShowAllowanceModal(false)} />
            </View>
            <Divider />
            <ScrollView>
              {(allowanceTypes || []).map((item, index) => {
                const isSelected = selectedAllowanceTypeIds.includes(item.id);
                return (
                  <List.Item
                    key={String(item.id || index)}
                    title={item.name}
                    description={item.description}
                    left={() => (
                      <MaterialCommunityIcons
                        name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isSelected ? '#1890ff' : '#d9d9d9'}
                        style={{ alignSelf: 'center', marginLeft: 16 }}
                      />
                    )}
                    onPress={() => {
                      setSelectedAllowanceTypeIds(prev =>
                        isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                      );
                    }}
                    style={styles.listItem}
                  />
                );
              })}
            </ScrollView>
            <View style={{ padding: 16 }}>
              <Button mode="contained" onPress={() => setShowAllowanceModal(false)}>Xong ({selectedAllowanceTypeIds.length} đã chọn)</Button>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  divider: { marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: '#fff' },
  photo: { width: 140, height: 140, borderRadius: 70, alignSelf: 'center' },
  photoPlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  cancelBtn: {
    flex: 1,
    marginRight: 8,
  },
  submitBtn: {
    flex: 1,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listItem: {
    paddingVertical: 12,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default UserFormComponent;

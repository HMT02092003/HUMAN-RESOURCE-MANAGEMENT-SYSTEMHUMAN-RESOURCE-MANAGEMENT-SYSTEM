import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Surface,
  Text,
  TextInput,
  Button,
  HelperText,
  useTheme,
  ActivityIndicator,
  IconButton,
  Card,
  Chip,
  Divider,
  Menu,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import UserService from '../../services/UserService';
import DepartmentService from '../../services/DepartmentService';
import RoleService from '../../services/RoleService';
import { ChevronService } from '../../services/ChevronService';

const UserFormScreen = ({ route, navigation }) => {
  const { userId, mode } = route.params || {}; // mode: 'create' or 'edit'
  const isEdit = mode === 'edit';
  const theme = useTheme();

  // Form state
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
    departmentId: null,
    identificationPhoto: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Dropdown data
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [chevrons, setChevrons] = useState([]);

  // Date picker states
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  // Dropdown menu states
  const [genderMenuVisible, setGenderMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const [departmentMenuVisible, setDepartmentMenuVisible] = useState(false);
  const [chevronMenuVisible, setChevronMenuVisible] = useState(false);

  const genderOptions = [
    { key: 1, value: 'Nam' },
    { key: 2, value: 'Nữ' },
    { key: 3, value: 'Khác' },
  ];

  const statusOptions = [
    { value: 1, label: 'Hoạt động' },
    { value: 0, label: 'Ngưng hoạt động' },
  ];

  useEffect(() => {
    loadFormData();
  }, [userId]);

  const loadFormData = async () => {
    try {
      setDataLoading(true);

      // Load dropdown options - only roles initially; dept/chevron loaded after role selection
      const rolesData = await RoleService.getAllRoles();
      setRoles(rolesData || []);
      setDepartments([]);
      setChevrons([]);

      // If edit mode, load user data
      if (isEdit && userId) {
        // Convert userId to number if it's a string
        const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        console.log('📥 [UserForm] Loading user detail with ID:', numericUserId, 'Type:', typeof numericUserId);

        const userData = await UserService.getUserDetail(numericUserId);
        console.log('✅ [UserForm] User data loaded:', JSON.stringify(userData, null, 2));

        // Parse and set form data
        const formData = {
          username: userData.username || '',
          password: '',
          rePassword: '',
          fullName: userData.fullName || '',
          email: userData.email || '',
          birthday: userData.birthday ? new Date(userData.birthday) : null,
          gender: userData.gender || null,
          phone: userData.phone || '',
          status: userData.status === '1' || userData.status === 'active' ? 1 : 0,
          roleId: userData.role?.id || null,
          startDate: userData.startDate ? new Date(userData.startDate) : new Date(),
          chevronId: userData.chevron?.id || null,
          departmentId: userData.department?.id || null,
          identificationPhoto: userData.identificationPhoto || null,
        };

        console.log('📝 [UserForm] Form data to set:', JSON.stringify(formData, null, 2));
        setForm(formData);
        console.log('✅ [UserForm] Form state updated');

        // Load filtered departments/chevrons for the user's current role
        if (formData.roleId) {
          const [depts, chevs] = await Promise.all([
            DepartmentService.getAllDepartmentsForSelect(formData.roleId),
            ChevronService.getAllChevronsForSelect(formData.roleId),
          ]);
          setDepartments(Array.isArray(depts) ? depts : []);
          setChevrons(Array.isArray(chevs) ? chevs : []);
        }
      }
    } catch (error) {
      console.error('❌ [UserForm] Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu form');
    } finally {
      setDataLoading(false);
    }
  };

  const handleRoleChange = async (roleId) => {
    setForm(f => ({ ...f, roleId, departmentId: null, chevronId: null }));
    setErrors(e => ({ ...e, roleId: null, departmentId: null, chevronId: null }));
    setDepartments([]);
    setChevrons([]);
    if (!roleId) return;
    try {
      const [depts, chevs] = await Promise.all([
        DepartmentService.getAllDepartmentsForSelect(roleId),
        ChevronService.getAllChevronsForSelect(roleId),
      ]);
      setDepartments(Array.isArray(depts) ? depts : []);
      setChevrons(Array.isArray(chevs) ? chevs : []);
    } catch (err) {
      console.error('[UserFormScreen] handleRoleChange error:', err);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username
    if (!form.username?.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (form.username.length < 3) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
    }

    // Password (only for create mode)
    if (!isEdit) {
      if (!form.password?.trim()) {
        newErrors.password = 'Vui lòng nhập mật khẩu';
      } else if (form.password.length < 6) {
        newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      }

      if (!form.rePassword?.trim()) {
        newErrors.rePassword = 'Vui lòng xác nhận mật khẩu';
      } else if (form.password !== form.rePassword) {
        newErrors.rePassword = 'Mật khẩu không khớp';
      }
    }

    // Full name
    if (!form.fullName?.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    } else if (form.fullName.length > 100) {
      newErrors.fullName = 'Họ và tên không được vượt quá 100 ký tự';
    }

    // Email
    if (!form.email?.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Phone
    if (!form.phone?.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^0\d{9}$/.test(form.phone)) {
      newErrors.phone = 'SĐT phải bắt đầu bằng 0 và có 10 chữ số';
    }

    // Required fields
    if (!form.roleId) newErrors.roleId = 'Vui lòng chọn vai trò';
    if (!form.startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!form.chevronId) newErrors.chevronId = 'Vui lòng chọn chức vụ';
    if (!form.departmentId) newErrors.departmentId = 'Vui lòng chọn phòng ban';

    // Photo (only required for create mode)
    if (!isEdit && !form.identificationPhoto) {
      newErrors.identificationPhoto = 'Vui lòng tải ảnh nhận diện';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    try {
      setLoading(true);

      // Format dates to YYYY-MM-DD
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
      };

      // Add password only for create mode
      if (!isEdit) {
        payload.password = form.password;
      }

      // Handle photo upload if changed
      if (form.identificationPhoto && typeof form.identificationPhoto === 'object' && form.identificationPhoto.uri) {
        // Photo is a new upload, need to send as multipart
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          formData.append(key, payload[key]);
        });

        const photoFile = {
          uri: form.identificationPhoto.uri,
          type: 'image/jpeg',
          name: 'identificationPhoto.jpg',
        };
        formData.append('identificationPhoto', photoFile);
        payload._formData = formData;
      }

      if (isEdit) {
        // Convert userId to number if it's a string
        const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        console.log('✏️ [UserForm] Updating user ID:', numericUserId, 'Type:', typeof numericUserId);

        await UserService.updateUser(numericUserId, payload);
        Alert.alert('Thành công', 'Cập nhật người dùng thành công', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await UserService.createUser(payload);
        Alert.alert('Thành công', 'Tạo người dùng thành công', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('❌ [UserForm] Error submitting:', error);
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || error.message || 'Có lỗi xảy ra'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Thông báo', 'Bạn cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm({ ...form, identificationPhoto: result.assets[0] });
        setErrors({ ...errors, identificationPhoto: null });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'Chọn ngày';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getGenderLabel = () => {
    const gender = genderOptions.find(g => g.key === form.gender);
    return gender ? gender.value : 'Chọn giới tính';
  };

  const getStatusLabel = () => {
    const status = statusOptions.find(s => s.value === form.status);
    return status ? status.label : 'Chọn trạng thái';
  };

  const getRoleLabel = () => {
    const role = roles.find(r => r.id === form.roleId);
    return role ? role.name : 'Chọn vai trò';
  };

  const getDepartmentLabel = () => {
    const dept = departments.find(d => d.id === form.departmentId);
    return dept ? dept.name : 'Chọn phòng ban';
  };

  const getChevronLabel = () => {
    const chev = chevrons.find(c => c.id === form.chevronId);
    return chev ? chev.name : 'Chọn chức vụ';
  };

  if (dataLoading) {
    return (
      <Surface style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Section */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Ảnh nhận diện</Text>
              <Divider style={styles.divider} />

              <View style={styles.photoContainer}>
                {form.identificationPhoto ? (
                  <View style={styles.photoWrapper}>
                    <Image
                      source={{
                        uri: typeof form.identificationPhoto === 'string'
                          ? (form.identificationPhoto.startsWith('/')
                            ? `${process.env.EXPO_PUBLIC_API_GATEWAY_URL}${form.identificationPhoto}`
                            : form.identificationPhoto)
                          : form.identificationPhoto.uri
                      }}
                      style={styles.photoPreview}
                    />
                    <IconButton
                      icon="close-circle"
                      size={24}
                      iconColor="#ff4d4f"
                      style={styles.photoRemoveButton}
                      onPress={() => setForm({ ...form, identificationPhoto: null })}
                    />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePickImage}>
                    <MaterialCommunityIcons name="camera-plus" size={48} color="#8c8c8c" />
                    <Text style={styles.photoPlaceholderText}>Chọn ảnh</Text>
                  </TouchableOpacity>
                )}
                {!form.identificationPhoto && (
                  <Button
                    mode="contained"
                    onPress={handlePickImage}
                    style={styles.photoButton}
                  >
                    Chọn ảnh từ thư viện
                  </Button>
                )}
              </View>
              {errors.identificationPhoto && (
                <HelperText type="error" visible={true}>
                  {errors.identificationPhoto}
                </HelperText>
              )}
            </Card.Content>
          </Card>

          {/* Login Info (for create mode) */}
          {!isEdit && (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>
                <Divider style={styles.divider} />

                <TextInput
                  label="Tên đăng nhập *"
                  value={form.username}
                  onChangeText={(text) => {
                    setForm({ ...form, username: text });
                    setErrors({ ...errors, username: null });
                  }}
                  mode="outlined"
                  error={!!errors.username}
                  left={<TextInput.Icon icon="account" />}
                  autoCapitalize="none"
                  style={styles.input}
                />
                {errors.username && (
                  <HelperText type="error" visible={true}>
                    {errors.username}
                  </HelperText>
                )}

                <TextInput
                  label="Mật khẩu *"
                  value={form.password}
                  onChangeText={(text) => {
                    setForm({ ...form, password: text });
                    setErrors({ ...errors, password: null });
                  }}
                  mode="outlined"
                  secureTextEntry
                  error={!!errors.password}
                  left={<TextInput.Icon icon="lock" />}
                  autoCapitalize="none"
                  style={styles.input}
                />
                {errors.password && (
                  <HelperText type="error" visible={true}>
                    {errors.password}
                  </HelperText>
                )}

                <TextInput
                  label="Xác nhận mật khẩu *"
                  value={form.rePassword}
                  onChangeText={(text) => {
                    setForm({ ...form, rePassword: text });
                    setErrors({ ...errors, rePassword: null });
                  }}
                  mode="outlined"
                  secureTextEntry
                  error={!!errors.rePassword}
                  left={<TextInput.Icon icon="lock-check" />}
                  autoCapitalize="none"
                  style={styles.input}
                />
                {errors.rePassword && (
                  <HelperText type="error" visible={true}>
                    {errors.rePassword}
                  </HelperText>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Edit mode: Show username as read-only */}
          {isEdit && (
            <Card style={styles.card}>
              <Card.Content>
                <TextInput
                  label="Tên đăng nhập"
                  value={form.username}
                  mode="outlined"
                  disabled
                  left={<TextInput.Icon icon="account" />}
                  style={styles.input}
                />
              </Card.Content>
            </Card>
          )}

          {/* Personal Info */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              <Divider style={styles.divider} />

              <TextInput
                label="Họ và tên *"
                value={form.fullName}
                onChangeText={(text) => {
                  setForm({ ...form, fullName: text });
                  setErrors({ ...errors, fullName: null });
                }}
                mode="outlined"
                error={!!errors.fullName}
                left={<TextInput.Icon icon="account-circle" />}
                style={styles.input}
              />
              {errors.fullName && (
                <HelperText type="error" visible={true}>
                  {errors.fullName}
                </HelperText>
              )}

              <TextInput
                label="Email *"
                value={form.email}
                onChangeText={(text) => {
                  setForm({ ...form, email: text });
                  setErrors({ ...errors, email: null });
                }}
                mode="outlined"
                error={!!errors.email}
                left={<TextInput.Icon icon="email" />}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              {errors.email && (
                <HelperText type="error" visible={true}>
                  {errors.email}
                </HelperText>
              )}

              <TouchableOpacity onPress={() => setShowBirthdayPicker(true)}>
                <TextInput
                  label="Ngày sinh"
                  value={formatDateDisplay(form.birthday)}
                  mode="outlined"
                  editable={false}
                  left={<TextInput.Icon icon="calendar" />}
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={styles.input}
                />
              </TouchableOpacity>

              <Menu
                visible={genderMenuVisible}
                onDismiss={() => setGenderMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setGenderMenuVisible(true)}>
                    <TextInput
                      label="Giới tính"
                      value={getGenderLabel()}
                      mode="outlined"
                      editable={false}
                      left={<TextInput.Icon icon="gender-male-female" />}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={styles.input}
                    />
                  </TouchableOpacity>
                }
              >
                {genderOptions.map((option) => (
                  <Menu.Item
                    key={option.key}
                    onPress={() => {
                      setForm({ ...form, gender: option.key });
                      setGenderMenuVisible(false);
                    }}
                    title={option.value}
                  />
                ))}
              </Menu>

              <TextInput
                label="Số điện thoại *"
                value={form.phone}
                onChangeText={(text) => {
                  setForm({ ...form, phone: text });
                  setErrors({ ...errors, phone: null });
                }}
                mode="outlined"
                error={!!errors.phone}
                left={<TextInput.Icon icon="phone" />}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
              />
              {errors.phone && (
                <HelperText type="error" visible={true}>
                  {errors.phone}
                </HelperText>
              )}
            </Card.Content>
          </Card>

          {/* Work Info */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Thông tin công việc</Text>
              <Divider style={styles.divider} />

              <Menu
                visible={statusMenuVisible}
                onDismiss={() => setStatusMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setStatusMenuVisible(true)}>
                    <TextInput
                      label="Trạng thái *"
                      value={getStatusLabel()}
                      mode="outlined"
                      editable={false}
                      error={!!errors.status}
                      left={<TextInput.Icon icon="information" />}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={styles.input}
                    />
                  </TouchableOpacity>
                }
              >
                {statusOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => {
                      setForm({ ...form, status: option.value });
                      setStatusMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>

              <Menu
                visible={roleMenuVisible}
                onDismiss={() => setRoleMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setRoleMenuVisible(true)}>
                    <TextInput
                      label="Vai trò *"
                      value={getRoleLabel()}
                      mode="outlined"
                      editable={false}
                      error={!!errors.roleId}
                      left={<TextInput.Icon icon="shield-account" />}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={styles.input}
                    />
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{ maxHeight: 300 }}>
                  {roles.map((role) => (
                    <Menu.Item
                      key={role.id}
                      onPress={() => {
                        setRoleMenuVisible(false);
                        handleRoleChange(role.id);
                      }}
                      title={role.name}
                    />
                  ))}
                </ScrollView>
              </Menu>
              {errors.roleId && (
                <HelperText type="error" visible={true}>
                  {errors.roleId}
                </HelperText>
              )}

              <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                <TextInput
                  label="Ngày bắt đầu làm việc *"
                  value={formatDateDisplay(form.startDate)}
                  mode="outlined"
                  editable={false}
                  error={!!errors.startDate}
                  left={<TextInput.Icon icon="calendar-start" />}
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={styles.input}
                />
              </TouchableOpacity>
              {errors.startDate && (
                <HelperText type="error" visible={true}>
                  {errors.startDate}
                </HelperText>
              )}

              <Menu
                visible={departmentMenuVisible}
                onDismiss={() => setDepartmentMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => form.roleId && setDepartmentMenuVisible(true)}>
                    <TextInput
                      label="Phòng ban *"
                      value={!form.roleId ? 'Chọn vai trò trước' : getDepartmentLabel()}
                      mode="outlined"
                      editable={false}
                      error={!!errors.departmentId}
                      left={<TextInput.Icon icon="office-building" />}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={[styles.input, !form.roleId && { opacity: 0.6 }]}
                    />
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{ maxHeight: 300 }}>
                  {departments.map((dept) => (
                    <Menu.Item
                      key={dept.id}
                      onPress={() => {
                        setForm({ ...form, departmentId: dept.id });
                        setErrors({ ...errors, departmentId: null });
                        setDepartmentMenuVisible(false);
                      }}
                      title={dept.name}
                    />
                  ))}
                </ScrollView>
              </Menu>
              {errors.departmentId && (
                <HelperText type="error" visible={true}>
                  {errors.departmentId}
                </HelperText>
              )}

              <Menu
                visible={chevronMenuVisible}
                onDismiss={() => setChevronMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => form.roleId && setChevronMenuVisible(true)}>
                    <TextInput
                      label="Chức vụ *"
                      value={!form.roleId ? 'Chọn vai trò trước' : getChevronLabel()}
                      mode="outlined"
                      editable={false}
                      error={!!errors.chevronId}
                      left={<TextInput.Icon icon="badge-account" />}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={[styles.input, !form.roleId && { opacity: 0.6 }]}
                    />
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{ maxHeight: 300 }}>
                  {chevrons.map((chev) => (
                    <Menu.Item
                      key={chev.id}
                      onPress={() => {
                        setForm({ ...form, chevronId: chev.id });
                        setErrors({ ...errors, chevronId: null });
                        setChevronMenuVisible(false);
                      }}
                      title={chev.name}
                    />
                  ))}
                </ScrollView>
              </Menu>
              {errors.chevronId && (
                <HelperText type="error" visible={true}>
                  {errors.chevronId}
                </HelperText>
              )}
            </Card.Content>
          </Card>

          {/* Date Pickers */}
          {showBirthdayPicker && (
            <DateTimePicker
              value={form.birthday || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowBirthdayPicker(false);
                if (selectedDate) {
                  setForm({ ...form, birthday: selectedDate });
                }
              }}
              maximumDate={new Date()}
            />
          )}

          {showStartDatePicker && (
            <DateTimePicker
              value={form.startDate || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowStartDatePicker(false);
                if (selectedDate) {
                  setForm({ ...form, startDate: selectedDate });
                  setErrors({ ...errors, startDate: null });
                }
              }}
              maximumDate={new Date()}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={[styles.button, styles.cancelButton]}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.button, styles.submitButton]}
              loading={loading}
              disabled={loading}
            >
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  photoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#d9d9d9',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8c8c8c',
  },
  photoButton: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    borderColor: '#d9d9d9',
  },
  submitButton: {
    backgroundColor: '#1890ff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8c8c8c',
    fontWeight: '500',
  },
});

export default UserFormScreen;

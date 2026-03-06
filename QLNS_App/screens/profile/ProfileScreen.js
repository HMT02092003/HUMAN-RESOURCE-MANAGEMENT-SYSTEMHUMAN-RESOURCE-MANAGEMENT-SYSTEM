import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Avatar, Button, Modal, Portal, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthTokenManager from '../../services/AuthTokenManager';
import apiService from '../../services/apiService';

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);

  // Change password modal states
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AuthTokenManager.getUser();
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((word) => word[0]).join('').toUpperCase();
  };

  const handlePasswordChange = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordVisible(true);
  };

  const handleSubmitPasswordChange = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Thông báo', 'Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      Alert.alert('Thông báo', 'Mật khẩu phải chứa ít nhất 1 chữ thường');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      Alert.alert('Thông báo', 'Mật khẩu phải chứa ít nhất 1 chữ hoa');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      Alert.alert('Thông báo', 'Mật khẩu phải chứa ít nhất 1 chữ số');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      Alert.alert('Thông báo', 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setSaving(true);
    try {
      await apiService.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setChangePasswordVisible(false);
      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Không thể đổi mật khẩu';
      Alert.alert('Lỗi', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!userData) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
          <Text style={styles.headerSubtitle}>Thông tin chi tiết về tài khoản của bạn</Text>
        </View>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
          <Text style={styles.headerSubtitle}>Thông tin chi tiết về tài khoản của bạn</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={80}
              label={getUserInitials(userData.username || userData.fullName)}
              style={styles.avatar}
            />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tên đăng nhập:</Text>
              <Text style={styles.value}>{userData.username || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Họ và tên:</Text>
              <Text style={styles.value}>{userData.fullName || userData.name || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{userData.email || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Số điện thoại:</Text>
              <Text style={styles.value}>{userData.phone || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Vai trò:</Text>
              <Text style={styles.value}>{userData.role || 'N/A'}</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Ngày tạo:</Text>
              <Text style={styles.value}>
                {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </Text>
            </View>
          </View>

          <Button
            mode="contained"
            style={styles.changePasswordButton}
            onPress={handlePasswordChange}
            icon="lock-reset"
          >
            Đổi mật khẩu
          </Button>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Portal>
        <Modal
          visible={changePasswordVisible}
          onDismiss={() => setChangePasswordVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <TouchableOpacity onPress={() => setChangePasswordVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#8c8c8c" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Current Password */}
            <Text style={styles.fieldLabel}>Mật khẩu hiện tại *</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.passwordField}
                placeholder="Nhập mật khẩu hiện tại"
                secureTextEntry={!showCurrentPw}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrentPw((v) => !v)}>
                <MaterialCommunityIcons
                  name={showCurrentPw ? 'eye-off' : 'eye'}
                  size={20}
                  color="#8c8c8c"
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text style={styles.fieldLabel}>Mật khẩu mới *</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.passwordField}
                placeholder="Tối thiểu 6 ký tự"
                secureTextEntry={!showNewPw}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNewPw((v) => !v)}>
                <MaterialCommunityIcons
                  name={showNewPw ? 'eye-off' : 'eye'}
                  size={20}
                  color="#8c8c8c"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.fieldLabel}>Xác nhận mật khẩu mới *</Text>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.passwordField}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry={!showConfirmPw}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPw((v) => !v)}>
                <MaterialCommunityIcons
                  name={showConfirmPw ? 'eye-off' : 'eye'}
                  size={20}
                  color="#8c8c8c"
                />
              </TouchableOpacity>
            </View>

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <MaterialCommunityIcons
                  name={newPassword === confirmPassword ? 'check-circle' : 'close-circle'}
                  size={14}
                  color={newPassword === confirmPassword ? '#52c41a' : '#ff4d4f'}
                />
                <Text style={[
                  styles.matchText,
                  { color: newPassword === confirmPassword ? '#52c41a' : '#ff4d4f' },
                ]}>
                  {newPassword === confirmPassword ? 'Mật khẩu khớp' : 'Mật khẩu không khớp'}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setChangePasswordVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.6 }]}
              onPress={handleSubmitPasswordChange}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Xác nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    marginVertical: 20,
  },
  avatar: {
    backgroundColor: '#1890ff',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  changePasswordButton: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#1890ff',
  },
  // Modal styles
  modalContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  modalBody: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#595959',
    marginBottom: 6,
    marginTop: 4,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#fafafa',
    marginBottom: 14,
  },
  passwordField: {
    flex: 1,
    fontSize: 14,
    color: '#262626',
    paddingVertical: 8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -8,
    marginBottom: 8,
  },
  matchText: {
    fontSize: 11,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#595959',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1890ff',
  },
  submitBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
});

export default ProfileScreen;
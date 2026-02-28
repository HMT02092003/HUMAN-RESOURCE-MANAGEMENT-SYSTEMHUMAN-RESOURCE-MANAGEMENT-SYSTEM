import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JobService from '../../services/JobService';
import UserService from '../../services/UserService';
import AuthTokenManager from '../../services/AuthTokenManager';

const CVCreateScreen = ({ navigation }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await AuthTokenManager.getUser();
      setCurrentUser(user);
      // Check if user is admin or HR (can upload for others)
      const canSelectUser = user?.roleId === 1 || user?.roleId === 5;
      setIsManager(canSelectUser);
      if (!canSelectUser) {
        setSelectedUserId(user?.id);
      } else {
        setSelectedUserId(user?.id);
        loadUsers();
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await UserService.getAllUsers({ limit: 500, pageSize: 500 });
      const list = response?.results ?? response?.data ?? response ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/pdf',
          size: asset.size,
        });
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Lỗi', 'Không thể chọn file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Thông báo', 'Vui lòng chọn file CV');
      return;
    }
    if (!selectedUserId) {
      Alert.alert('Thông báo', 'Vui lòng chọn người dùng');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cv', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      });
      formData.append('userId', String(selectedUserId));

      await JobService.uploadCv(formData);
      Alert.alert('Thành công', 'Đã tải lên CV', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tải lên CV');
    } finally {
      setUploading(false);
    }
  };

  const getSelectedUserName = () => {
    if (!selectedUserId) return 'Chưa chọn';
    if (selectedUserId === currentUser?.id) return `${currentUser?.fullName || currentUser?.username} (Bản thân)`;
    const user = users.find((u) => u.id === selectedUserId);
    return user?.fullName || user?.username || user?.email || `User #${selectedUserId}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1890ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tải lên CV</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Người dùng</Text>
          {isManager ? (
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setShowUserPicker(true)}
            >
              <MaterialCommunityIcons name="account" size={18} color="#1890ff" />
              <Text style={styles.selectorText} numberOfLines={1}>{getSelectedUserName()}</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#8c8c8c" />
            </TouchableOpacity>
          ) : (
            <View style={styles.selectorBtn}>
              <MaterialCommunityIcons name="account" size={18} color="#1890ff" />
              <Text style={styles.selectorText}>
                {currentUser?.fullName || currentUser?.username || 'Bản thân'}
              </Text>
            </View>
          )}
        </View>

        {/* File Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File CV *</Text>
          <Text style={styles.sectionHint}>Hỗ trợ: PDF, DOC, DOCX</Text>

          <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
            <MaterialCommunityIcons name="file-upload" size={32} color="#1890ff" />
            <Text style={styles.pickBtnTitle}>Chọn file CV</Text>
            <Text style={styles.pickBtnHint}>Nhấn để chọn file từ thiết bị</Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.filePreview}>
              <MaterialCommunityIcons
                name={selectedFile.type?.includes('pdf') ? 'file-pdf-box' : 'file-word'}
                size={40}
                color={selectedFile.type?.includes('pdf') ? '#ff4d4f' : '#1890ff'}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.fileName} numberOfLines={2}>{selectedFile.name}</Text>
                {selectedFile.size ? (
                  <Text style={styles.fileSize}>{formatSize(selectedFile.size)}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFileBtn}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#ff4d4f" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* User Picker Modal */}
      {showUserPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn người dùng</Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#8c8c8c" />
              </TouchableOpacity>
            </View>
            {loadingUsers ? (
              <ActivityIndicator style={{ padding: 40 }} color="#1890ff" />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                <TouchableOpacity
                  style={[styles.userOption, selectedUserId === currentUser?.id && styles.userOptionSelected]}
                  onPress={() => { setSelectedUserId(currentUser?.id); setShowUserPicker(false); }}
                >
                  <MaterialCommunityIcons name="account-circle" size={20} color="#1890ff" />
                  <Text style={styles.userOptionText}>
                    {currentUser?.fullName || currentUser?.username} (Bản thân)
                  </Text>
                  {selectedUserId === currentUser?.id && (
                    <MaterialCommunityIcons name="check" size={16} color="#1890ff" />
                  )}
                </TouchableOpacity>
                {users
                  .filter((u) => u.id !== currentUser?.id)
                  .map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.userOption, selectedUserId === user.id && styles.userOptionSelected]}
                      onPress={() => { setSelectedUserId(user.id); setShowUserPicker(false); }}
                    >
                      <MaterialCommunityIcons name="account" size={20} color="#8c8c8c" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.userOptionText}>{user.fullName || user.username}</Text>
                        {user.email ? <Text style={styles.userOptionEmail}>{user.email}</Text> : null}
                      </View>
                      {selectedUserId === user.id && (
                        <MaterialCommunityIcons name="check" size={16} color="#1890ff" />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="upload" size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>Tải lên CV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    elevation: 2,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  scroll: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    color: '#8c8c8c',
    marginBottom: 12,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: '#262626',
  },
  pickBtn: {
    alignItems: 'center',
    paddingVertical: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#91caff',
    borderRadius: 10,
    backgroundColor: '#e6f4ff',
    marginTop: 8,
  },
  pickBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
    marginTop: 8,
  },
  pickBtnHint: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 4,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
  },
  fileSize: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    elevation: 4,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1890ff',
    paddingVertical: 14,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  userOptionSelected: {
    backgroundColor: '#e6f4ff',
  },
  userOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#262626',
    marginLeft: 8,
  },
  userOptionEmail: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 1,
  },
});

export default CVCreateScreen;

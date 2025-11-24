import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { Avatar, Button } from 'react-native-paper';
import AuthTokenManager from '../../services/AuthTokenManager';

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);

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
    Alert.alert('Thông báo', 'Tính năng đổi mật khẩu sẽ được triển khai sau.');
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
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Ngày tạo:</Text>
            <Text style={styles.value}>
              {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
        
        <Button
          mode="contained"
          style={styles.changePasswordButton}
          onPress={handlePasswordChange}
        >
          Đổi mật khẩu
        </Button>
      </View>
    </ScrollView>
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
});

export default ProfileScreen;
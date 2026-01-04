import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Image, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  StatusBar,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthTokenManager from '../services/AuthTokenManager';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ onLogin, onCancel }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleLogin = async () => {
    if (!username || !password) return Alert.alert('Thông báo', 'Vui lòng nhập tài khoản và mật khẩu');
    setLoading(true);
    try {
      const result = await AuthTokenManager.loginAndSave(username.trim(), password);
      setLoading(false);
      if (result && result.user) {
        onLogin(result.user);
      } else {
        Alert.alert('Đăng nhập thất bại', result?.message || 'Vui lòng kiểm tra lại thông tin');
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Lỗi hệ thống', e.message || String(e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Hình nền trang trí mờ phía sau */}
      <View style={styles.backgroundDecor} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>HRM SYSTEM</Text>
            <Text style={styles.welcomeText}>Hệ thống quản lý nhân sự</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formCard}>
            
            <Text style={styles.cardTitle}>Đăng nhập</Text>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tài khoản"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize='none'
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRemember(!remember)}>
                <Ionicons 
                  name={remember ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={remember ? "#007AFF" : "#999"} 
                />
                <Text style={styles.rememberText}>Ghi nhớ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => Alert.alert('Quên mật khẩu', 'Vui lòng liên hệ Admin.')}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelButtonText}>Quay lại</Text>
            </TouchableOpacity>

          </View>

          <Text style={styles.footerText}>© 2024 HRM Graduation Project</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Màu nền toàn màn hình
  },
  // Sửa lại backgroundDecor để không bị lỗi layout
  backgroundDecor: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 122, 255, 0.05)', 
    zIndex: -1, // Đẩy xuống dưới cùng
  },
  keyboardView: {
    flex: 1,
    width: '100%', // Đảm bảo chiếm hết chiều ngang
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20, // Padding 2 bên thay vì căn giữa
    width: '100%', // QUAN TRỌNG: Bắt buộc ScrollView chiếm hết width
  },
  logoContainer: {
    alignItems: 'center', // Chỉ căn giữa logo và text
    marginBottom: 30,
    width: '100%',
  },
  logoCircle: {
    width: 90,
    height: 90,
    backgroundColor: '#fff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  logo: {
    width: 50,
    height: 50,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%', // Chiếm hết chiều ngang của container (đã trừ padding 20px ở trên)
    // Bỏ maxWidth: 400 để tránh bị bóp nghẹt trên một số dòng máy
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginBottom: 16,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Đẩy 2 nút ra 2 góc
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#aaccff',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#adb5bd',
    fontSize: 12,
    marginTop: 40,
    fontWeight: '500',
    width: '100%',
  }
});
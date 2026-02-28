import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  Surface,
  ActivityIndicator,
  DefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';

const theme = {
  ...DefaultTheme,
  roundness: 20,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0F172A',
    secondary: '#38BDF8',
    accent: '#0EA5E9',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    placeholder: '#64748B',
    error: '#EF4444',
  },
};

function ForgotPasswordContent({ navigation }) {
  const [step, setStep] = useState(1); // 1: enter username, 2: enter OTP + new password
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOtp = async () => {
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { username: username.trim() });
      setSuccess('Mã OTP đã được gửi đến email của bạn!');
      setStep(2);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Không thể gửi OTP. Vui lòng thử lại!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP!');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        username: username.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      setSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Đặt lại mật khẩu thất bại. Vui lòng thử lại!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F172A', '#1E3A5F', '#0EA5E9']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lock-reset" size={40} color="#0EA5E9" />
              </View>
              <Title style={styles.headerTitle}>Quên mật khẩu</Title>
              <Paragraph style={styles.headerSubtitle}>
                {step === 1
                  ? 'Nhập tên đăng nhập để nhận mã OTP'
                  : `Nhập mã OTP đã gửi đến email của tài khoản "${username}"`}
              </Paragraph>
            </View>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            </View>

            {/* Card */}
            <Surface style={styles.card} elevation={0}>
              {/* Error/Success messages */}
              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
                  <Paragraph style={styles.errorText}>{error}</Paragraph>
                </View>
              ) : null}
              {success ? (
                <View style={styles.successContainer}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
                  <Paragraph style={styles.successText}>{success}</Paragraph>
                </View>
              ) : null}

              {step === 1 ? (
                /* Step 1: Enter username */
                <View style={styles.form}>
                  <TextInput
                    label="Tên đăng nhập"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      if (error) setError('');
                    }}
                    mode="flat"
                    left={<TextInput.Icon icon="account" iconColor="#64748B" />}
                    style={styles.input}
                    underlineColor="#E2E8F0"
                    activeUnderlineColor="#0EA5E9"
                    disabled={loading}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={styles.btnContainer}
                  >
                    <LinearGradient
                      colors={['#0EA5E9', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={styles.btnInner}>
                          <Paragraph style={styles.btnLabel}>Gửi mã OTP</Paragraph>
                          <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Step 2: Enter OTP + new password */
                <View style={styles.form}>
                  <TextInput
                    label="Mã OTP"
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (error) setError('');
                    }}
                    mode="flat"
                    left={<TextInput.Icon icon="numeric" iconColor="#64748B" />}
                    style={styles.input}
                    underlineColor="#E2E8F0"
                    activeUnderlineColor="#0EA5E9"
                    disabled={loading}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <TextInput
                    label="Mật khẩu mới"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (error) setError('');
                    }}
                    mode="flat"
                    left={<TextInput.Icon icon="lock" iconColor="#64748B" />}
                    right={
                      <TextInput.Icon
                        icon={showNewPassword ? 'eye-off' : 'eye'}
                        iconColor="#64748B"
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      />
                    }
                    secureTextEntry={!showNewPassword}
                    style={styles.input}
                    underlineColor="#E2E8F0"
                    activeUnderlineColor="#0EA5E9"
                    disabled={loading}
                    autoCapitalize="none"
                  />

                  <TextInput
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) setError('');
                    }}
                    mode="flat"
                    left={<TextInput.Icon icon="lock-check" iconColor="#64748B" />}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        iconColor="#64748B"
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    secureTextEntry={!showConfirmPassword}
                    style={styles.input}
                    underlineColor="#E2E8F0"
                    activeUnderlineColor="#0EA5E9"
                    disabled={loading}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={styles.btnContainer}
                  >
                    <LinearGradient
                      colors={['#0EA5E9', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={styles.btnInner}>
                          <Paragraph style={styles.btnLabel}>Đặt lại mật khẩu</Paragraph>
                          <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStep(1);
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError('');
                      setSuccess('');
                    }}
                    style={styles.resendLink}
                  >
                    <Paragraph style={styles.resendText}>← Quay lại / Gửi lại OTP</Paragraph>
                  </TouchableOpacity>
                </View>
              )}
            </Surface>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

export default function ForgotPasswordScreen({ navigation }) {
  return (
    <PaperProvider theme={theme}>
      <ForgotPasswordContent navigation={navigation} />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 10,
    alignSelf: 'flex-start',
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: '#0EA5E9',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#0EA5E9',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    flex: 1,
    fontSize: 13,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: '#16a34a',
    flex: 1,
    fontSize: 13,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  btnContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  btnGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendLink: {
    alignItems: 'center',
    marginTop: 4,
  },
  resendText: {
    color: '#0EA5E9',
    fontSize: 14,
  },
});

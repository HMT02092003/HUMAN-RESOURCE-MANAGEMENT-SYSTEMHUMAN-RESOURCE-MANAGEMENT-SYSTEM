import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
  Image,
  ImageBackground,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  HelperText,
  useTheme,
  Provider as PaperProvider,
  DefaultTheme,
  Surface,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';

const { width, height } = Dimensions.get('window');

// Premium Sea Blue Theme
const theme = {
  ...DefaultTheme,
  roundness: 20,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0F172A', // Deep Navy
    secondary: '#38BDF8', // Sky Blue
    accent: '#0EA5E9', // Deep Sky Blue
    background: '#F8FAFC', // Very light gray-blue
    surface: '#FFFFFF',
    text: '#1E293B',
    placeholder: '#64748B',
    error: '#EF4444',
  },
};

const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1519750783826-e2420f4d687f?auto=format&fit=crop&q=80&w=1000';

function LoginScreenContent({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const paperTheme = useTheme();

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập!');
      return;
    }

    if (username.length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự!');
      return;
    }

    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu!');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      const message = err?.message || err?.response?.data?.error || err?.response?.data?.message || 'Đăng nhập thất bại';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: BACKGROUND_IMAGE }}
        style={styles.backgroundImage}
        blurRadius={Platform.OS === 'ios' ? 1 : 0.5}
      >
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.6)']}
          style={styles.gradientOverlay}
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
              <View style={styles.logoAndHeader}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Title style={styles.headerTitle}>HRM SYSTEM</Title>
                <Paragraph style={styles.headerSubtitle}>Quản trị nhân sự thông minh</Paragraph>
              </View>

              <Surface style={styles.card} elevation={0}>
                <View style={styles.cardHeader}>
                  <Title style={styles.cardTitle}>Đăng Nhập</Title>
                  <View style={styles.titleUnderline} />
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
                    <Paragraph style={styles.errorText}>{error}</Paragraph>
                  </View>
                ) : null}

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

                  <TextInput
                    label="Mật khẩu"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError('');
                    }}
                    mode="flat"
                    left={<TextInput.Icon icon="lock" iconColor="#64748B" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        iconColor="#64748B"
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setShowPassword(!showPassword);
                        }}
                      />
                    }
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    underlineColor="#E2E8F0"
                    activeUnderlineColor="#0EA5E9"
                    disabled={loading}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotPasswordLink}
                  >
                    <Paragraph style={styles.forgotPasswordText}>Quên mật khẩu?</Paragraph>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={styles.loginBtnContainer}
                  >
                    <LinearGradient
                      colors={['#0EA5E9', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <View style={styles.loginBtnInner}>
                          <Paragraph style={styles.loginBtnLabel}>Đăng Nhập</Paragraph>
                          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Paragraph style={styles.footerText}>Version 2.0.0 • HRM Solution</Paragraph>
                  </View>
                </View>
              </Surface>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground >
    </>
  );
}

export default function LoginScreen({ navigation }) {
  return (
    <PaperProvider theme={theme}>
      <LoginScreenContent navigation={navigation} />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  logoAndHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 250,
    height: 120,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 32,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 25,
      },
      android: {
        elevation: 20,
      },
      web: {
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  titleUnderline: {
    width: 40,
    height: 4,
    backgroundColor: '#0EA5E9',
    borderRadius: 2,
    marginTop: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 15,
    fontSize: 16,
    height: 60,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtnContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loginGradient: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
});


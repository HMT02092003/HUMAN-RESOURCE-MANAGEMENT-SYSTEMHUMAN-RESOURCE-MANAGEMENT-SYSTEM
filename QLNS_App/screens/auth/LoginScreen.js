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
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../services/AuthContext';

const { width } = Dimensions.get('window');

// Sea blue enhanced theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0077BE', // Sea blue
    secondary: '#00A8CC', // Lighter sea blue
    accent: '#40C4FF', // Bright blue
    background: '#E6F7FF', // Light sea blue background
    surface: '#FFFFFF',
    text: '#003366', // Dark blue text
    placeholder: '#66B2FF', // Muted blue
    error: '#e74c3c', // Red for errors
  },
};

function LoginScreenContent({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const paperTheme = useTheme();
  
  // Sử dụng AuthContext để quản lý auth state
  const { login } = useAuth();

  const handleLogin = async () => {
    // Validation giống web
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
      console.log('🔐 [LoginScreen] Attempting login...');
      // Gọi login từ AuthContext - nó sẽ tự động update auth state
      await login(username, password);
      console.log('✅ [LoginScreen] Login successful - AuthContext will handle navigation');
      // Không cần navigate thủ công - AuthContext sẽ tự động chuyển màn hình
    } catch (err) {
      console.error('❌ [LoginScreen] Login failed:', err);
      // Prefer server message when available
      const message = err?.message || err?.response?.data?.error || err?.response?.data?.message || 'Đăng nhập thất bại';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      {/* Use ImageBackground for the full screen */}
      <ImageBackground source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJ/6y2gAAAAASUVORK5CYII=' }} style={styles.backgroundImage}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Surface style={styles.card} elevation={6}>
              {/* Title */}
              <Title style={styles.title}>Đăng nhập</Title>

              {/* Subtitle */}
              <Paragraph style={styles.subtitle}>Vui lòng đăng nhập vào tài khoản của bạn</Paragraph>

              {/* Error Message */}
              {error ? (
                <HelperText type="error" visible={true} style={styles.errorText}>
                  {error}
                </HelperText>
              ) : null}

              {/* Inputs container */}
              <View style={{ width: '100%' }}>
                {/* Username Input */}
                <TextInput
                  label="Tên đăng nhập"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError('');
                  }}
                  mode="outlined"
                  left={<TextInput.Icon icon="account" />}
                  style={styles.input}
                  outlineColor="transparent"
                  activeOutlineColor={paperTheme.colors.primary}
                  disabled={loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Password Input */}
                <TextInput
                  label="Mật khẩu"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  mode="outlined"
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  outlineColor="transparent"
                  activeOutlineColor={paperTheme.colors.primary}
                  disabled={loading}
                  autoCapitalize="none"
                />

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                  labelStyle={styles.loginButtonLabel}
                  buttonColor={paperTheme.colors.primary}
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>

                <Button
                  mode="text"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}
                  style={styles.forgotButton}
                  labelStyle={styles.forgotButtonLabel}
                >
                  Quên mật khẩu?
                </Button>
              </View>
            </Surface>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
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
    resizeMode: 'cover', // Ensure the background covers the whole screen
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24, // Keep reasonable padding
    paddingVertical: 40,
    width: '100%',
    maxWidth: 350, // Reduced maxWidth for a more compact look, similar to the reference image
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    // Removed background, padding, shadow to make logo "subtle/blended in"
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    // web uses boxShadow; native uses shadow/elevation
    ...Platform.select({
      web: {
        boxShadow: 'none',
      },
      default: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      },
    }),
  },
  logo: {
    width: 180,
    height: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 10, // Adjusted margin
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#336699',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
    backgroundColor: 'rgba(231, 76, 60, 0.06)',
    padding: 8,
    borderRadius: 8,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'stretch',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    fontSize: 16,
    height: 56,
    // keep native shadows, and provide boxShadow for web
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
    outlineColor: '#E0E0E0',
  },
  loginButton: {
    width: '100%',
    marginTop: 18, // Adjusted top margin
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 26px rgba(0,119,190,0.18)',
      },
      ios: {
        shadowColor: '#0077BE',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loginButtonContent: {
    height: 50,
    justifyContent: 'center',
  },
  loginButtonLabel: {
    fontSize: 17, // Adjusted font size
    fontWeight: '700',
    color: '#FFFFFF',
  },
  forgotButton: {
    marginTop: 20,
  },
  forgotButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0077BE',
  },
});

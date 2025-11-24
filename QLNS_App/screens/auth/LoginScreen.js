import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
  Image,
  ImageBackground, // Import ImageBackground
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
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AuthTokenManager from '../../services/AuthTokenManager';

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

  // Auto-login check is now handled by AppNavigator
  // useEffect(() => {
  //   checkAutoLogin();
  // }, []);

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
      // Call API giống web
      const response = await AuthTokenManager.loginAndSave(username, password);

      // Success - Navigate to AppLayout
      navigation.replace('AppLayout');
    } catch (err) {
      console.error('Đăng nhập thất bại:', err);
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      {/* Use ImageBackground for the full screen */}
      <ImageBackground
        source={require('../../assets/background.png')} // Updated to background.png
        style={styles.backgroundImage}
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
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Title style={styles.title}>Đăng nhập</Title>

            {/* Subtitle */}
            <Paragraph style={styles.subtitle}>
              Vui lòng đăng nhập vào tài khoản của bạn
            </Paragraph>

            {/* Error Message */}
            {error ? (
              <HelperText type="error" visible={true} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}

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
              outlineColor="transparent" // Remove outline color for a cleaner look
              activeOutlineColor={paperTheme.colors.primary}
              disabled={loading}
              autoCapitalize="none"
              autoCorrect={false}
              error={!!error && !username}
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
              outlineColor="transparent" // Remove outline color for a cleaner look
              activeOutlineColor={paperTheme.colors.primary}
              disabled={loading}
              autoCapitalize="none"
              error={!!error && !password}
            />

            {/* Login Button */}
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

            {/* Forgot Password Link */}
            <Button
              mode="text"
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
              style={styles.forgotButton}
              labelStyle={styles.forgotButtonLabel}
            >
              Quên mật khẩu?
            </Button>
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
    width: 280, // Slightly smaller logo to fit better
    height: 190,
    marginBottom: 0,
  },
  title: {
    fontSize: 30, // Slightly smaller font size for the title
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 10, // Adjusted margin
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16, // Adjusted font size for subtitle
    color: '#336699',
    marginBottom: 30, // Adjusted margin
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  input: {
    width: '100%',
    marginBottom: 20,
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
    marginTop: 25, // Adjusted top margin
    borderRadius: 15,
    height: 50, // Adjusted height for the button
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 18px rgba(0,119,190,0.16)',
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

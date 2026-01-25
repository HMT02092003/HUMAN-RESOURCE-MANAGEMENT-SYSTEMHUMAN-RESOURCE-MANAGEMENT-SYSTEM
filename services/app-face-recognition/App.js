import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EnhancedCameraViewV2 from './components/EnhancedCameraViewV2';
import AttendanceConfirmation from './components/AttendanceConfirmation';
import AuthTokenManager from './services/AuthTokenManager';

import apiConfig from './config/apiConfig';

export default function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auto-login flow: if no token in secure store, call login API with admin creds
  React.useEffect(() => {
    (async () => {
      try {
        // Initialize API Config (Check Network Connectivity)
        await apiConfig.initialize();

        console.log('🔐 [APP] Checking for existing token...');
        const token = await AuthTokenManager.getAccessToken();
        if (token) {
          console.log('✅ [APP] Token found, user already logged in');
          setUser({ tokenLoaded: true });
        } else {
          console.log('🔑 [APP] No token found, attempting auto-login...');
          // auto login using provided admin credentials
          try {
            const result = await AuthTokenManager.loginAndSave('admin', '123456@');
            console.log('🔐 [APP] Login result:', { hasAccess: !!result?.access, hasUser: !!result?.user });
            if (result && result.access) {
              setUser({ loggedIn: true, user: result.user, token: result.access });
              console.log('✅ [APP] Auto-login success:', result.user?.username || 'admin');
            } else {
              console.error('❌ [APP] Auto-login did not return access token');
              Alert.alert('Lỗi đăng nhập', 'Không thể đăng nhập tự động. Vui lòng kiểm tra kết nối mạng và thử lại.');
            }
          } catch (e) {
            console.error('❌ [APP] Auto-login failed:', e);
            Alert.alert('Lỗi đăng nhập', `Không thể đăng nhập tự động: ${e.message || 'Unknown error'}`);
          }
        }
      } catch (e) {
        console.error('❌ [APP] Auth init error:', e);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const handleCapture = (imageUri, aiResult) => {
    setCapturedImage(imageUri);
    setRecognitionResult(aiResult);

    // Hiển thị kết quả nhận diện
    if (aiResult) {
      console.log('Recognition Result:', aiResult);

      // Bạn có thể thêm logic để hiển thị thông tin nhận diện
      // Ví dụ: tên nhân viên, trạng thái chấm công, v.v.
    }
  };

  const resetCapture = () => {
    console.log('🔄 [APP] Resetting capture state - returning to camera');
    console.log('🔄 [APP] This will unmount AttendanceConfirmation and remount Camera');
    setCapturedImage(null);
    setRecognitionResult(null);
    // Reset sẽ cho phép camera tiếp tục auto-capture
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {
          (() => {
            if (authLoading) return null;
            // Always show the recognition/confirmation screen immediately after capture,
            // even if the app hasn't obtained a stored user token (so users see the result).
            if (capturedImage) {
              return (
                <AttendanceConfirmation
                  imageUri={capturedImage}
                  recognitionData={recognitionResult}
                  onReset={resetCapture}
                />
              );
            }

            // If no captured image, show camera. We don't require `user` to be present to
            // display the camera; token requirements are enforced when confirming.
            // KHÔNG dùng key={Date.now()} vì sẽ gây remount liên tục
            // Using EnhancedCameraViewV2 with local face detection and smart throttling
            return <EnhancedCameraViewV2 onCapture={handleCapture} />;
          })()
        }
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
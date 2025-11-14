import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraView from './components/CameraView';
import AttendanceConfirmation from './components/AttendanceConfirmation';
import AuthTokenManager from './services/AuthTokenManager';

export default function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auto-login flow: if no token in secure store, call login API with admin creds
  React.useEffect(() => {
    (async () => {
      try {
        const token = await AuthTokenManager.getAccessToken();
        if (token) {
          setUser({ tokenLoaded: true });
        } else {
          // auto login using provided admin credentials
          try {
            const result = await AuthTokenManager.loginAndSave('admin', '123456@');
            if (result && result.access) {
              setUser({ loggedIn: true, user: result.user, token: result.access });
              console.log('Auto-login success:', result.user?.username || 'admin');
            } else {
              console.warn('Auto-login did not return access token');
            }
          } catch (e) {
            console.error('Auto-login failed', e);
            Alert.alert('Lỗi đăng nhập', 'Không thể đăng nhập tự động. Vui lòng kiểm tra kết nối mạng và thử lại.');
          }
        }
      } catch (e) {
        console.error('Auth init error', e);
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
    setCapturedImage(null);
    setRecognitionResult(null);
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
            return <CameraView onCapture={handleCapture} />;
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
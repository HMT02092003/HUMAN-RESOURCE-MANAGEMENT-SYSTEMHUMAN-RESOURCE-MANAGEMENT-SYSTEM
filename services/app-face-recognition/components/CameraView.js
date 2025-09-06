import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttendanceAPI from '../services/AttendanceAPI';

const { width, height } = Dimensions.get('window');

export default function AttendanceCameraView({ onCapture }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Xin quyền camera
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Kiểm tra kết nối khi component mount
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const isConnected = await AttendanceAPI.testConnection();
    setConnectionStatus(isConnected);
    
    if (!isConnected) {
      Alert.alert(
        'Cảnh báo kết nối',
        'Không thể kết nối đến server. Vui lòng kiểm tra:\n- Kết nối WiFi\n- Server đang chạy\n- Cùng mạng LAN',
        [
          { text: 'Thử lại', onPress: checkConnection },
          { text: 'Tiếp tục', style: 'cancel' }
        ]
      );
    }
  };

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Ứng dụng cần quyền truy cập camera</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.buttonText}>Cấp quyền camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isLoading) {
      try {
        setIsLoading(true);
        
        // Chụp ảnh
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false, // Không cần base64 cho FormData
        });

        console.log('Photo captured:', photo.uri);

        // Gửi ảnh tới AI server để nhận diện
        const aiResponse = await AttendanceAPI.sendImageForRecognition(photo.uri, {
          recognition_type: 'check_in', // Sửa từ 'type' thành 'recognition_type'
          location: {
            // Thêm thông tin vị trí nếu cần
            latitude: null,
            longitude: null,
          }
        });

        console.log('Recognition Result:', JSON.stringify(aiResponse));
        
        // Debug thông tin chi tiết
        if (aiResponse?.data?.user) {
          console.log('User info found:', {
            username: aiResponse.data.user.username,
            confidence: aiResponse.data.user.confidence_score,
            user_id: aiResponse.data.user.user_id
          });
        }

        // Luôn callback với kết quả (thành công hoặc thất bại)
        if (onCapture) {
          onCapture(photo.uri, aiResponse);
        }

        // Hiển thị thông báo tùy theo kết quả
        if (aiResponse.success) {
          // Không cần hiển thị alert ở đây, để AttendanceConfirmation xử lý
        } else {
          // Cũng không cần alert, AttendanceConfirmation sẽ hiển thị lỗi phù hợp
        }

      } catch (error) {
        console.error('Error during photo capture:', error);
        Alert.alert(
          'Lỗi',
          `Không thể chụp ảnh: ${error.message}`,
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hiển thị trạng thái kết nối */}
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: connectionStatus ? 'green' : 'red' }]}>
          {connectionStatus ? '🟢 Đã kết nối server' : '🔴 Mất kết nối server'}
        </Text>
        <TouchableOpacity onPress={checkConnection} style={styles.refreshButton}>
          <Text>🔄</Text>
        </TouchableOpacity>
      </View>

      <Camera style={styles.camera} ref={cameraRef} type={Camera.Constants.Type.front}>
        <View style={styles.overlay}>
          <View style={styles.frame} />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={isLoading}
          >
            <Text style={styles.captureButtonText}>
              {isLoading ? 'Đang xử lý...' : 'Chụp ảnh'}
            </Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  refreshButton: {
    padding: 5,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 125,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
  },
  captureButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 18,
    color: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
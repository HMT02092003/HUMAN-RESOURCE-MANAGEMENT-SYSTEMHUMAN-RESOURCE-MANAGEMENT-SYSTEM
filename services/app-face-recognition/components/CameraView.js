import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView as ExpoCamera, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendImageToAI } from '../services/apiService';

export default function CameraView({ onCapture }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>Cần quyền truy cập camera để chấm công</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Cho phép Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isLoading) {
      try {
        setIsLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });

        // Gửi ảnh tới AI server (fake data)
        const aiResponse = await sendImageToAI(photo.uri);
        onCapture(photo.uri, aiResponse);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
        console.error('Camera error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoCamera style={styles.camera} ref={cameraRef} facing="front">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Chấm công</Text>
            <Text style={styles.subtitle}>Đặt mặt vào khung hình và nhấn chụp</Text>
          </View>
          
          <View style={styles.faceFrame} />
          
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isLoading}
            >
              <Ionicons 
                name="camera" 
                size={40} 
                color="white" 
              />
            </TouchableOpacity>
            <Text style={styles.captureText}>
              {isLoading ? 'Đang xử lý...' : 'Chấm công'}
            </Text>
          </View>
        </View>
      </ExpoCamera>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  faceFrame: {
    width: 200,
    height: 200,
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 100,
    alignSelf: 'center',
    marginTop: 50,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
  },
  captureButtonDisabled: {
    backgroundColor: '#999',
  },
  captureText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  message: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
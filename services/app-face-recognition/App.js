import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraView from './components/CameraView';
import AttendanceConfirmation from './components/AttendanceConfirmation';

export default function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);

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
        
        {capturedImage ? (
          <AttendanceConfirmation
            imageUri={capturedImage}
            recognitionData={recognitionResult}
            onReset={resetCapture}
          />
        ) : (
          <CameraView onCapture={handleCapture} />
        )}
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
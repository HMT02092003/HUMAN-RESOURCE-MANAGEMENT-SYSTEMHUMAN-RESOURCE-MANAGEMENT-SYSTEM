import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraView from './components/CameraView';
import AttendanceConfirmation from './components/AttendanceConfirmation';

export default function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  const handleCapture = (imageUri, data) => {
    setCapturedImage(imageUri);
    setAttendanceData(data);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setAttendanceData(null);
  };

  const handleConfirm = () => {
    // Xử lý xác nhận chấm công thành công
    alert('Chấm công thành công!');
    setCapturedImage(null);
    setAttendanceData(null);
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        {!capturedImage ? (
          <CameraView onCapture={handleCapture} />
        ) : (
          <AttendanceConfirmation
            imageUri={capturedImage}
            attendanceData={attendanceData}
            onRetake={handleRetake}
            onConfirm={handleConfirm}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
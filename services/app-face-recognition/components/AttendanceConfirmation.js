import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AttendanceAPI from '../services/AttendanceAPI'; // Sửa import này

const { width, height } = Dimensions.get('window');

export default function AttendanceConfirmation({ 
  imageUri, 
  recognitionData, // Đổi tên prop để phù hợp với App.js
  onReset, // Đổi tên prop để phù hợp với App.js
  onConfirm 
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!recognitionData?.userId) {
      Alert.alert('Lỗi', 'Không có thông tin người dùng để chấm công');
      return;
    }

    setIsConfirming(true);
    try {
      // Gọi API xác nhận chấm công
      const result = await AttendanceAPI.submitAttendance({
        userId: recognitionData.userId,
        type: 'check-in',
        timestamp: new Date().toISOString(),
        imageUri: imageUri,
        confidence: recognitionData.confidence,
        location: null // Có thể thêm thông tin vị trí sau
      });
      
      if (result.success) {
        Alert.alert(
          'Thành công', 
          `Chấm công thành công!\nThời gian: ${new Date().toLocaleTimeString('vi-VN')}\nNgày: ${new Date().toLocaleDateString('vi-VN')}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onConfirm) onConfirm(result.data);
                if (onReset) onReset();
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Không thể chấm công');
      }
    } catch (error) {
      console.error('Attendance confirmation error:', error);
      Alert.alert('Lỗi', `Không thể chấm công: ${error.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRetake = () => {
    if (onReset) {
      onReset();
    }
  };

  const getConfidenceColor = (confidence) => {
    if (!confidence) return '#FF3B30';
    const conf = parseFloat(confidence);
    if (conf >= 0.8) return '#34C759';
    if (conf >= 0.6) return '#FF9500';
    return '#FF3B30';
  };

  const getConfidenceText = (confidence) => {
    if (!confidence) return 'Không xác định';
    const conf = parseFloat(confidence);
    if (conf >= 0.8) return 'Rất cao';
    if (conf >= 0.6) return 'Cao';
    return 'Thấp';
  };

  // Xử lý trường hợp recognitionData null hoặc undefined
  const safeRecognitionData = recognitionData || {};
  const userInfo = safeRecognitionData.userInfo || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xác nhận chấm công</Text>
        <Text style={styles.subtitle}>Kiểm tra thông tin trước khi xác nhận</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.capturedImage} />
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(safeRecognitionData.confidence) }]}>
            <Text style={styles.confidenceText}>
              {getConfidenceText(safeRecognitionData.confidence)}
            </Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Nhân viên:</Text>
            <Text style={styles.infoValue}>{userInfo.fullName || userInfo.name || 'Chưa nhận diện'}</Text>
          </View>

          {userInfo.employeeId && (
            <View style={styles.infoRow}>
              <Ionicons name="id-card" size={24} color="#007AFF" />
              <Text style={styles.infoLabel}>Mã NV:</Text>
              <Text style={styles.infoValue}>{userInfo.employeeId}</Text>
            </View>
          )}

          {userInfo.department && (
            <View style={styles.infoRow}>
              <Ionicons name="business" size={24} color="#007AFF" />
              <Text style={styles.infoLabel}>Phòng ban:</Text>
              <Text style={styles.infoValue}>{userInfo.department}</Text>
            </View>
          )}

          {userInfo.position && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase" size={24} color="#007AFF" />
              <Text style={styles.infoLabel}>Chức vụ:</Text>
              <Text style={styles.infoValue}>{userInfo.position}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userInfo.email || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Độ tin cậy:</Text>
            <Text style={[styles.infoValue, { color: getConfidenceColor(safeRecognitionData.confidence) }]}>
              {safeRecognitionData.confidence ? 
                `${(safeRecognitionData.confidence * 100).toFixed(1)}%` : 
                'N/A'
              }
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleString('vi-VN')}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="camera-reverse" size={24} color="#FF3B30" />
            <Text style={styles.retakeButtonText}>Chụp lại</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]} 
            onPress={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Xác nhận chấm công</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  capturedImage: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: (width * 0.35) / 2,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  confidenceBadge: {
    position: 'absolute',
    top: -5,
    right: width * 0.15,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF3B30',
    minWidth: width * 0.35,
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: width * 0.35,
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#999',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
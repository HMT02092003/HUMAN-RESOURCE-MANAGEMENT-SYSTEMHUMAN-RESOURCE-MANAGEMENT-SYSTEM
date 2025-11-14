import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AttendanceAPI from '../services/AttendanceAPI'; // Sửa import này
import AuthTokenManager from '../services/AuthTokenManager';

const { width, height } = Dimensions.get('window');

export default function AttendanceConfirmation({ 
  imageUri, 
  recognitionData, // Dữ liệu từ AI service
  onReset, 
  onConfirm 
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    // Kiểm tra nếu không có dữ liệu nhận diện hoặc nhận diện thất bại
    if (!isRecognitionSuccessful) {
      Alert.alert('Lỗi', 'Không thể chấm công do nhận diện không thành công hoặc độ tin cậy thấp');
      return;
    }

    setIsConfirming(true);
    try {
      // Kiểm tra recognition_log_id từ dữ liệu nhận diện
      const recognitionLogId = recognitionData?.data?.recognition_log_id;
      if (!recognitionLogId) {
        throw new Error('Không tìm thấy ID nhận diện. Vui lòng thử lại.');
      }
      
      // Get stored token (if any) and call attendance API
      let deviceToken = null;
      try {
        deviceToken = await AuthTokenManager.getAccessToken();
      } catch (e) { /* ignore */ }

      // Gọi API xác nhận chấm công với recognition_log_id
      const result = await AttendanceAPI.submitAttendance({
        recognition_log_id: recognitionLogId,
        userId: user.user_id,
        type: recognitionData?.data?.recognition_type || 'check_in',
        timestamp: recognitionData?.data?.timestamp || new Date().toISOString(),
        imageUri: imageUri,
        confidence: confidence,
        method: recognitionData?.data?.method,
        location: null, // Có thể thêm thông tin vị trí sau
        token: deviceToken
      });
      
      if (result.success) {
        const successMessage = result.data ? 
          `Chấm công thành công!\nNhân viên: ${user.username}\nĐộ tin cậy: ${confidence}%\nLoại: ${recognitionData?.data?.recognition_type === 'check_in' ? 'Vào làm' : 'Tan làm'}\nThời gian: ${new Date().toLocaleString('vi-VN')}` :
          `Chấm công thành công!\nNhân viên: ${user.username}\nĐộ tin cậy: ${confidence}%\nThời gian: ${new Date().toLocaleString('vi-VN')}`;
          
        Alert.alert(
          'Thành công', 
          successMessage,
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
        throw new Error(result.message || 'Không thể chấm công');
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
    if (conf >= 80) return '#34C759'; // Confidence score >= 80
    if (conf >= 60) return '#FF9500'; // Confidence score >= 60
    return '#FF3B30';
  };

  const getConfidenceText = (confidence) => {
    if (!confidence) return 'Không xác định';
    const conf = parseFloat(confidence);
    if (conf >= 80) return 'Rất cao';
    if (conf >= 60) return 'Cao';
    return 'Thấp';
  };

  // Kiểm tra và xử lý dữ liệu nhận diện
  const user = recognitionData?.data?.user || recognitionData?.user || {};
  const confidence = user.confidence_score || 0;
  const isHighConfidence = confidence >= 70; // Chỉ chấp nhận confidence >= 70%
  const isRecognitionSuccessful = recognitionData?.success && isHighConfidence && user.user_id;
  const recognitionStatus = isRecognitionSuccessful ? 'success' : 'failed';
  
  console.log('Processing recognition data:', {
    success: recognitionData?.success,
    confidence: confidence,
    isHighConfidence: isHighConfidence,
    hasUserId: !!user.user_id,
    finalSuccess: isRecognitionSuccessful
  });
  
  // Hiển thị trạng thái nhận diện
  const getRecognitionStatusBadge = () => {
    if (isRecognitionSuccessful) {
      return (
        <View style={[styles.confidenceBadge, { backgroundColor: '#34C759' }]}>
          <Text style={styles.confidenceText}>Xác định</Text>
        </View>
      );
    } else if (recognitionData?.success && !isHighConfidence) {
      return (
        <View style={[styles.confidenceBadge, { backgroundColor: '#FF9500' }]}>
          <Text style={styles.confidenceText}>Độ tin cậy thấp</Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.confidenceBadge, { backgroundColor: '#FF3B30' }]}>
          <Text style={styles.confidenceText}>Không xác định</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xác nhận chấm công</Text>
        <Text style={styles.subtitle}>Kiểm tra thông tin trước khi xác nhận</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.capturedImage} />
          {getRecognitionStatusBadge()}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Nhân viên:</Text>
            <Text style={[styles.infoValue, !isRecognitionSuccessful && styles.errorText]}>
              {isRecognitionSuccessful ? user.username : 'Chưa nhận diện'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Độ tin cậy:</Text>
            <Text style={[styles.infoValue, { color: getConfidenceColor(confidence) }]}>
              {confidence ? `${confidence}%` : 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoValue}>
              {recognitionData?.data?.timestamp ? 
                new Date(recognitionData.data.timestamp).toLocaleString('vi-VN') :
                new Date().toLocaleString('vi-VN')
              }
            </Text>
          </View>

          {/* Hiển thị thông báo nếu nhận diện thất bại */}
          {!isRecognitionSuccessful && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={24} color="#FF3B30" />
              <Text style={styles.errorMessage}>
                {recognitionData?.success && !isHighConfidence ? 
                  `Nhận diện không đủ tin cậy (${confidence}%). Cần độ tin cậy ≥ 70% để chấm công.` :
                  'Nhận diện khuôn mặt không thành công. Người dùng không có trong hệ thống hoặc ảnh không rõ ràng.'
                }
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="camera-reverse" size={24} color="#FF3B30" />
            <Text style={styles.retakeButtonText}>Chụp lại</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.confirmButton, 
              isConfirming && styles.confirmButtonDisabled,
              !isRecognitionSuccessful && styles.confirmButtonDisabled
            ]} 
            onPress={handleConfirm}
            disabled={isConfirming || !isRecognitionSuccessful}
          >
            {isConfirming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>
                  {isRecognitionSuccessful ? 'Xác nhận chấm công' : 'Không thể chấm công'}
                </Text>
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
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  confidenceBadge: {
    position: 'absolute',
    top: -5,
    right: width * 0.2,
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
  errorText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorMessage: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
    lineHeight: 20,
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
    paddingHorizontal: 10,
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
    paddingHorizontal: 10,
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
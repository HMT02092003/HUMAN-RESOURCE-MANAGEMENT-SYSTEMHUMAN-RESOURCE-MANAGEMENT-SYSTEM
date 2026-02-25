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
  // Kiểm tra và xử lý dữ liệu nhận diện (đặt trước các hàm xử lý)
  const user = recognitionData?.data?.user || recognitionData?.user || {};
  const confidence = user?.confidence_score ?? recognitionData?.data?.confidence ?? 0;
  const fullName = user?.fullName || user?.full_name || user?.fullname || user?.name || recognitionData?.data?.fullName || recognitionData?.data?.full_name || recognitionData?.data?.fullname || user?.username || recognitionData?.full_name || 'Chưa xác định';
  const username = user?.username || recognitionData?.username || recognitionData?.data?.username || 'N/A';
  const isRecognitionSuccessful = Boolean(recognitionData?.success && user?.user_id);
  const isSpoof = Boolean(recognitionData?.is_spoof || recognitionData?.data?.is_spoof);
  const serverMessage = recognitionData?.message || recognitionData?.error || recognitionData?.data?.message || recognitionData?.data?.error || recognitionData?.details?.message || '';

  const handleConfirm = async () => {
    console.log('🔵 [Confirmation] handleConfirm called');
    console.log('🔵 [Confirmation] Recognition data:', JSON.stringify(recognitionData, null, 2));

    if (!isRecognitionSuccessful) {
      console.log('❌ [Confirmation] Recognition not successful');
      Alert.alert('Lỗi', serverMessage || 'Không thể chấm công do nhận diện không thành công hoặc độ tin cậy thấp');
      return;
    }

    setIsConfirming(true);
    try {
      const recognitionLogId = recognitionData?.data?.recognition_log_id;
      console.log('🔵 [Confirmation] Recognition Log ID:', recognitionLogId);

      if (!recognitionLogId) {
        throw new Error('Không tìm thấy ID nhận diện. Vui lòng thử lại.');
      }

      let deviceToken = null;
      try {
        deviceToken = await AuthTokenManager.getAccessToken();
        console.log('🔵 [Confirmation] Token retrieved:', deviceToken ? 'Yes' : 'No');
      } catch (e) {
        console.log('⚠️ [Confirmation] Token retrieval failed:', e);
      }

      const attendancePayload = {
        recognition_log_id: recognitionLogId,
        userId: user.user_id,
        type: recognitionData?.data?.recognition_type || 'check_in',
        timestamp: recognitionData?.data?.timestamp || new Date().toISOString(),
        imageUri: imageUri,
        confidence: confidence,
        method: recognitionData?.data?.method,
        location: null,
        token: deviceToken
      };

      console.log('📤 [Confirmation] Calling submitAttendance with payload:', JSON.stringify(attendancePayload, null, 2));

      const result = await AttendanceAPI.submitAttendance(attendancePayload);
      console.log('📥 [Confirmation] API response:', JSON.stringify(result, null, 2));

      if (result.success) {
        const successMessage = result.data ?
          `Chấm công thành công!\nTên nhân viên: ${fullName}\nTài khoản: ${user.username}\nLoại: ${recognitionData?.data?.recognition_type === 'check_in' ? 'Vào làm' : 'Tan làm'}\nThời gian: ${new Date().toLocaleString('vi-VN')}` :
          `Chấm công thành công!\nTên nhân viên: ${fullName}\nTài khoản: ${user.username}\nThời gian: ${new Date().toLocaleString('vi-VN')}`;

        Alert.alert('Thành công', successMessage, [
          {
            text: 'OK',
            onPress: () => {
              if (onConfirm) onConfirm(result.data);
              if (onReset) onReset();
            }
          }
        ]);
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
    if (conf >= 70) return '#34C759'; // Green - Very high
    if (conf >= 50) return '#FF9500'; // Orange - Medium
    if (conf >= 35) return '#FF9500'; // Orange - Low but acceptable
    return '#FF3B30'; // Red - Very low
  };

  const getConfidenceText = (confidence) => {
    if (!confidence) return 'Không xác định';
    const conf = parseFloat(confidence);
    if (conf >= 70) return 'Rất cao';
    if (conf >= 50) return 'Cao';
    if (conf >= 35) return 'Trung bình';
    return 'Thấp';
  };
  console.log('Processing recognition data:', {
    success: recognitionData?.success,
    confidence: confidence,
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
    } else if (isSpoof) {
      return (
        <View style={[styles.confidenceBadge, { backgroundColor: '#FF3B30' }]}>
          <Text style={styles.confidenceText}>GIẢ MẠO</Text>
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
          {!isSpoof ? (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={24} color="#007AFF" />
                <Text style={styles.infoLabel}>Tên nhân viên:</Text>
                <Text style={[styles.infoValue, !isRecognitionSuccessful && styles.errorText]}>
                  {isRecognitionSuccessful ? fullName : 'Chưa nhận diện'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-circle" size={24} color="#007AFF" />
                <Text style={styles.infoLabel}>Tài khoản:</Text>
                <Text style={[styles.infoValue, !isRecognitionSuccessful && styles.errorText]}>
                  {isRecognitionSuccessful ? username : 'Chưa nhận diện'}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={24} color="#FF3B30" />
              <Text style={[styles.infoValue, styles.errorText, { marginLeft: 10, fontSize: 16, fontWeight: '700' }]}>
                HỆ THỐNG AN NINH
              </Text>
            </View>
          )}

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

          {/* Di chuyển thông báo lỗi vào bên trong khung kết quả */}
          {serverMessage ? (
            <View style={[isRecognitionSuccessful && !isSpoof ? styles.infoContainerSmall : styles.errorContainer, { marginTop: 15, marginHorizontal: 0, width: '100%', elevation: 0, shadowOpacity: 0 }]}>
              <Ionicons name={isRecognitionSuccessful && !isSpoof ? "information-circle" : "alert-circle"} size={20} color={isRecognitionSuccessful && !isSpoof ? "#007AFF" : "#FF3B30"} />
              <Text style={[isRecognitionSuccessful && !isSpoof ? styles.infoText : styles.errorMessage, { marginLeft: 8 }]}>
                {isRecognitionSuccessful && !isSpoof && serverMessage.includes('Nhận diện thành công')
                  ? `Nhận diện thành công: ${fullName}`
                  : isSpoof
                    ? serverMessage // Hiện chính xác thông báo CẢNH BÁO GIAN LẬN từ server
                    : (serverMessage || 'Không xác định được danh tính')}
              </Text>
            </View>
          ) : (
            isRecognitionSuccessful && confidence < 50 && confidence >= 35 && (
              <View style={[styles.warningContainer, { marginTop: 15 }]}>
                <Ionicons name="alert-circle" size={24} color="#FF9500" />
                <Text style={styles.warningMessage}>
                  ⚠️ Độ tin cậy thấp ({confidence}%). Vui lòng kiểm tra lại.
                </Text>
              </View>
            )
          )}
        </View>
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningMessage: {
    flex: 1,
    fontSize: 14,
    color: '#CC7A00',
    marginLeft: 8,
    lineHeight: 20,
    fontWeight: '500',
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
  infoContainerSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F2FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
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
import React, { useRef, useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  Alert, Dimensions, StatusBar, ActivityIndicator, Platform 
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FaceDetector from 'expo-face-detector';

import AuthTokenManager from '../services/AuthTokenManager';
import FaceValidationHelper from '../utils/FaceValidationHelper';
import apiConfig from '../config/apiConfig';
import { API_ENDPOINTS } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

// --- CẤU HÌNH UI ---
const OVAL_WIDTH = width * 0.8; 
const OVAL_HEIGHT = OVAL_WIDTH * 1.3;

const STEP_CONFIG = [
  { 
    id: 1, 
    key: 'CENTER', 
    name: 'Chính diện', 
    instruction: 'NHÌN THẸNG vào máy ảnh', 
    icon: 'person',
    yawRange: [-10, 10],  // Cho phép quay +/- 10 độ
    rollRange: [-10, 10]  // Cho phép nghiêng +/- 10 độ
  },
  { 
    id: 2, 
    key: 'LEFT', 
    name: 'Quay trái', 
    instruction: 'Quay mặt nhẹ sang TRÁI', 
    icon: 'arrow-back',
    yawRange: [-45, -15],  // Quay trái 15-45 độ
    rollRange: [-15, 15]
  },
  { 
    id: 3, 
    key: 'RIGHT', 
    name: 'Quay phải', 
    instruction: 'Quay mặt nhẹ sang PHẢI', 
    icon: 'arrow-forward',
    yawRange: [15, 45],  // Quay phải 15-45 độ
    rollRange: [-15, 15]
  },
  { 
    id: 4, 
    key: 'MASK', 
    name: 'Khẩu trang', 
    instruction: 'ĐEO KHẨU TRANG và nhìn thẳng', 
    icon: 'medical',
    yawRange: [-10, 10],
    rollRange: [-10, 10],
    allowMask: true  // Cho phép khẩu trang
  }
];

const STEP_DURATION = 3; // Thời gian quay quy định
const VIDEO_QUALITY = Camera.Constants.VideoQuality['480p'];

const COLORS = {
    PRIMARY: '#FFD700', // Vàng kim
    BG_DARK: '#121212',
    BG_PANEL: '#1E1E1E', 
    SUCCESS: '#4CD964',
    DANGER: '#FF3B30',
    TEXT_GRAY: '#A0A0A0',
    WHITE: '#FFFFFF'
};

export default function RegisterFaceScreenVideo({ user, onCancel }) {
  const cameraRef = useRef(null);
  const isMounted = useRef(true);
  
  const [userInfo, setUserInfo] = useState(user || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // State quản lý quay
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // State quản lý khuôn mặt (Validation chặt chẽ giống màn nhận diện)
  const [faceDetected, setFaceDetected] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [faceValidation, setFaceValidation] = useState({ 
    isValid: false, 
    message: 'Đưa mặt vào khung', 
    color: '#A0A0A0' 
  });
  const [largestFace, setLargestFace] = useState(null);

  const [capturedVideos, setCapturedVideos] = useState({
    CENTER: null, LEFT: null, RIGHT: null, MASK: null
  });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Load user info from props only (no auto-login)
      if (!userInfo) {
        console.log('⚠️ No user info provided, please login first');
        Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đăng ký khuôn mặt', [
          { text: 'OK', onPress: onCancel }
        ]);
      }
    })();
    return () => { isMounted.current = false; };
  }, []);

  // Hàm delay như code gốc
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Fetch with timeout to avoid hanging network requests
  const fetchWithTimeout = (url, options = {}, timeout = 20000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
    ]);
  };

  // Hàm xử lý khi phát hiện khuôn mặt - VALIDATION ĐƠN GIẢN CHỈ CHECK SIZE
  const handleFacesDetected = ({ faces }) => {
    if (isRecording || countdown !== null) return;

    const currentStep = STEP_CONFIG[currentStepIndex];
    
    // 1. Kiểm tra số lượng mặt - Cho phép nhiều nhưng lấy mặt lớn nhất
    if (!faces || faces.length === 0) {
      setFaceDetected(false);
      setFaceValidation({ 
        isValid: false, 
        message: 'KHÔNG THẤY MẶT', 
        color: '#FF3B30' 
      });
      setLargestFace(null);
      return;
    }

    // 2. Lấy khuôn mặt lớn nhất (nếu có nhiều người)
    const face = FaceValidationHelper.getLargestFace(faces);
    setLargestFace(face);

    // Hiển thị warning nếu có nhiều người
    if (faces.length > 1) {
      console.log(`⚠️ Phát hiện ${faces.length} người, chọn mặt lớn nhất`);
    }

    // 3. Validate khuôn mặt (chỉ check size, không check góc)
    const validation = FaceValidationHelper.validateFaceLocally(face, { width, height });
    
    // 4. Cập nhật trạng thái
    if (validation.isValid) {
      setFaceDetected(true);
      setFaceValidation({
        isValid: true,
        message: faces.length > 1 
          ? `✅ CHỌN 1/${faces.length} NGƯỜI - SẴN SÀNG`
          : '✅ SẴN SÀNG QUAY',
        color: '#4CD964'
      });
    } else {
      setFaceDetected(false);
      setFaceValidation(validation);
    }
  };

  // --- LOGIC QUAY VIDEO VỚI VALIDATION CHẶT CHẼ ---
  const startRecording = async () => {
    const currentStep = STEP_CONFIG[currentStepIndex];
    
    // 1. Kiểm tra khuôn mặt (chặt chẽ hơn)
    if (!faceValidation.isValid && currentStep.key !== 'MASK') {
      Alert.alert(
        'Cảnh báo', 
        faceValidation.message || 'Vui lòng đưa khuôn mặt vào khung hình và đảm bảo đúng tư thế.'
      );
      return;
    }

    // 2. Kiểm tra có phát hiện mặt không
    if (!faceDetected && currentStep.key !== 'MASK') {
      Alert.alert('Cảnh báo', 'Vui lòng đưa khuôn mặt vào khung hình.');
      return;
    }

    if (!cameraRef.current || isRecording) return;

    try {
      // 3. Đếm ngược 3-2-1
      setCountdown(3); await delay(1000);
      setCountdown(2); await delay(1000);
      setCountdown(1); await delay(1000);
      setCountdown(null);

      // 4. Bắt đầu quay
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer chạy thanh hiển thị thời gian
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= STEP_DURATION) clearInterval(timer);
          return newTime;
        });
      }, 100);

      // Gọi lệnh quay của Expo Camera
      const videoData = await cameraRef.current.recordAsync({
        maxDuration: STEP_DURATION,
        quality: VIDEO_QUALITY,
        mute: true,
      });

      // 5. Kết thúc quay
      clearInterval(timer);
      if (!isMounted.current) return;
      
      setIsRecording(false);
      setRecordingTime(STEP_DURATION); // Set full thanh thời gian
      
      // Lưu video
      setCapturedVideos(prev => ({ ...prev, [currentStep.key]: videoData.uri }));
      
      // Reset validation cho bước tiếp theo (không tự động chuyển)
      setTimeout(() => {
        if (isMounted.current) {
          setRecordingTime(0);
          setFaceValidation({ 
            isValid: false, 
            message: 'Đưa mặt vào khung', 
            color: '#A0A0A0' 
          });
        }
      }, 800);

    } catch (error) {
      console.error("Lỗi quay video:", error);
      setIsRecording(false);
      setCountdown(null);
      Alert.alert("Lỗi", "Camera bị gián đoạn, vui lòng thử lại.");
    }
  };

  // --- LOGIC GỬI API (GIỮ NGUYÊN) ---
  const handleUploadAll = async () => {
    const anglesToSend = STEP_CONFIG.filter(step => capturedVideos[step.key]);
    if (anglesToSend.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errors = [];

    try {
      if (!apiConfig.initialized) await apiConfig.initialize();
      const token = await AuthTokenManager.getAccessToken();
      const finalUsername = userInfo?.username || userInfo?.full_name || 'unknown_user';

      for (const step of anglesToSend) {
        const videoUri = capturedVideos[step.key];
        const formData = new FormData();
        formData.append('user_id', userInfo?.id?.toString() || '0');
        formData.append('username', finalUsername);
        formData.append('angle_type', step.key);
        formData.append('target_frames', '60');

        const fileUri = Platform.OS === 'ios' ? videoUri.replace('file://', '') : videoUri;
        formData.append('video_file', {
          uri: fileUri,
          name: `${step.key.toLowerCase()}_${Date.now()}.mp4`,
          type: 'video/mp4'
        });

        try {
          // Gọi qua Gateway (không dùng direct=true nữa)
          const url = apiConfig.getURL(API_ENDPOINTS.VIDEO_REGISTER_MULTI, false);
          const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          }, 30000); // 30s timeout per video

          if (!res || !res.ok) {
            const status = res && res.status ? res.status : 'NO_RESPONSE';
            console.warn(`Upload failed for ${step.key}: ${status}`);
            
            // Try to parse detailed error message from response
            let errorDetail = 'Lỗi không xác định';
            try {
              if (res) {
                const errorData = await res.json();
                console.log(`Error data for ${step.key}:`, errorData);
                
                // Parse detailed error from backend
                if (errorData && errorData.message) {
                  errorDetail = errorData.message;
                } else if (errorData && errorData.detail) {
                  errorDetail = errorData.detail;
                }
                
                // Add metadata if available (rejection stats)
                if (errorData && errorData.metadata && errorData.metadata.rejection_stats) {
                  const stats = errorData.metadata.rejection_stats;
                  console.log(`Rejection stats for ${step.key}:`, stats);
                }
              }
            } catch (e) {
              console.error(`Failed to parse error JSON for ${step.key}:`, e);
            }
            // IMPORTANT: Add step name prefix to map error to correct step
            errors.push({ stepName: step.name, stepKey: step.key, message: errorDetail });
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error uploading ${step.key}:`, err.message || err);
          errors.push({ stepName: step.name, stepKey: step.key, message: err.message || 'Lỗi kết nối' });
        }
      }

      // Build status message showing which steps succeeded/failed with DETAILS
      const statusDetails = [];
      const errorMap = new Map(); // Map step.key -> error message
      
      // Build error map from errors array
      errors.forEach(errObj => {
        errorMap.set(errObj.stepKey, errObj.message);
      });

      STEP_CONFIG.forEach(step => {
        if (!capturedVideos[step.key]) return;
        
        const errorMsg = errorMap.get(step.key);
        if (errorMsg) {
          // Show detailed error message with proper formatting
          statusDetails.push(`❌ ${step.name}:\n   ${errorMsg}`);
        } else {
          statusDetails.push(`✅ ${step.name}: Thành công`);
        }
      });

      if (errors.length === 0) {
        Alert.alert(
          '✅ Đăng ký hoàn tất!', 
          `Đã đăng ký thành công ${successCount} góc:\n\n${statusDetails.join('\n\n')}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Reset state after success
              setCapturedVideos({ CENTER: null, LEFT: null, RIGHT: null, MASK: null });
              setCurrentStepIndex(0);
              onCancel();
            }
          }]
        );
      } else {
        // Show detailed error with full backend messages
        Alert.alert(
          successCount > 0 ? '⚠️ Đăng ký một phần' : '❌ Đăng ký thất bại',
          `${statusDetails.join('\n\n')}\n\n${errors.length === anglesToSend.length ? 'Tất cả góc quay đều thất bại.' : `Đã đăng ký ${successCount}/${anglesToSend.length} góc.`}\n\nHãy quay lại các góc bị lỗi và gửi lại.`,
          [
            { 
              text: 'Đóng', 
              onPress: () => {
                // Keep failed videos, clear successful ones
                const newVideos = { ...capturedVideos };
                STEP_CONFIG.forEach(step => {
                  const failed = errorMap.has(step.key);
                  if (!failed && newVideos[step.key]) {
                    newVideos[step.key] = null; // Clear successful ones
                  }
                });
                setCapturedVideos(newVideos);
              },
              style: 'cancel' 
            },
            { 
              text: 'Quay lại tất cả', 
              onPress: () => {
                setCapturedVideos({ CENTER: null, LEFT: null, RIGHT: null, MASK: null });
                setCurrentStepIndex(0);
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi không xác định');
    } finally {
      if (isMounted.current) setIsUploading(false);
    }
  };

  const getDisplayName = () => {
      if (!userInfo) return 'Đang tải...';
      const fullName = userInfo.full_name || '';
      const userName = userInfo.username || '';
      if (fullName && userName) return `${fullName} - ${userName}`;
      return fullName || userName || 'Người dùng';
  };

  if (hasPermission === null || hasPermission === false) {
    return <View style={styles.centerBox}><Text style={{color: 'white'}}>Cần quyền Camera</Text></View>;
  }

  const currentStep = STEP_CONFIG[currentStepIndex];
  const capturedCount = Object.values(capturedVideos).filter(v => v !== null).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. CAMERA LAYER */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        type={Camera.Constants.Type.front}
        ratio="16:9"
        // Thêm lại sự kiện nhận diện mặt
        onFacesDetected={isRecording || countdown ? undefined : handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
          minDetectionInterval: 500,
          tracking: true,
        }}
      />

      {/* 2. KHUNG GUIDELINE & ĐẾM NGƯỢC */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
         <View style={styles.guideContainer}>
            <View style={[
                styles.ovalFrame,
                { 
                  borderColor: isRecording ? COLORS.DANGER : (faceDetected || currentStep.key === 'MASK' ? COLORS.PRIMARY : '#666'),
                  borderWidth: isRecording ? 4 : 3
                }
            ]}>
                {/* Hiển thị số đếm ngược 3-2-1 giữa màn hình */}
                {countdown && (
                   <View style={styles.countdownContainer}>
                      <Text style={styles.countdownText}>{countdown}</Text>
                   </View>
                )}
            </View>
         </View>
      </View>

      {/* 3. UI LAYER */}
      <SafeAreaView style={styles.uiContainer}>
        
        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.iconBtn}>
                <Ionicons name="close" size={28} color={COLORS.WHITE} />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>ĐĂNG KÝ KHUÔN MẶT</Text>
                <View style={styles.nameTag}>
                    <Ionicons name="person-circle" size={16} color={COLORS.PRIMARY} />
                    <Text style={styles.userName}>{getDisplayName()}</Text>
                </View>
            </View>
            
            {/* Removed logout button - user must login each time */}
            <View style={styles.iconBtn} />
        </View>

        {/* FOOTER PANEL */}
        <View style={styles.footerPanel}>
            
            {/* Hiển thị trạng thái validation */}
            <View style={[styles.validationBox, { backgroundColor: faceValidation.color + '33' }]}>
                <Text style={[styles.validationText, { color: faceValidation.color }]}>
                    {faceValidation.message}
                </Text>
            </View>

            <View style={styles.instructionBox}>
                <Text style={styles.stepLabel}>BƯỚC {currentStepIndex + 1}/{STEP_CONFIG.length}</Text>
                <Text style={styles.instructionText}>{currentStep.instruction}</Text>
            </View>

            {/* Các bước chọn */}
            <View style={styles.stepSelectorContainer}>
                {STEP_CONFIG.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isDone = capturedVideos[step.key] !== null;
                    
                    let bgColor = '#333';
                    let iconColor = '#888';
                    let iconName = step.icon + '-outline';

                    if (isDone) {
                        bgColor = COLORS.SUCCESS;
                        iconColor = 'white';
                        iconName = 'checkmark';
                    } else if (isActive) {
                        bgColor = 'rgba(255, 215, 0, 0.2)';
                        iconColor = COLORS.PRIMARY;
                        iconName = step.icon;
                    }

                    return (
                        <TouchableOpacity 
                            key={step.id}
                            onPress={() => !isRecording && !countdown && setCurrentStepIndex(index)}
                            disabled={isRecording || countdown !== null}
                            style={[
                                styles.stepButton,
                                { backgroundColor: bgColor },
                                isActive && styles.stepButtonActive
                            ]}
                        >
                            <Ionicons name={iconName} size={isDone ? 26 : 24} color={iconColor} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Vùng điều khiển */}
            <View style={styles.actionArea}>
                {!isUploading ? (
                    (isRecording || countdown) ? (
                        <View style={styles.recordingState}>
                             {/* Nếu đang đếm ngược thì hiện text chuẩn bị, đang quay thì hiện giây */}
                             {countdown ? (
                               <Text style={styles.timerText}>Chuẩn bị...</Text>
                             ) : (
                               <>
                                 <Text style={styles.timerText}>{recordingTime.toFixed(1)}s</Text>
                                 <ActivityIndicator size="small" color={COLORS.DANGER} />
                               </>
                             )}
                        </View>
                    ) : (
                        <View style={styles.controlsRow}>
                             {/* Nút Quay */}
                             <TouchableOpacity style={styles.mainCaptureBtn} onPress={startRecording}>
                                 <View style={styles.innerCaptureBtn}>
                                     <Ionicons name="videocam" size={34} color="black" />
                                 </View>
                             </TouchableOpacity>

                             {/* Nút Gửi */}
                             {capturedCount > 0 && (
                                 <TouchableOpacity style={styles.sendBtn} onPress={handleUploadAll}>
                                     <Ionicons name="cloud-upload" size={20} color="white" />
                                     <Text style={styles.sendBtnText}>Gửi ({capturedCount})</Text>
                                 </TouchableOpacity>
                             )}
                        </View>
                    )
                ) : (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={{color: '#aaa', marginTop: 8}}>Đang xử lý...</Text>
                    </View>
                )}
            </View>

        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  uiContainer: { flex: 1, justifyContent: 'space-between' },

  header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingHorizontal: 20, paddingTop: 10, zIndex: 10,
  },
  headerInfo: { alignItems: 'center', flex: 1, marginTop: 5 },
  headerTitle: { 
      color: COLORS.WHITE, fontSize: 18, fontWeight: 'bold', 
      marginBottom: 6, textTransform: 'uppercase',
      textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  nameTag: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
      paddingVertical: 4, paddingHorizontal: 12, borderRadius: 15, gap: 5
  },
  userName: { color: COLORS.PRIMARY, fontSize: 14, fontWeight: '600' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },

  guideContainer: { 
      flex: 1, justifyContent: 'center', alignItems: 'center',
      marginTop: -120, // Đẩy lên cao
  },
  ovalFrame: {
      width: OVAL_WIDTH, height: OVAL_HEIGHT, borderRadius: OVAL_WIDTH, 
      borderStyle: 'dashed', backgroundColor: 'transparent',
      justifyContent: 'center', alignItems: 'center'
  },
  countdownContainer: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center'
  },
  countdownText: {
      fontSize: 60, fontWeight: 'bold', color: COLORS.PRIMARY
  },

  footerPanel: {
      backgroundColor: COLORS.BG_PANEL,
      borderTopLeftRadius: 25, borderTopRightRadius: 25,
      padding: 15, alignItems: 'center', width: '100%', paddingBottom: 20,
      shadowColor: "#000", shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.5, shadowRadius: 10, elevation: 15,
  },
  validationBox: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 15,
      marginBottom: 8,
      minWidth: '80%',
      alignItems: 'center',
  },
  validationText: {
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      letterSpacing: 0.5,
  },
  instructionBox: { alignItems: 'center', marginBottom: 12 },
  stepLabel: { color: COLORS.PRIMARY, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 3 },
  instructionText: { color: 'white', fontSize: 17, fontWeight: '800', textAlign: 'center' },

  stepSelectorContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  stepButton: { width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  stepButtonActive: { borderWidth: 2, borderColor: COLORS.PRIMARY, transform: [{scale: 1.05}] },

  actionArea: { height: 65, justifyContent: 'center', width: '100%' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  
  mainCaptureBtn: {
      width: 65, height: 65, borderRadius: 33, backgroundColor: 'rgba(255, 215, 0, 0.3)',
      justifyContent: 'center', alignItems: 'center',
  },
  innerCaptureBtn: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.PRIMARY,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: COLORS.PRIMARY, shadowOpacity: 0.6, shadowRadius: 8, elevation: 5
  },
  sendBtn: {
      position: 'absolute', right: 0, flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: COLORS.SUCCESS, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
  },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  recordingState: { alignItems: 'center' },
  timerText: { color: COLORS.DANGER, fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  loadingBox: { alignItems: 'center' },
});
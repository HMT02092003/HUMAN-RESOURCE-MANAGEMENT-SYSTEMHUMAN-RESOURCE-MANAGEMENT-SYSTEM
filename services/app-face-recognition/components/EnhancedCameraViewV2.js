import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { Ionicons } from '@expo/vector-icons';
import AttendanceAPI from '../services/AttendanceAPI';
import FaceValidationHelper from '../utils/FaceValidationHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_RATIO = '4:3';

export default function EnhancedCameraViewV2({ onCapture }) {
  // --- STATE ---
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  
  const [currentValidation, setCurrentValidation] = useState({
    isValid: false,
    message: 'Đang tìm khuôn mặt...',
    color: '#007AFF' 
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [stableFrameCount, setStableFrameCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // --- REFS ---
  const cameraRef = useRef(null);
  const lastBackendCallTime = useRef(0);
  const processingRef = useRef(false);
  const stableCountRef = useRef(0);
  const isMounted = useRef(true);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // --- CẤU HÌNH ---
  const faceDetectorSettings = useMemo(() => ({
    mode: FaceDetector.FaceDetectorMode.fast,
    detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
    runClassifications: FaceDetector.FaceDetectorClassifications.none,
    minDetectionInterval: 200, 
    tracking: true,
  }), []);

  // --- EFFECT ---
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (isMounted.current) setHasPermission(status === 'granted');
      checkConnection();
    })();
    return () => { isMounted.current = false; };
  }, []);

  const checkConnection = async () => {
    try {
      const ok = await AttendanceAPI.testConnection();
      if (isMounted.current) setConnectionStatus(ok ? 'connected' : 'disconnected');
    } catch (error) {
      if (isMounted.current) setConnectionStatus('disconnected');
    }
  };

  // --- XỬ LÝ NHẬN DIỆN ---
  const handleFacesDetected = ({ faces: detectedFaces }) => {
    if (processingRef.current || !isMounted.current) return;
    
    // 1. Nếu không có mặt
    if (!detectedFaces || detectedFaces.length === 0) {
      if (currentValidation.message !== 'ĐƯA MẶT VÀO CAMERA') {
        setCurrentValidation({
          isValid: false,
          message: 'ĐƯA MẶT VÀO CAMERA',
          color: '#90A4AE' 
        });
        resetStability();
      }
      return;
    }
    
    // 2. Lấy mặt to nhất
    const mainFace = FaceValidationHelper.getLargestFace(detectedFaces);
    if (!mainFace) return;

    // --- LOGIC VALIDATE TẠI CHỖ ---
    const imageSize = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
    
    const faceArea = mainFace.bounds.size.width * mainFace.bounds.size.height;
    const frameArea = imageSize.width * imageSize.height;
    const sizePercent = (faceArea / frameArea) * 100;
    const rollAngle = mainFace.rollAngle || 0; 

    let isValid = true;
    let message = 'GIỮ YÊN';
    let color = '#4CAF50';

    // ĐIỀU KIỆN 1: Kích thước (10% - 85%)
    if (sizePercent < 10) { 
      isValid = false;
      message = 'LẠI GẦN HƠN';
      color = '#FF9500';
    } else if (sizePercent > 85) {
      isValid = false;
      message = 'XA RA MỘT CHÚT';
      color = '#FF9500';
    }
    // ĐIỀU KIỆN 2: Góc nghiêng (Roll) - CHỈNH VỀ 18 ĐỘ THEO YÊU CẦU
    else if (Math.abs(rollAngle) > 18) {
      isValid = false;
      message = 'GIỮ ĐẦU THẲNG';
      color = '#FF9500';
    }

    // Cập nhật UI
    setCurrentValidation({ isValid, message, color });
    
    // Logic Auto-capture
    if (isValid) {
      stableCountRef.current += 1;
      const newCount = stableCountRef.current;
      setStableFrameCount(newCount);
      
      Animated.timing(progressAnim, {
        toValue: (newCount / 8) * 100, 
        duration: 150,
        useNativeDriver: false
      }).start();
      
      const now = Date.now();
      if (newCount >= 8 && (now - lastBackendCallTime.current) > 3000) {
        captureAndRecognize();
      }
    } else {
      resetStability();
    }
  };

  const resetStability = () => {
    if (stableCountRef.current === 0) return;
    stableCountRef.current = 0;
    setStableFrameCount(0);
    Animated.timing(progressAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const captureAndRecognize = async () => {
    if (processingRef.current || !cameraRef.current || !cameraReady) return;

    try {
      processingRef.current = true;
      setIsProcessing(true);
      lastBackendCallTime.current = Date.now();
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false, 
        skipProcessing: true,
      });

      const aiResponse = await AttendanceAPI.sendImageForRecognition(photo.uri, {
        recognition_type: 'check_in', validation_mode: 'normal', location: { latitude: null, longitude: null }
      });

      if (!isMounted.current) return;
      onCapture(photo.uri, aiResponse);

      if (aiResponse?.success) {
        setCurrentValidation({ isValid: true, message: 'THÀNH CÔNG!', color: '#4CAF50' });
      } else {
        const msg = aiResponse?.message || 'Không nhận diện được';
        setCurrentValidation({ isValid: false, message: msg, color: '#FF6B6B' });
        setTimeout(() => {
          if (isMounted.current) {
            processingRef.current = false;
            setIsProcessing(false);
            resetStability();
          }
        }, 3000);
      }
    } catch (error) {
      if (isMounted.current) {
        processingRef.current = false;
        setIsProcessing(false);
        resetStability();
      }
    }
  };

  if (hasPermission === null) return <View style={styles.container}><ActivityIndicator /></View>;
  if (hasPermission === false) return <View style={styles.container}><Text style={{color:'#fff'}}>Thiếu quyền Camera</Text></View>;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100], outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          ratio={CAMERA_RATIO}
          autoFocus={Camera.Constants.AutoFocus.on}
          // [FIX QUAN TRỌNG]: 
          // mirrorImage={true} để ảnh chụp giống hệt soi gương
          // Bỏ wrapper scaleX để camera hiển thị tự nhiên
          mirrorImage={cameraType === Camera.Constants.Type.front} 
          onCameraReady={() => { if (isMounted.current) setCameraReady(true); }}
          onFacesDetected={cameraReady ? handleFacesDetected : undefined}
          faceDetectorSettings={faceDetectorSettings}
        >
          {/* UI Overlay */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBar, { backgroundColor: currentValidation.color }]}>
              <Ionicons name={currentValidation.isValid ? "checkmark-circle" : "scan-outline"} size={24} color="#FFF" />
              <Text style={styles.statusText}>
                {currentValidation.message} {stableFrameCount > 0 && stableFrameCount < 8 ? `(${stableFrameCount}/8)` : ''}
              </Text>
            </View>
          </View>

          {stableFrameCount > 0 && (
            <View style={styles.progressWrapper}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.processingText}>ĐANG XỬ LÝ...</Text>
            </View>
          )}

          <View style={styles.bottomControls}>
            <TouchableOpacity onPress={() => {
              resetStability();
              setCameraReady(false);
              setCameraType(cameraType === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back);
            }} style={styles.iconButton}>
              <Ionicons name="camera-reverse" size={30} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={captureAndRecognize}
              disabled={isProcessing}
              style={styles.captureButton}
            >
              <View style={[
                styles.captureInner,
                { backgroundColor: currentValidation.isValid ? '#4CAF50' : '#FFF' }
              ]} />
            </TouchableOpacity>

            <View style={styles.iconButton}>
              <Ionicons name={connectionStatus === 'connected' ? "wifi" : "wifi-outline"} size={24} color={connectionStatus === 'connected' ? "#4CAF50" : "#FF6B6B"} />
            </View>
          </View>
        </Camera>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  camera: { flex: 1, width: '100%', height: '100%' },
  statusContainer: { position: 'absolute', top: 60, width: '100%', alignItems: 'center', zIndex: 20 },
  statusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, minWidth: 200, justifyContent: 'center', elevation: 5 },
  statusText: { color: '#FFF', marginLeft: 10, fontWeight: 'bold', fontSize: 16 },
  progressWrapper: { position: 'absolute', top: 110, left: '20%', width: '60%', height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden', zIndex: 20 },
  progressBar: { height: '100%', backgroundColor: '#4CAF50' },
  bottomControls: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20, zIndex: 30 },
  iconButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
  captureButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  captureInner: { width: 64, height: 64, borderRadius: 32 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  processingText: { color: '#FFF', marginTop: 15, fontSize: 18, fontWeight: 'bold' }
});
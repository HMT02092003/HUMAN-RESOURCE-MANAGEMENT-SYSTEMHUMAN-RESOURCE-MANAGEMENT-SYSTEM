//
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, Dimensions,
    ActivityIndicator, Animated, Alert, TouchableOpacity, SafeAreaView, Platform, StatusBar
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { Ionicons } from '@expo/vector-icons';
import AttendanceAPI from '../services/AttendanceAPI';
import FaceValidationHelper from '../utils/FaceValidationHelper';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 40 : StatusBar.currentHeight;

export default function EnhancedCameraViewV2({ onCapture }) {
    // --- STATE ---
    const [step, setStep] = useState(1);
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  
    // Chỉ còn lại State điểm số và hướng dẫn
    const [score, setScore] = useState(0); 
    const [guidance, setGuidance] = useState({ text: 'Đưa mặt vào khung', color: '#90A4AE', icon: 'scan' });

    // --- REFS ---
    const cameraRef = useRef(null);
    const processingRef = useRef(false);
    const stableCountRef = useRef(0);
    const step1PhotoRef = useRef(null);
    const baselinePoseRef = useRef({ yaw: 0, roll: 0 });
    const isMounted = useRef(true);
    const stepTransitionRef = useRef(false); 
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Settings
    const faceDetectorSettings = useMemo(() => ({
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
        minDetectionInterval: 100, 
        tracking: true,
    }), []);

    useEffect(() => {
        isMounted.current = true;
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (isMounted.current) setHasPermission(status === 'granted');
        })();
        return () => { isMounted.current = false; };
    }, []);

    const resetFlow = () => {
        setStep(1); setScore(0);
        step1PhotoRef.current = null;
        stableCountRef.current = 0;
        stepTransitionRef.current = false;
        Animated.timing(progressAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        setGuidance({ text: 'Đưa mặt vào khung', color: '#90A4AE', icon: 'scan' });
    };

    const handleFacesDetected = ({ faces }) => {
        if (processingRef.current || !isMounted.current) return;
        if (stepTransitionRef.current) return; 

        if (!faces || faces.length === 0) {
            if (step === 1) {
                    setScore(0);
                    setGuidance({ text: 'Không thấy mặt', color: '#F44336', icon: 'alert-circle' });
                    stableCountRef.current = 0;
            }
            return;
        }
    
        const face = FaceValidationHelper.getLargestFace(faces);
        if (!face) return;

        const yaw = face.yawAngle || 0;
        const roll = face.rollAngle || 0;

        // ================= STEP 1: CĂN CHỈNH (NỚI LỎNG) =================
        if (step === 1) {
                // [LOGIC MỚI]: Tính điểm dễ hơn
                const maxErr = Math.max(Math.abs(yaw), Math.abs(roll));
        
                // Công thức cũ: 100 - (err * 3) -> Lệch 10 độ mất 30 điểm (Còn 70 -> Trượt)
                // Công thức mới: 100 - (err * 1.2) -> Lệch 10 độ mất 12 điểm (Còn 88 -> ĐẬU)
                // Lệch 15 độ -> 100 - 18 = 82 (dễ chịu)
                let currentScore = Math.max(0, 100 - Math.round(maxErr * 1.2));
                setScore(currentScore);

            let valid = false;
            let msg = '';
            let color = '#4CAF50';
            let icon = 'happy';

            // Ngưỡng đậu là 80 điểm (Tương đương cho phép nghiêng ~13 độ)
            if (currentScore >= 80) {
                valid = true;
                msg = 'VỊ TRÍ TỐT...';
                icon = 'checkmark-circle';
            } else {
                // Chỉ báo lỗi khi điểm quá thấp
                color = '#FF9800'; 
            
                if (Math.abs(roll) > 15) { // Nới lên 15 độ
                    msg = 'ĐỂ ĐẦU THẲNG HƠN';
                    icon = 'resize';
                } else if (Math.abs(yaw) > 15) { // Nới lên 15 độ
                    msg = yaw > 0 ? 'QUAY PHẢI MỘT CHÚT' : 'QUAY TRÁI MỘT CHÚT';
                    icon = 'eye';
                } else {
                    msg = 'CĂN CHỈNH LẠI';
                    icon = 'scan';
                }
            }

            setGuidance({ text: msg, color, icon });

            if (valid) {
                stableCountRef.current += 1;
                Animated.timing(progressAnim, {
                    toValue: (stableCountRef.current / 5) * 100,
                    duration: 100, useNativeDriver: false
                }).start();

                if (stableCountRef.current >= 5) {
                    baselinePoseRef.current = { yaw, roll };
                    captureStep1();
                }
            } else {
                stableCountRef.current = 0;
                Animated.timing(progressAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            }
        }

        // ================= STEP 2: QUAY ĐẦU =================
        else if (step === 2) {
            setGuidance({ text: 'QUAY NHẸ SANG BÊN', color: '#2196F3', icon: 'refresh' });
        
            const deltaYaw = Math.abs(yaw - baselinePoseRef.current.yaw);
            const deltaRoll = Math.abs(roll - baselinePoseRef.current.roll);

            // Hiển thị % tiến độ quay đầu
            const turnProgress = Math.min(100, Math.round((Math.max(deltaYaw, deltaRoll) / 20) * 100));
            setScore(turnProgress); 

            // Ngưỡng quay: 18 độ
            if (deltaYaw > 18 || deltaRoll > 18) {
                setTimeout(() => captureStep2(), 300);
            }
        }
      };

      const handleManualCapture = () => {
        if (processingRef.current) return;
        if (step === 1) captureStep1(); else captureStep2();
      };

      const captureStep1 = async () => {
          if (!cameraRef.current || processingRef.current) return;
          try {
              processingRef.current = true; 
              const photo = await cameraRef.current.takePictureAsync({ skipProcessing: true });
              step1PhotoRef.current = photo.uri;
          
              setStep(2); stableCountRef.current = 0;
              Animated.timing(progressAnim, { toValue: 0, duration: 0 }).start();
              stepTransitionRef.current = true; processingRef.current = false; 
              setTimeout(() => { stepTransitionRef.current = false; }, 1500); 
          } catch (e) { processingRef.current = false; }
      };

      const captureStep2 = async () => {
          if (stepTransitionRef.current || processingRef.current || !cameraRef.current) return;
          try {
              processingRef.current = true; setIsProcessing(true);
              setGuidance({ text: 'ĐANG KIỂM TRA...', color: '#9C27B0', icon: 'cloud-upload' });

              const photoStep2 = await cameraRef.current.takePictureAsync({ skipProcessing: true });
              const res = await AttendanceAPI.sendImageForRecognition(photoStep2.uri, {
                  recognition_type: 'check_in', validation_mode: 'challenge',
                  baseline_yaw: baselinePoseRef.current.yaw.toString(),
                  baseline_roll: baselinePoseRef.current.roll.toString()
              });

              if (!isMounted.current) return;
              if (res?.success) {
                  onCapture(step1PhotoRef.current || photoStep2.uri, res);
              } else {
                  setIsProcessing(false); processingRef.current = false;
                  Alert.alert("Chưa đạt", "Vui lòng quay đầu rõ ràng hơn.", [{ text: "Thử lại", onPress: () => resetFlow() }]);
              }
          } catch (e) { setIsProcessing(false); processingRef.current = false; resetFlow(); }
      };

      const toggleCamera = () => {
        setCameraType(cameraType === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back);
      };

      const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

      return (
        <View style={styles.container}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={cameraType}
            ratio="16:9"
            onCameraReady={() => setCameraReady(true)}
            onFacesDetected={cameraReady ? handleFacesDetected : undefined}
            faceDetectorSettings={faceDetectorSettings}
          >
            <SafeAreaView style={styles.safeArea}>
            
                {/* TOP ZONE */}
                <View style={styles.topContainer}>
                    <View style={styles.stepBox}>
                        <Text style={styles.stepText}>
                            {step === 1 ? 'BƯỚC 1: CĂN MẶT' : 'BƯỚC 2: QUAY ĐẦU'}
                        </Text>
                    </View>

                    <View style={[styles.msgBubble, { backgroundColor: guidance.color }]}>
                        <Ionicons name={guidance.icon} size={24} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={styles.msgText}>{guidance.text}</Text>
                        {stepTransitionRef.current && <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 10 }}/>}
                    </View>

                    {step === 1 && (
                        <View style={styles.progressWrapper}>
                            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                        </View>
                    )}
                </View>

                {/* BOTTOM ZONE */}
                <View style={styles.bottomControlBar}>
                
                    {/* TRÁI: ĐIỂM SỐ (Thay thế Server Status) */}
                    <View style={styles.leftInfoContainer}>
                        <View style={[styles.scoreCircle, { borderColor: score >= 80 ? '#4CAF50' : '#FF9800' }]}>
                             <Text style={[styles.scoreValue, { color: score >= 80 ? '#4CAF50' : '#FF9800' }]}>
                                {score}
                             </Text>
                        </View>
                        <Text style={styles.scoreLabel}>{step === 1 ? 'ĐIỂM CHUẨN' : 'TIẾN ĐỘ'}</Text>
                    </View>

                    {/* GIỮA: NÚT CHỤP */}
                    <View style={styles.centerControl}>
                        <TouchableOpacity 
                            style={styles.captureBtn} 
                            onPress={handleManualCapture}
                            disabled={isProcessing || stepTransitionRef.current}
                            activeOpacity={0.7}
                        >
                            <View style={styles.captureBtnInner} />
                        </TouchableOpacity>
                    </View>

                    {/* PHẢI: XOAY CAM */}
                    <TouchableOpacity style={styles.sideControl} onPress={toggleCamera}>
                        <Ionicons name="camera-reverse" size={32} color="#FFF" />
                        <Text style={styles.controlLabel}>Xoay</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {isProcessing && (
               <View style={styles.loadingOverlay}>
                 <ActivityIndicator size="large" color="#FFF" />
                 <Text style={styles.loadingText}>Đang xử lý...</Text>
               </View>
            )}
          </Camera>
        </View>
      );
    }

    const styles = StyleSheet.create({
      container: { flex: 1, backgroundColor: '#000' },
      camera: { flex: 1 },
      safeArea: { flex: 1, justifyContent: 'space-between' },

      topContainer: { alignItems: 'center', marginTop: STATUSBAR_HEIGHT + 10, zIndex: 20 },
  
      stepBox: {
          backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 5, paddingHorizontal: 15, 
          borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
      },
      stepText: { color: '#FFD700', fontSize: 13, fontWeight: '800' },

      msgBubble: {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, elevation: 5,
          minWidth: 260
      },
      msgText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

      progressWrapper: {
          width: 220, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', 
          borderRadius: 3, marginTop: 15, overflow: 'hidden'
      },
      progressBar: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },

      bottomControlBar: {
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
          paddingHorizontal: 25, paddingBottom: 40, width: '100%',
      },

      // LEFT: Score Display
      leftInfoContainer: { alignItems: 'center', justifyContent: 'center', width: 80, marginBottom: 10 },
      scoreCircle: { 
          width: 50, height: 50, borderRadius: 25, borderWidth: 3,
          alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
          marginBottom: 5
      },
      scoreValue: { fontSize: 20, fontWeight: 'bold' },
      scoreLabel: { color: '#CCC', fontSize: 10, fontWeight: '600' },

      centerControl: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
      captureBtn: {
          width: 76, height: 76, borderRadius: 38,
          backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 4, borderColor: '#FFF',
          justifyContent: 'center', alignItems: 'center',
      },
      captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },

      sideControl: { alignItems: 'center', justifyContent: 'center', width: 80, marginBottom: 15 },
      controlLabel: { color: '#FFF', fontSize: 11, marginTop: 4 },

      loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
      loadingText: { color: '#FFF', marginTop: 20, fontSize: 16 }
    });
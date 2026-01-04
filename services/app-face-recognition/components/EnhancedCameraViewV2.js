import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, Dimensions,
    ActivityIndicator, Animated, Alert, TouchableOpacity, SafeAreaView, Platform, StatusBar
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { Ionicons } from '@expo/vector-icons';
import AttendanceAPI from '../services/AttendanceAPI';
import AuthTokenManager from '../services/AuthTokenManager';
import FaceValidationHelper from '../utils/FaceValidationHelper';
import LoginScreen from './LoginScreen';
import RegisterFaceScreenVideo from './RegisterFaceScreenVideo';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 40 : StatusBar.currentHeight;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CẤU HÌNH KHUNG NHẬN DIỆN (FRAME) ---
// Làm khung bé lại để vừa mặt hơn (khoảng 65% chiều rộng màn hình)
const FRAME_WIDTH = SCREEN_WIDTH * 0.65;
const FRAME_HEIGHT = FRAME_WIDTH * 1.3; // Tỉ lệ dọc cho khuôn mặt

// Tọa độ tâm khung hình
const FRAME_CENTER_X = SCREEN_WIDTH / 2;
// Dịch khung lên trên một chút so với tâm màn hình cho tự nhiên (trừ đi phần header/statusbar)
const FRAME_CENTER_Y = (SCREEN_HEIGHT / 2) - 50; 

// Dung sai cho phép (Độ lệch tối đa)
const CENTER_TOLERANCE = 40; // Chỉ cho phép lệch tâm 40 đơn vị
const ANGLE_TOLERANCE = 8;   // Chỉ cho phép nghiêng/quay 8 độ (Rất gắt)

export default function EnhancedCameraViewV2({ onCapture }) {
    // --- STATE ---
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
    
    // Login/Register flow
    const [showRegister, setShowRegister] = useState(false);
    const [showLoginScreen, setShowLoginScreen] = useState(false);
    const [loggedUser, setLoggedUser] = useState(null);
  
    // Hướng dẫn người dùng
    const [guidance, setGuidance] = useState({ text: 'Đưa mặt vào khung', color: '#90A4AE', icon: 'scan' });

    // --- REFS ---
    const cameraRef = useRef(null);
    const processingRef = useRef(false); 
    const isMounted = useRef(true);

    // Cấu hình FaceDetector
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

    // Reset trạng thái
    const resetFlow = () => {
        setIsProcessing(false);
        processingRef.current = false;
        setGuidance({ text: 'Đưa mặt vào khung', color: '#90A4AE', icon: 'scan' });
    };

    // --- LOGIC KIỂM TRA NGHIÊM NGẶT ---
    const handleFacesDetected = ({ faces }) => {
        if (processingRef.current || !isMounted.current) return;

        // 1. Không thấy mặt
        if (!faces || faces.length === 0) {
            setGuidance({ text: 'Không thấy mặt', color: '#F44336', icon: 'alert-circle' });
            return;
        }
    
        const face = FaceValidationHelper.getLargestFace(faces);
        if (!face) return;

        const { origin, size } = face.bounds;
        const faceX = origin.x + size.width / 2;
        const faceY = origin.y + size.height / 2;

        // --- BƯỚC 1: KIỂM TRA CĂN GIỮA (CENTERING) ---
        // So sánh tâm mặt (faceX, faceY) với tâm khung ảo (FRAME_CENTER_X, FRAME_CENTER_Y)
        const diffX = faceX - FRAME_CENTER_X;
        const diffY = faceY - FRAME_CENTER_Y;

        // Check trục Ngang (X) - Lưu ý logic Mirror
        if (Math.abs(diffX) > CENTER_TOLERANCE) {
            // Nếu diffX > 0 (Mặt lệch phải so với khung) -> Cần sang Trái (Do mirror nên icon ngược lại logic thường)
            const msg = diffX > 0 ? 'SANG PHẢI ➡' : '⬅ SANG TRÁI'; 
            setGuidance({ text: msg, color: '#FF9800', icon: 'move' });
            return;
        }

        // Check trục Dọc (Y)
        if (Math.abs(diffY) > CENTER_TOLERANCE) {
            const msg = diffY > 0 ? 'LÊN TRÊN ⬆' : 'XUỐNG DƯỚI ⬇';
            setGuidance({ text: msg, color: '#FF9800', icon: 'move' });
            return;
        }

        // --- BƯỚC 2: KIỂM TRA KHOẢNG CÁCH (DISTANCE / FILL RATIO) ---
        // Mặt phải chiếm khoảng 60% - 85% chiều rộng của khung
        // size.width là chiều rộng khuôn mặt
        const faceRatio = size.width / FRAME_WIDTH;

        if (faceRatio < 0.6) {
            setGuidance({ text: 'LẠI GẦN HƠN 🔍', color: '#FF9800', icon: 'resize' });
            return;
        }
        if (faceRatio > 0.95) {
            setGuidance({ text: 'RA XA CHÚT 🤏', color: '#FF9800', icon: 'resize' });
            return;
        }

        // --- BƯỚC 3: KIỂM TRA GÓC NGHIÊNG (POSE) ---
        const yaw = face.yawAngle || 0;   // Quay trái/phải
        const roll = face.rollAngle || 0; // Nghiêng đầu vai
        // Lưu ý: pitchAngle (ngửa/cúi) không phải máy nào cũng hỗ trợ tốt, nhưng nếu có thì check luôn
        // const pitch = face.pitchAngle || 0; 

        // Check Nghiêng đầu (Roll) - Đây là cái bạn bảo "phải nghiêng mới được"
        // Giờ ta bắt buộc nó phải thẳng (gần 0)
        if (Math.abs(roll) > ANGLE_TOLERANCE) {
            setGuidance({ text: 'GIỮ ĐẦU THẲNG 😐', color: '#FF9800', icon: 'refresh' });
            return;
        }

        // Check Quay mặt (Yaw)
        if (Math.abs(yaw) > ANGLE_TOLERANCE) {
            const msg = yaw > 0 ? 'QUAY MẶT SANG TRÁI' : 'QUAY MẶT SANG PHẢI';
            setGuidance({ text: msg, color: '#FF9800', icon: 'eye' });
            return;
        }

        // --- BƯỚC 4: HỢP LỆ HOÀN TOÀN -> CHỤP ---
        executeCapture();
    };

    const executeCapture = async () => {
        if (!cameraRef.current || processingRef.current) return;
        try {
            processingRef.current = true;
            setIsProcessing(true);
            setGuidance({ text: 'ĐANG NHẬN DIỆN...', color: '#2196F3', icon: 'cloud-upload' });
            
            const photo = await cameraRef.current.takePictureAsync({ skipProcessing: true });
            
            console.log("📸 [Camera] Capture triggered...");
            const apiResult = await AttendanceAPI.sendImageForRecognition(photo.uri, {
                recognition_type: 'check_in',
                validation_mode: 'strict' 
            });

            if (!isMounted.current) return;
            onCapture(photo.uri, apiResult);

        } catch (e) {
            console.log("Capture Error:", e);
            Alert.alert("Lỗi", "Không thể kết nối tới server.");
            resetFlow();
        }
    };

    const handleManualCapture = () => {
        if (processingRef.current) return;
        executeCapture();
    };

    const toggleCamera = () => {
        setCameraType(cameraType === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back);
    };

    const openRegisterFlow = async () => {
        // Always show login screen (no token check)
        console.log('🔐 [Camera] Opening login screen for registration');
        setShowLoginScreen(true);
    };
    
    const handleLogin = (user) => { setLoggedUser(user); setShowLoginScreen(false); setShowRegister(true); };
    const closeRegister = () => { setShowRegister(false); setLoggedUser(null); setShowLoginScreen(false); resetFlow(); };

    // --- RENDER ---
    if (showLoginScreen) {
        return (
            <SafeAreaView style={styles.modalContainer}>
                <LoginScreen onLogin={handleLogin} onCancel={() => setShowLoginScreen(false)} />
            </SafeAreaView>
        );
    }

    if (showRegister) {
        return (
            <SafeAreaView style={styles.modalContainer}>
                <RegisterFaceScreenVideo user={loggedUser} onCancel={closeRegister} />
            </SafeAreaView>
        );
    }

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

                    {/* --- KHUNG CĂN GIỮA (TARGET FRAME) --- */}
                    {/* Đây là khung hướng dẫn trực quan, kích thước cố định */}
                    <View style={[styles.targetFrameContainer, { top: FRAME_CENTER_Y - (FRAME_HEIGHT / 2) }]} pointerEvents="none">
                        <View style={[styles.targetFrame, 
                            { 
                                width: FRAME_WIDTH, 
                                height: FRAME_HEIGHT,
                                borderColor: guidance.color === '#4CAF50' ? '#4CAF50' : 'rgba(255,255,255,0.8)' 
                            }
                        ]}>
                            {/* 4 góc trang trí */}
                            <View style={[styles.corner, styles.tl]} />
                            <View style={[styles.corner, styles.tr]} />
                            <View style={[styles.corner, styles.bl]} />
                            <View style={[styles.corner, styles.br]} />
                        </View>
                    </View>

                    {/* TOP ZONE */}
                    <View style={styles.topContainer}>
                        <View style={[styles.msgBubble, { backgroundColor: guidance.color }]}>
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                            ) : (
                                <Ionicons name={guidance.icon} size={24} color="#FFF" style={{ marginRight: 10 }} />
                            )}
                            <Text style={styles.msgText}>{guidance.text}</Text>
                        </View>
                    </View>

                    {/* BOTTOM ZONE */}
                    <View style={styles.bottomControlBar}>
                        <View style={styles.leftInfoContainer}>
                            <TouchableOpacity style={styles.registerBtn} onPress={openRegisterFlow}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="person-add" size={24} color="#FFF" />
                                </View>
                                <Text style={styles.controlLabel}>Đăng ký</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.centerControl}>
                            <TouchableOpacity 
                                style={styles.captureBtn} 
                                onPress={handleManualCapture}
                                disabled={isProcessing}
                                activeOpacity={0.7}
                            >
                                <View style={styles.captureBtnInner} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rightControl}>
                            <TouchableOpacity style={styles.sideControl} onPress={toggleCamera}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="camera-reverse" size={28} color="#FFF" />
                                </View>
                                <Text style={styles.controlLabel}>Xoay</Text>
                            </TouchableOpacity>
                        </View>
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
    modalContainer: { flex: 1, backgroundColor: '#000' },
    safeArea: { flex: 1, justifyContent: 'space-between' },

    // Target Frame Styles
    targetFrameContainer: {
        position: 'absolute',
        left: 0, right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    targetFrame: {
        borderWidth: 2,
        borderRadius: 30, // Bo tròn nhiều hơn giống khuôn mặt
        backgroundColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 40, height: 40,
        borderColor: '#FFF',
        borderWidth: 5
    },
    tl: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 30 },
    tr: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 30 },
    bl: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 30 },
    br: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 30 },

    topContainer: { alignItems: 'center', marginTop: STATUSBAR_HEIGHT + 60, zIndex: 20 },
  
    msgBubble: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30, elevation: 5,
        minWidth: 260,
        backgroundColor: 'rgba(0,0,0,0.7)'
    },
    msgText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

    bottomControlBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        paddingHorizontal: 30, paddingBottom: 40, width: '100%', zIndex: 20
    },

    leftInfoContainer: { alignItems: 'center', justifyContent: 'center', width: 80, marginBottom: 10 },
    registerBtn: { alignItems: 'center' },
    rightControl: { alignItems: 'center', justifyContent: 'center', width: 80, marginBottom: 10 },
    sideControl: { alignItems: 'center' },

    iconCircle: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
    },
    controlLabel: { color: '#FFF', fontSize: 11, fontWeight: '600' },

    centerControl: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    captureBtn: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 4, borderColor: '#FFF',
        justifyContent: 'center', alignItems: 'center',
    },
    captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' },

    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    loadingText: { color: '#FFF', marginTop: 20, fontSize: 16 }
});
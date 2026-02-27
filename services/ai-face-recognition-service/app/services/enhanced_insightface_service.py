"""
Enhanced InsightFace Recognition Service
=========================================
Tính năng:
- Training với 1 ảnh (Low-shot learning với threshold thấp)
- Chống giả mạo (Anti-spoofing với MiniFASNet)
- Kiểm soát tư thế/phụ kiện nghiêm ngặt (Pose/Accessories check)
- Thông báo lỗi chi tiết (Detailed error messages)
"""

import cv2
import numpy as np
import os
import math
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


class EnhancedInsightFaceService:
    """
    Enhanced Face Recognition Service với kiểm soát chất lượng nghiêm ngặt
    và khả năng training với ít dữ liệu (1 ảnh)
    """
    
    def __init__(self):
        self.app = None
        self.anti_spoof_sess = None
        
        # --- CẤU HÌNH NGHIÊM NGẶT (STRICT CONFIG) ---
        # Load tunable thresholds from central config
        try:
            from app.config.rate_config import (
                BLUR_THRESHOLD,
                BRIGHTNESS_MIN,
                BRIGHTNESS_MAX,
                MAX_YAW,
                MAX_PITCH,
                MAX_ROLL,
                LIVENESS_THRESHOLD,
                FACE_SIZE_THRESHOLD_PX,
            )
            self.BLUR_THRESHOLD = float(BLUR_THRESHOLD)
            self.DARK_THRESHOLD = int(BRIGHTNESS_MIN)
            self.BRIGHT_THRESHOLD = int(BRIGHTNESS_MAX)
            self.POSE_THRESHOLD = float(MAX_YAW)
            self.FACE_SIZE_THRESHOLD = int(FACE_SIZE_THRESHOLD_PX)
            self.LIVENESS_THRESHOLD = float(LIVENESS_THRESHOLD)
        except ImportError as e:
            logger.warning(f"⚠️ Could not import rate_config, using defaults: {e}")
            self.BLUR_THRESHOLD = 8.0
            self.DARK_THRESHOLD = 35
            self.BRIGHT_THRESHOLD = 230
            self.POSE_THRESHOLD = 35.0
            self.FACE_SIZE_THRESHOLD = 80
            self.LIVENESS_THRESHOLD = 0.50
        
        # Ngưỡng nhận diện (Thấp hơn cho 1-shot learning)
        self.MIN_THRESHOLD = 0.35       # Ngưỡng sàn thấp nhất chấp nhận được
        self.SAFE_THRESHOLD = 0.55      # Ngưỡng an toàn tuyệt đối
        
        # Paths
        self.USER_HOME = os.path.expanduser("~")
        self.MODELS_ROOT = os.path.join(self.USER_HOME, ".insightface", "models")
        self.ANTI_SPOOF_PATH = os.path.join(
            self.MODELS_ROOT, 
            "anti_spoofing", 
            "2.7_80x80_MiniFASNetV2.onnx"
        )
        
    def initialize_models(self):
        """
        Khởi tạo bằng cách tham chiếu tới các singleton đã có.
        Phải gọi SAU KHI face_recognizer.initialize() đã chạy xong.
        """
        logger.info("⏳ [AI] Linking Enhanced service to shared singletons...")
        try:
            # Re-use existing FaceRecognizer.app instance
            from app.services.face_recognition_service import face_recognizer
            self.app = face_recognizer.app
            
            if self.app is None:
                logger.warning("⚠️ [AI] FaceRecognizer.app is None — will try lazy init on first request")
            else:
                logger.info("✅ [AI] Enhanced service linked to shared FaceAnalysis instance")
                
        except Exception as e:
            logger.error(f"❌ [AI] Enhanced Init Error: {e}")

    # ========================================================================
    # KIỂM TRA CHẤT LƯỢNG ẢNH (QUALITY CHECKS)
    # ========================================================================
    
    def _check_quality(self, img: np.ndarray) -> Tuple[bool, str]:
        """
        Kiểm tra chất lượng ảnh toàn diện
        Returns: (passed, message)
        """
        # 1. Kiểm tra độ nét (Blur Detection)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if blur_score < self.BLUR_THRESHOLD:
            logger.warning(f"❌ Blur score: {blur_score:.2f} < {self.BLUR_THRESHOLD}")
            return False, "Ảnh bị mờ/rung. Vui lòng giữ yên điện thoại."

        # 2. Kiểm tra ánh sáng (Lighting Check)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        brightness = np.mean(hsv[:, :, 2])
        
        if brightness < self.DARK_THRESHOLD:
            logger.warning(f"❌ Too dark: {brightness:.2f} < {self.DARK_THRESHOLD}")
            return False, "Môi trường quá tối. Hãy bật đèn hoặc ra chỗ sáng."
            
        if brightness > self.BRIGHT_THRESHOLD:
            logger.warning(f"❌ Too bright: {brightness:.2f} > {self.BRIGHT_THRESHOLD}")
            return False, "Ánh sáng quá chói/ngược sáng. Hãy điều chỉnh góc đứng."
        
        # 3. Kiểm tra glare (phản quang)
        if self._check_glare(img):
            return False, "Phát hiện phản quang mạnh. Vui lòng tránh ánh sáng trực tiếp."
            
        logger.info(f"✅ Quality OK - Blur: {blur_score:.2f}, Brightness: {brightness:.2f}")
        return True, "OK"
    
    def _check_glare(self, img: np.ndarray) -> bool:
        """Kiểm tra phản quang (glare) trên khuôn mặt"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        glare_pixels = np.sum(gray > 240)
        total_pixels = gray.shape[0] * gray.shape[1]
        glare_ratio = glare_pixels / total_pixels
        return glare_ratio > 0.10

    # ========================================================================
    # KIỂM TRA TƯ THẾ (POSE ESTIMATION)
    # ========================================================================
    
    def _check_pose(self, kps: np.ndarray) -> Tuple[bool, str]:
        """
        Tính góc Euler từ 5 điểm landmarks và kiểm tra tư thế
        kps: [LeftEye, RightEye, Nose, LeftMouth, RightMouth]
        Returns: (passed, message)
        """
        try:
            le, re, nose, lm, rm = kps
            
            # --- YAW (Quay trái/phải) ---
            dist_left = math.dist(nose, le)
            dist_right = math.dist(nose, re)
            total_eye_dist = dist_left + dist_right
            
            if total_eye_dist == 0:
                return False, "Không xác định được vị trí mắt."
            
            yaw_ratio = dist_left / total_eye_dist
            yaw_deg = (yaw_ratio - 0.5) * 100
            
            if abs(yaw_deg) > self.POSE_THRESHOLD:
                direction = "phải" if yaw_deg > 0 else "trái"
                logger.warning(f"❌ Yaw: {yaw_deg:.1f}° (quay {direction})")
                return False, f"Bạn đang quay mặt sang {direction} ({int(abs(yaw_deg))}°). Vui lòng NHÌN THẲNG vào camera."

            # --- PITCH (Ngước/Cúi) ---
            eye_mid = ((le[0] + re[0]) / 2, (le[1] + re[1]) / 2)
            mouth_mid = ((lm[0] + rm[0]) / 2, (lm[1] + rm[1]) / 2)
            total_face_h = math.dist(eye_mid, mouth_mid)
            nose_to_eye = math.dist(nose, eye_mid)
            
            if total_face_h == 0:
                return False, "Khuôn mặt bất thường."
            
            pitch_ratio = nose_to_eye / total_face_h
            
            pitch_deg = 0
            if pitch_ratio < 0.30:
                pitch_deg = -20  # Ngước
            if pitch_ratio > 0.55:
                pitch_deg = 20   # Cúi
            
            if abs(pitch_deg) > self.POSE_THRESHOLD:
                direction = "lên" if pitch_deg < 0 else "xuống"
                logger.warning(f"❌ Pitch: {pitch_deg:.1f}° (cúi/ngước {direction})")
                return False, f"Bạn đang cúi/ngước {direction}. Vui lòng NHÌN THẲNG vào camera."

            # --- ROLL (Nghiêng tả/phải) ---
            eye_angle = math.degrees(math.atan2(re[1] - le[1], re[0] - le[0]))
            
            if abs(eye_angle) > self.POSE_THRESHOLD:
                direction = "trái" if eye_angle > 0 else "phải"
                logger.warning(f"❌ Roll: {eye_angle:.1f}° (nghiêng {direction})")
                return False, f"Bạn đang nghiêng đầu sang {direction}. Vui lòng giữ đầu thẳng."

            logger.info(f"✅ Pose OK - Yaw: {yaw_deg:.1f}°, Pitch: {pitch_deg:.1f}°, Roll: {eye_angle:.1f}°")
            return True, "OK"
            
        except Exception as e:
            logger.error(f"Error in pose check: {e}")
            return False, "Lỗi kiểm tra tư thế."

    # ========================================================================
    # KIỂM TRA PHỤ KIỆN (ACCESSORIES CHECK)
    # ========================================================================
    
    def _check_accessories(self, img: np.ndarray, kps: np.ndarray) -> Tuple[bool, str]:
        """
        Kiểm tra kính râm hoặc khẩu trang dựa trên màu sắc vùng đặc trưng
        Returns: (passed, message)
        """
        try:
            le, re = kps[0], kps[1]
            
            x_left, y_left = int(le[0]), int(le[1])
            eye_roi_left = img[
                max(0, y_left - 10):y_left + 10,
                max(0, x_left - 10):x_left + 10
            ]
            
            x_right, y_right = int(re[0]), int(re[1])
            eye_roi_right = img[
                max(0, y_right - 10):y_right + 10,
                max(0, x_right - 10):x_right + 10
            ]
            
            if eye_roi_left.size > 0 and eye_roi_right.size > 0:
                avg_left = np.mean(eye_roi_left)
                avg_right = np.mean(eye_roi_right)
                
                if avg_left < 30 and avg_right < 30:
                    logger.warning(f"❌ Sunglasses detected - Eye brightness: L={avg_left:.1f}, R={avg_right:.1f}")
                    return False, "Phát hiện đeo kính râm. Vui lòng tháo kính."
            
            nose, lm, rm = kps[2], kps[3], kps[4]
            mouth_center = ((lm[0] + rm[0]) / 2, (lm[1] + rm[1]) / 2)
            
            x_mouth, y_mouth = int(mouth_center[0]), int(mouth_center[1])
            mouth_roi = img[
                max(0, y_mouth - 15):y_mouth + 15,
                max(0, x_mouth - 20):x_mouth + 20
            ]
            
            if mouth_roi.size > 0:
                gray_mouth = cv2.cvtColor(mouth_roi, cv2.COLOR_BGR2GRAY)
                variance = np.var(gray_mouth)
                
                if variance < 50:
                    logger.warning(f"❌ Possible mask detected - Mouth variance: {variance:.1f}")
                    return False, "Nghi vấn đeo khẩu trang. Vui lòng bỏ khẩu trang."
            
            logger.info("✅ No accessories detected")
            return True, "OK"
            
        except Exception as e:
            logger.error(f"Error in accessories check: {e}")
            return True, "OK"

    # ========================================================================
    # CHỐNG GIẢ MẠO (ANTI-SPOOFING)
    # ========================================================================
    
    def _check_liveness(self, img: np.ndarray, bbox: List[float]) -> Tuple[bool, str]:
        """
        Kiểm tra liveness bằng centralized FaceLivenessDetector
        Returns: (passed, message)
        """
        try:
            from app.services.face_liveness_service import face_liveness_detector
            
            if not face_liveness_detector.is_available():
                logger.warning("⚠️ FaceLivenessDetector models not loaded - skipping")
                return True, "Pass (No Model)"

            result = face_liveness_detector.check_liveness(img, bbox)
            
            if not result.is_real:
                return False, result.message
            
            return True, "OK"
            
        except Exception as e:
            logger.error(f"Error in liveness transition: {e}")
            return True, "Pass (Error)"

    # ========================================================================
    # ENSURE APP IS READY (lazy fallback)
    # ========================================================================
    def _ensure_app(self):
        """Tự động link lại nếu app chưa sẵn sàng"""
        if self.app is None:
            try:
                from app.services.face_recognition_service import face_recognizer
                if face_recognizer.app is None:
                    face_recognizer.initialize()
                self.app = face_recognizer.app
            except Exception as e:
                logger.error(f"❌ Cannot lazy-init app: {e}")

    # ========================================================================
    # MAIN PROCESSING PIPELINE
    # ========================================================================
    
    def process_image(
        self, 
        image_bytes: bytes, 
        validation_mode: str = 'strict'
    ) -> Dict:
        """
        Pipeline xử lý ảnh chính với tất cả validation
        """
        try:
            # Ensure models are loaded
            self._ensure_app()
            if self.app is None:
                return {"success": False, "message": "Hệ thống AI chưa sẵn sàng. Vui lòng thử lại sau.", "error_code": "AI_NOT_READY"}

            # 1. Decode ảnh
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {"success": False, "message": "File ảnh lỗi hoặc không đúng định dạng."}

            # 2. Kiểm tra chất lượng ảnh (Quality)
            ok, msg = self._check_quality(img)
            if not ok:
                return {"success": False, "message": msg, "error_code": "POOR_QUALITY"}

            # 3. Detect Face bằng InsightFace
            faces = self.app.get(img)
            
            if len(faces) == 0:
                return {
                    "success": False, 
                    "message": "Không tìm thấy khuôn mặt. Vui lòng đưa mặt vào camera.",
                    "error_code": "NO_FACE"
                }
            
            # Lấy khuôn mặt to nhất (nếu có nhiều người)
            main_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            
            # 4. Kiểm tra kích thước khuôn mặt
            w_face = main_face.bbox[2] - main_face.bbox[0]
            if w_face < self.FACE_SIZE_THRESHOLD:
                return {
                    "success": False,
                    "message": "Khuôn mặt quá xa camera. Vui lòng đến gần hơn.",
                    "error_code": "FACE_TOO_SMALL"
                }

            # 5. Kiểm tra góc mặt (Pose) - QUAN TRỌNG
            ok, msg = self._check_pose(main_face.kps)
            if not ok:
                return {"success": False, "message": msg, "error_code": "BAD_POSE"}

            # 6. Kiểm tra phụ kiện (Kính/Khẩu trang)
            ok, msg = self._check_accessories(img, main_face.kps)
            if not ok:
                return {"success": False, "message": msg, "error_code": "ACCESSORIES"}

            # 7. Kiểm tra Liveness (Chống giả mạo)
            if validation_mode == 'strict':
                ok, msg = self._check_liveness(img, main_face.bbox)
                if not ok:
                    return {"success": False, "message": msg, "error_code": "LIVENESS_FAILED"}

            # 8. Trích xuất embedding và normalize
            embedding = main_face.embedding
            norm_embedding = embedding / np.linalg.norm(embedding)

            logger.info("✅ All checks passed - Embedding extracted successfully")
            
            return {
                "success": True,
                "embedding": norm_embedding.tolist(),
                "bbox": main_face.bbox.tolist(),
                "gender": main_face.sex if hasattr(main_face, 'sex') else None,
                "age": int(main_face.age) if hasattr(main_face, 'age') else None
            }
            
        except Exception as e:
            logger.error(f"❌ Error in process_image: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi xử lý ảnh: {str(e)}",
                "error_code": "INTERNAL_ERROR"
            }

    def compare_faces(
        self, 
        emb1: np.ndarray, 
        emb2: np.ndarray
    ) -> float:
        """
        So sánh 2 embedding sử dụng cosine similarity
        """
        return float(np.dot(emb1, emb2))


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================
enhanced_face_service = EnhancedInsightFaceService()

__all__ = ['EnhancedInsightFaceService', 'enhanced_face_service']

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
import insightface
from insightface.app import FaceAnalysis
import onnxruntime
import os
import math
import logging
from typing import Dict, List, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity

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
        from app.config.rate_config import (
            BLUR_THRESHOLD,
            BRIGHTNESS_MIN,
            BRIGHTNESS_MAX,
            MAX_YAW,
            MAX_PITCH,
            MAX_ROLL,
            LIVENESS_THRESHOLD,
            FACE_SIZE_THRESHOLD_PX
        )

        self.BLUR_THRESHOLD = float(BLUR_THRESHOLD)
        self.DARK_THRESHOLD = int(BRIGHTNESS_MIN)
        self.BRIGHT_THRESHOLD = int(BRIGHTNESS_MAX)
        # For pose checks we use per-axis limits from config
        self.POSE_THRESHOLD = float(MAX_YAW)
        self.FACE_SIZE_THRESHOLD = int(FACE_SIZE_THRESHOLD_PX)
        self.LIVENESS_THRESHOLD = float(LIVENESS_THRESHOLD)
        
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
        """Khởi tạo các model AI"""
        logger.info("⏳ [AI] Loading Enhanced Models...")
        try:
            # 1. InsightFace (Buffalo_L - Model tốt nhất)
            self.app = FaceAnalysis(
                name='buffalo_l', 
                root=self.USER_HOME + '/.insightface'
            )
            # Force CPU execution (ctx_id=-1)
            self.app.prepare(ctx_id=-1, det_size=(640, 640))
            logger.info("✅ [AI] InsightFace Model Loaded (buffalo_l)")
            
            # 2. MiniFASNet (Anti-Spoofing)
            # Accept multiple possible locations: anti_spoofing subfolder or directly under ~/.insightface/models
            anti_spoof_candidates = [
                self.ANTI_SPOOF_PATH,
                os.path.join(self.MODELS_ROOT, "2.7_80x80_MiniFASNetV2.onnx")
            ]

            model_found = None
            for p in anti_spoof_candidates:
                if os.path.exists(p):
                    model_found = p
                    break

            if model_found:
                # Use CPU-only ONNX provider to avoid GPU/CUDA usage
                self.anti_spoof_sess = onnxruntime.InferenceSession(
                    model_found,
                    providers=['CPUExecutionProvider']
                )
                logger.info(f"✅ [AI] Anti-Spoofing Model Loaded (MiniFASNet) from {model_found}")
            else:
                logger.warning(f"⚠️ [AI] Missing Anti-Spoofing Model at {self.ANTI_SPOOF_PATH} and {os.path.join(self.MODELS_ROOT, '2.7_80x80_MiniFASNetV2.onnx')}")
                logger.warning("⚠️ [AI] Chạy lệnh: pip install onnxruntime-gpu scikit-learn")
                self.anti_spoof_sess = None
                
        except Exception as e:
            logger.error(f"❌ [AI] Init Error: {e}")
            raise e

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
        # Tìm vùng quá sáng (> 240)
        glare_pixels = np.sum(gray > 240)
        total_pixels = gray.shape[0] * gray.shape[1]
        glare_ratio = glare_pixels / total_pixels
        
        # Nếu > 10% ảnh quá sáng => có glare
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
            
            # Tỉ lệ lệch tâm (0.5 là chính giữa)
            yaw_ratio = dist_left / total_eye_dist
            # Quy đổi ra độ (Heuristic): 0.5 -> 0 độ
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
            # Bình thường mũi nằm khoảng 0.35 - 0.45 chiều dài từ mắt đến miệng
            
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
            # Tính góc nghiêng dựa vào đường nối 2 mắt
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
            # 1. Kiểm tra kính râm - Vùng mắt có màu đen tuyền không
            le, re = kps[0], kps[1]
            
            # Kiểm tra vùng quanh mắt trái
            x_left, y_left = int(le[0]), int(le[1])
            eye_roi_left = img[
                max(0, y_left - 10):y_left + 10,
                max(0, x_left - 10):x_left + 10
            ]
            
            # Kiểm tra vùng quanh mắt phải
            x_right, y_right = int(re[0]), int(re[1])
            eye_roi_right = img[
                max(0, y_right - 10):y_right + 10,
                max(0, x_right - 10):x_right + 10
            ]
            
            # Nếu cả 2 vùng mắt đều rất tối => Kính râm
            if eye_roi_left.size > 0 and eye_roi_right.size > 0:
                avg_left = np.mean(eye_roi_left)
                avg_right = np.mean(eye_roi_right)
                
                if avg_left < 30 and avg_right < 30:
                    logger.warning(f"❌ Sunglasses detected - Eye brightness: L={avg_left:.1f}, R={avg_right:.1f}")
                    return False, "Phát hiện đeo kính râm. Vui lòng tháo kính."
            
            # 2. Kiểm tra khẩu trang - Vùng mũi/miệng
            # (InsightFace thường detect kém nếu đeo khẩu trang)
            # Nếu detect được nhưng vùng miệng bị che => warning
            nose, lm, rm = kps[2], kps[3], kps[4]
            mouth_center = ((lm[0] + rm[0]) / 2, (lm[1] + rm[1]) / 2)
            
            x_mouth, y_mouth = int(mouth_center[0]), int(mouth_center[1])
            mouth_roi = img[
                max(0, y_mouth - 15):y_mouth + 15,
                max(0, x_mouth - 20):x_mouth + 20
            ]
            
            if mouth_roi.size > 0:
                # Nếu vùng miệng quá đồng nhất (variance thấp) => Có thể đeo khẩu trang
                gray_mouth = cv2.cvtColor(mouth_roi, cv2.COLOR_BGR2GRAY)
                variance = np.var(gray_mouth)
                
                if variance < 50:  # Quá đồng nhất
                    logger.warning(f"❌ Possible mask detected - Mouth variance: {variance:.1f}")
                    return False, "Nghi vấn đeo khẩu trang. Vui lòng bỏ khẩu trang."
            
            logger.info("✅ No accessories detected")
            return True, "OK"
            
        except Exception as e:
            logger.error(f"Error in accessories check: {e}")
            # Không block nếu có lỗi
            return True, "OK"

    # ========================================================================
    # CHỐNG GIẢ MẠO (ANTI-SPOOFING)
    # ========================================================================
    
    def _check_liveness(self, img: np.ndarray, bbox: List[float]) -> Tuple[bool, str]:
        """
        Kiểm tra liveness bằng MiniFASNet
        Returns: (passed, message)
        """
        if self.anti_spoof_sess is None:
            logger.warning("⚠️ Anti-spoofing model not loaded - skipping liveness check")
            return True, "Pass (No Model)"

        try:
            # Crop face với scale 2.7 (theo MiniFASNet requirement)
            x1, y1, x2, y2 = map(int, bbox)
            w, h = x2 - x1, y2 - y1
            scale = 2.7
            cx, cy = x1 + w / 2, y1 + h / 2
            nw, nh = w * scale, h * scale
            nx1, ny1 = int(cx - nw / 2), int(cy - nh / 2)
            nx2, ny2 = int(cx + nw / 2), int(cy + nh / 2)
            
            h_img, w_img, _ = img.shape
            nx1, ny1 = max(0, nx1), max(0, ny1)
            nx2, ny2 = min(w_img, nx2), min(h_img, ny2)
            
            crop = img[ny1:ny2, nx1:nx2]
            if crop.size == 0:
                return False, "Lỗi cắt ảnh."

            # Resize và chuẩn hóa
            blob = cv2.resize(crop, (80, 80))
            blob = cv2.cvtColor(blob, cv2.COLOR_BGR2RGB)  # MiniFASNet cần RGB
            blob = np.transpose(blob, (2, 0, 1)).astype(np.float32)
            blob = np.expand_dims(blob, axis=0)
            
            # Inference
            input_name = self.anti_spoof_sess.get_inputs()[0].name
            outs = self.anti_spoof_sess.run(None, {input_name: blob})
            
            # Softmax
            logits = outs[0][0]
            probs = np.exp(logits) / np.sum(np.exp(logits))
            real_score = probs[1] if len(probs) > 1 else probs[0]
            
            logger.info(f"🔍 Liveness score: {real_score:.4f} (threshold: {self.LIVENESS_THRESHOLD})")
            
            if real_score < self.LIVENESS_THRESHOLD:
                logger.warning(f"❌ Liveness failed - Score: {real_score:.4f}")
                return False, f"Nghi vấn giả mạo/Camera qua màn hình (Độ tin cậy: {real_score:.2%})."
            
            logger.info("✅ Liveness check passed")
            return True, "OK"
            
        except Exception as e:
            logger.error(f"Error in liveness check: {e}")
            # Trong môi trường dev, cho pass nếu có lỗi
            return True, "Pass (Error)"

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
        
        Args:
            image_bytes: Binary image data
            validation_mode: 'strict' (full checks) or 'normal' (skip some checks)
            
        Returns:
            Dict with success, message, embedding, bbox, gender, age
        """
        try:
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
                "gender": main_face.sex,
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
        
        Args:
            emb1: Embedding vector 1
            emb2: Embedding vector 2
            
        Returns:
            Similarity score (0-1)
        """
        return float(np.dot(emb1, emb2))


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================
enhanced_face_service = EnhancedInsightFaceService()

__all__ = ['EnhancedInsightFaceService', 'enhanced_face_service']

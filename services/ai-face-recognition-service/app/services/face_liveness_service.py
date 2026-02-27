"""
Face Liveness Detection Service (Ensemble Multi-Model)
Tích hợp MiniFASNetV1SE (Crop 4.0) và MiniFASNetV2 (Crop 2.7)

Luồng xử lý mới:
1. Resize 112x112, (image - 127.5) / 128.0, NCHW (1, 3, 112, 112).
2. Hiệu chuẩn: V1SE (0-0.1 -> 0-1), V2 (0.3-0.98 -> 0-1)
3. Veto: v1_raw < 0.01 -> FAKE
4. Ensemble: 70% V2_calib + 30% V1SE_calib
"""

import cv2
import numpy as np
import logging
import onnxruntime as ort
from typing import Optional, Tuple
from dataclasses import dataclass
import os
from app.services.face_quality_service import face_quality_checker

logger = logging.getLogger(__name__)


@dataclass
class LivenessResult:
    """Kết quả kiểm tra liveness"""
    is_real: bool
    confidence: float
    label: str
    message: str


class FaceLivenessDetector:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceLivenessDetector, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.v1_session = None
            self.v2_session = None
            self.input_size = (112, 112) # Đổi thành 112x112 theo yêu cầu model
            self._load_models()

    def _load_models(self):
        user_home = os.path.expanduser("~")
        
        # Đường dẫn V1SE
        paths_v1 = [
            os.path.join(user_home, ".insightface", "models", "MiniFASNetV1SE.onnx"),
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "MiniFASNetV1SE.onnx"),
            os.path.join(user_home, ".insightface", "models", "4_0_0_80x80_MiniFASNetV1SE.onnx"),
            "models/MiniFASNetV1SE.onnx",
            "models/anti_spoofing/MiniFASNetV1SE.onnx",
            "/app/models/MiniFASNetV1SE.onnx",
            "/app/models/anti_spoofing/MiniFASNetV1SE.onnx",
            "/root/.insightface/models/MiniFASNetV1SE.onnx",
        ]
        
        # Đường dẫn V2
        paths_v2 = [
            os.path.join(user_home, ".insightface", "models", "2.7_80x80_MiniFASNetV2.onnx"),
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
            os.path.join(user_home, ".insightface", "models", "MiniFASNetV2.onnx"),
            "models/2.7_80x80_MiniFASNetV2.onnx",
            "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
            "/app/models/2.7_80x80_MiniFASNetV2.onnx",
            "/app/models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
            "/root/.insightface/models/2.7_80x80_MiniFASNetV2.onnx",
        ]

        def get_path(candidates):
            for p in candidates:
                if os.path.exists(p): return p
            return None

        v1_path = get_path(paths_v1)
        v2_path = get_path(paths_v2)

        if v1_path:
            try:
                self.v1_session = ort.InferenceSession(v1_path, providers=['CPUExecutionProvider'])
                logger.info(f"✅ Loaded V1SE: {v1_path}")
            except Exception as e:
                logger.error(f"Failed V1SE: {e}")
        else:
            logger.error(f"❌ V1SE Model NOT FOUND! Searched in: {paths_v1}")

        if v2_path:
            try:
                self.v2_session = ort.InferenceSession(v2_path, providers=['CPUExecutionProvider'])
                logger.info(f"✅ Loaded V2: {v2_path}")
            except Exception as e:
                logger.error(f"Failed V2: {e}")
        else:
            logger.error(f"❌ V2 Model NOT FOUND! Searched in: {paths_v2}")

    # ------------------------------------------------------------------
    # UTILS
    # ------------------------------------------------------------------
    @staticmethod
    def _crop_face(image: np.ndarray, bbox: Optional[list], scale: float) -> Optional[np.ndarray]:
        if bbox is not None:
            x1, y1, x2, y2 = list(map(int, bbox))
            w, h = x2 - x1, y2 - y1
            cx, cy = x1 + w // 2, y1 + h // 2
        else:
            ih, iw = image.shape[:2]
            cx, cy = iw // 2, ih // 2
            w, h = iw, ih

        new_w, new_h = int(w * scale), int(h * scale)
        nx1, ny1 = int(cx - new_w // 2), int(cy - new_h // 2)
        nx2, ny2 = nx1 + new_w, ny1 + new_h

        cx1, cy1 = max(0, nx1), max(0, ny1)
        cx2, cy2 = min(image.shape[1], nx2), min(image.shape[0], ny2)
        crop = image[cy1:cy2, cx1:cx2].copy()

        pad_left, pad_top = max(0, -nx1), max(0, -ny1)
        pad_right, pad_bottom = max(0, nx2 - image.shape[1]), max(0, ny2 - image.shape[0])
        if any([pad_left, pad_top, pad_right, pad_bottom]):
            crop = cv2.copyMakeBorder(crop, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_REPLICATE)

        return crop if crop is not None and crop.size > 0 else None

    # ------------------------------------------------------------------
    # INFERENCE
    # ------------------------------------------------------------------
    def _infer_model(self, session, face_crop: np.ndarray) -> float:
        """
        Tiền xử lý mới:
        - Resize 112x112
        - (image - 127.5) / 128.0
        - NCHW (1, 3, 112, 112)
        """
        # Xác định kích thước đầu vào của model (ưu tiên lấy từ model, không thì mặc định 112x112)
        input_shape = session.get_inputs()[0].shape
        target_size = self.input_size
        if input_shape and len(input_shape) >= 4:
            if isinstance(input_shape[-1], int) and isinstance(input_shape[-2], int):
                target_size = (input_shape[-1], input_shape[-2])
                
        resized = cv2.resize(face_crop, target_size, interpolation=cv2.INTER_AREA)
        
        # Bỏ cvtColor BGR2RGB nếu model được huấn luyện với BGR, nhưng thường chuẩn hóa (x-127.5)/128
        # áp dụng cho RGB. Thử nghiệm thực tế các mạng FasNet thường dùng BGR hoặc RGB.
        # Ở đây ta giữ nguyên ảnh BGR (đọc bằng OpenCV) hoặc chuyển sang RGB, ở đây chuyển RGB.
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32)
        
        # Chuẩn hóa (image - 127.5) / 128.0
        normalized = (rgb - 127.5) / 128.0
        tensor = np.expand_dims(normalized.transpose(2, 0, 1), axis=0).astype(np.float32).copy()

        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        
        outputs = session.run([output_name], {input_name: tensor})
        raw = np.array(outputs[0][0], dtype=np.float32)

        # Softmax để lấy % tin cậy thật
        if raw.size >= 2:
            ex = np.exp(raw - np.max(raw))
            probs = ex / ex.sum()
            # Thường index 1 là Real
            return float(probs[1]) 
        elif raw.size == 1:
            val = float(raw[0])
            prob = float(1.0 / (1.0 + np.exp(-val))) if (val < 0.0 or val > 1.0) else val
            return prob
        return 0.0

    # ------------------------------------------------------------------
    # SCORE CALIBRATION
    # ------------------------------------------------------------------
    def _calibrate_v1(self, raw_score: float) -> float:
        """Đưa v1_score từ (0 - 0.1) về (0.0 - 1.0), siết chặt vùng nguy hiểm < 3%"""
        if raw_score <= 0.03:
            return 0.0
        if raw_score >= 0.1:
            return 1.0
        return (raw_score - 0.03) / (0.1 - 0.03)

    def _calibrate_v2(self, raw_score: float) -> float:
        """Đưa v2_score từ (0.3 - 0.98) về (0.0 - 1.0)"""
        min_v = 0.3
        max_v = 0.98
        if raw_score <= min_v:
            return 0.0
        if raw_score >= max_v:
            return 1.0
        return (raw_score - min_v) / (max_v - min_v)

    # ------------------------------------------------------------------
    # ENSEMBLE LIVENESS CHECK
    # ------------------------------------------------------------------
    def check_liveness(
        self,
        face_image: np.ndarray,
        bbox: Optional[list] = None
    ) -> LivenessResult:
        if not self.v1_session or not self.v2_session:
            return LivenessResult(True, 1.0, "UNKNOWN", "Thiếu model liveness.")

        try:
            # 1. Blur check
            blur_score, is_sharp = face_quality_checker.check_blur(face_image)
            if not is_sharp:
                return LivenessResult(False, 0.0, "FAKE", f"Ảnh mờ (score={blur_score:.2f})")

            # ==========================================
            # STEP A: V1SE (Crop 4.0)
            # ==========================================
            crop_v1 = self._crop_face(face_image, bbox, 4.0)
            if crop_v1 is None:
                return LivenessResult(False, 0.0, "FAKE", "Face crop failed (4.0)")
            
            v1_raw = self._infer_model(self.v1_session, crop_v1)
            v1_calibrated = self._calibrate_v1(v1_raw)

            # ==========================================
            # STEP B: V2 (Crop 2.7)
            # ==========================================
            crop_v2 = self._crop_face(face_image, bbox, 2.7)
            if crop_v2 is None:
                return LivenessResult(False, 0.0, "FAKE", "Face crop failed (2.7)")
            
            v2_raw = self._infer_model(self.v2_session, crop_v2)
            v2_calibrated = self._calibrate_v2(v2_raw)

            # Ghi chú Diagnostics
            diagnostics = (
                f"Diagnostics - "
                f"V2_raw={v2_raw:.2%} (calib={v2_calibrated:.2%}) | "
                f"V1_raw={v1_raw:.2%} (calib={v1_calibrated:.2%})"
            )

            # ==========================================
            # STEP C: ENSEMBLE LOGIC & VETO
            # ==========================================
            # Trọng số: 70% V2 (soi chi tiết) + 30% V1SE (soi bối cảnh)
            final_score = (0.70 * v2_calibrated) + (0.30 * v1_calibrated)

            # Cơ chế Veto cứng (Hard Threshold)
            if v2_raw < 0.85 and v1_raw < 0.04:
                reason = "V2 & V1 both too low for high confidence"
                logger.warning(f"Liveness Veto: {reason} | {diagnostics}")
                return LivenessResult(False, final_score, "FAKE", f"Phát hiện giả mạo. ({reason}) {diagnostics}")

            # Logic 'Double Check'
            if v2_raw > 0.90:
                is_real = True
                reason = "V2 strictly highly confident"
            elif v2_raw > 0.70 and v1_raw > 0.05:
                is_real = True
                reason = "V2 and V1 both agree"
            else:
                is_real = False
                reason = "Models do not agree strongly enough"

            label = "REAL" if is_real else "FAKE"
            
            logger.info(f"Liveness Ensemble ({label}, Final={final_score:.2%}) | Reason: {reason} | {diagnostics}")

            message = "Xác thực ảnh thật thành công." if is_real else f"Phát hiện giả mạo. ({reason}) {diagnostics}"

            return LivenessResult(
                is_real=is_real,
                confidence=final_score,
                label=label,
                message=message
            )

        except Exception as e:
            logger.error(f"Liveness error: {e}")
            return LivenessResult(False, 0.0, "ERROR", str(e))

    def is_available(self) -> bool:
        return self.v1_session is not None and self.v2_session is not None

face_liveness_detector = FaceLivenessDetector()

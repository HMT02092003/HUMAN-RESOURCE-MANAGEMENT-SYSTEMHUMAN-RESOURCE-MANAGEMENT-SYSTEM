"""
Face Liveness Detection Service (Ensemble Multi-Model)
Tích hợp MiniFASNetV1SE (Crop 4.0) và MiniFASNetV2 (Crop 2.7)

Luồng xử lý:
1. V1SE: Crop 4.0 → Dự đoán → Hiệu chuẩn (calibrated) lên thang đo mới.
2. Vòng 1 (Cảnh báo): Nếu V1SE calibrated < 30% → FAKE (Nghi ngờ bối cảnh).
3. V2: Crop 2.7 → Dự đoán.
4. Vòng 2 (Xác thực): Nếu V2 > 80% & V1SE calibrated > 50% → REAL.
5. Trọng số: 60% V2 + 40% V1SE_calibrated.
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
            self.input_size = (80, 80)
            self._load_models()

    def _load_models(self):
        user_home = os.path.expanduser("~")
        
        # Đường dẫn V1SE
        paths_v1 = [
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "MiniFASNetV1SE.onnx"),
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "4_0_0_80x80_MiniFASNetV1SE.onnx"),
            "models/anti_spoofing/MiniFASNetV1SE.onnx",
            "/app/models/MiniFASNetV1SE.onnx",
            "/app/models/4_0_0_80x80_MiniFASNetV1SE.onnx",
        ]
        
        # Đường dẫn V2
        paths_v2 = [
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "MiniFASNetV2.onnx"),
            "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
            "/app/models/2.7_80x80_MiniFASNetV2.onnx",
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

        if v2_path:
            try:
                self.v2_session = ort.InferenceSession(v2_path, providers=['CPUExecutionProvider'])
                logger.info(f"✅ Loaded V2: {v2_path}")
            except Exception as e:
                logger.error(f"Failed V2: {e}")

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
        """Chuẩn hóa ImageNet và lấy Real Prob."""
        resized = cv2.resize(face_crop, self.input_size, interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        
        # Chuẩn hóa (Normalize) đúng Mean và Std
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (rgb - mean) / std
        tensor = np.expand_dims(normalized.transpose(2, 0, 1), axis=0).astype(np.float32).copy()

        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        
        outputs = session.run([output_name], {input_name: tensor})
        raw = np.array(outputs[0][0], dtype=np.float32)

        # Softmax để lấy % tin cậy thật
        if raw.size >= 2:
            ex = np.exp(raw - np.max(raw))
            probs = ex / ex.sum()
            return float(probs[1]) # Thường 1 là Real class (theo index framework cũ)
        return 0.0

    # ------------------------------------------------------------------
    # HIỆU CHUẨN V1SE
    # ------------------------------------------------------------------
    def _calibrate_v1(self, raw_score: float) -> float:
        """
        Hiệu chuẩn chỉ số (Calibration) cho V1SE
        V1SE trả về rất thấp (2-6%). Ta lấy mốc 5% (0.05) = 80% (0.80) tin cậy.
        """
        calibrated = (raw_score / 0.05) * 0.80
        return min(max(calibrated, 0.0), 1.0)

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

            # Vòng 1 (Cảnh báo): V1SE calibrated < 30% đánh là giả bối cảnh
            if v1_calibrated < 0.30:
                msg = f"Nghi ngờ giả mạo bối cảnh (V1_calib={v1_calibrated:.2%})"
                logger.warning(msg)
                return LivenessResult(False, v1_calibrated, "FAKE", msg)

            # ==========================================
            # STEP B: V2 (Crop 2.7)
            # ==========================================
            crop_v2 = self._crop_face(face_image, bbox, 2.7)
            if crop_v2 is None:
                return LivenessResult(False, 0.0, "FAKE", "Face crop failed (2.7)")
            
            v2_raw = self._infer_model(self.v2_session, crop_v2)

            # ==========================================
            # STEP C: LOGIC QUYẾT ĐỊNH ĐA TẦNG
            # ==========================================
            # Trọng số: 60% V2 + 40% V1SE_calibrated
            final_score = (0.60 * v2_raw) + (0.40 * v1_calibrated)

            # Vòng 2 (Xác thực)
            is_real = (v2_raw > 0.80) and (v1_calibrated > 0.50)
            label = "REAL" if is_real else "FAKE"
            
            msg = f"Diagnostics - V2={v2_raw:.2%}, V1_raw={v1_raw:.2%}, V1_calib={v1_calibrated:.2%}"
            logger.info(f"Liveness Ensemble: {label} (Final={final_score:.2%}) | {msg}")

            if is_real:
                user_msg = "Xác thực ảnh thật thành công."
            else:
                user_msg = f"Phát hiện giả mạo. ({msg})"

            return LivenessResult(is_real, final_score, label, user_msg)

        except Exception as e:
            logger.error(f"Liveness error: {e}")
            return LivenessResult(False, 0.0, "ERROR", str(e))

    def is_available(self) -> bool:
        return self.v1_session is not None and self.v2_session is not None


face_liveness_detector = FaceLivenessDetector()

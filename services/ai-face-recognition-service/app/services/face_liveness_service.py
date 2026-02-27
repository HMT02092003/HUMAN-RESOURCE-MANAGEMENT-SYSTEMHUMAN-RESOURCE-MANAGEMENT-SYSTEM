"""
Face Liveness Detection Service
Phát hiện giả mạo: ảnh chụp từ màn hình, điện thoại, ảnh in

Luồng xử lý:
1. Crop face (scale 2.7)
2. Feed ảnh gốc vào MiniFASNetV2
3. Model tự quyết định: real_score > fake_score → REAL, ngược lại → FAKE
"""

import cv2
import numpy as np
import logging
import onnxruntime as ort
from typing import Optional
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
    """
    Anti-spoofing — để model tự quyết định.
    Model output 2 class: [fake_score, real_score]
    → argmax quyết định → không threshold thủ công.
    """

    _instance = None
    CROP_SCALE = 2.7

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceLivenessDetector, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.session = None
            self.input_name = None
            self.output_name = None
            self.input_size = (80, 80)
            self._load_model()

    def _load_model(self):
        user_home = os.path.expanduser("~")
        candidates = [
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
            os.path.join(user_home, ".insightface", "models", "2.7_80x80_MiniFASNetV2.onnx"),
            "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
            "models/2.7_80x80_MiniFASNetV2.onnx",
            "/app/models/2.7_80x80_MiniFASNetV2.onnx",
            "/root/.insightface/models/2.7_80x80_MiniFASNetV2.onnx",
        ]

        model_path = None
        for p in candidates:
            if os.path.exists(p):
                model_path = p
                break

        if not model_path:
            logger.warning("⚠️ MiniFASNetV2 not found — anti-spoofing disabled")
            return

        try:
            logger.info(f"Loading MiniFASNetV2 from: {model_path}")
            self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            inputs = self.session.get_inputs()
            outputs = self.session.get_outputs()
            self.input_name = inputs[0].name
            self.output_name = outputs[0].name

            try:
                shape = inputs[0].shape
                if shape and len(shape) >= 4:
                    h, w = shape[-2], shape[-1]
                    if isinstance(h, int) and isinstance(w, int):
                        self.input_size = (int(w), int(h))
            except Exception:
                pass

            logger.info(f"✅ MiniFASNetV2 loaded — input size: {self.input_size}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.session = None



    # ------------------------------------------------------------------
    # CROP
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
    # INFERENCE — model tự quyết định
    # ------------------------------------------------------------------
    def _infer(self, face_crop: np.ndarray) -> tuple:
        """
        Chạy model, trả về (is_real, real_confidence).
        Model output 2 class: [fake_score, real_score]
        → argmax → model tự quyết định, không threshold.
        """
        # Preprocessing chuẩn MiniFASNet
        resized = cv2.resize(face_crop, self.input_size, interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (rgb - mean) / std
        tensor = np.expand_dims(normalized.transpose(2, 0, 1), axis=0).astype(np.float32).copy()

        # Run model
        outputs = self.session.run([self.output_name], {self.input_name: tensor})
        raw = np.array(outputs[0][0], dtype=np.float32)

        # Model output → softmax → argmax (model tự quyết định)
        if raw.size >= 2:
            # Softmax
            ex = np.exp(raw - np.max(raw))
            probs = ex / ex.sum()
            fake_prob = float(probs[0])
            real_prob = float(probs[1])

            # Model quyết định: class nào có probability cao hơn thì là class đó
            is_real = real_prob > fake_prob
            return is_real, real_prob
        else:
            # Single output → sigmoid
            val = float(raw[0])
            prob = float(1.0 / (1.0 + np.exp(-val))) if (val < 0.0 or val > 1.0) else val
            return prob > 0.5, prob

    # ------------------------------------------------------------------
    # MAIN
    # ------------------------------------------------------------------
    def check_liveness(
        self,
        face_image: np.ndarray,
        bbox: Optional[list] = None
    ) -> LivenessResult:
        """
        Kiểm tra giả mạo.
        1. Kiểm tra blur
        2. Crop face (scale 2.7)
        3. Feed ảnh gốc vào model → model tự quyết định
        """
        if self.session is None:
            return LivenessResult(True, 1.0, "UNKNOWN", "Anti-spoofing disabled")

        try:
            blur_score, is_sharp = face_quality_checker.check_blur(face_image)
            if not is_sharp:
                logger.warning(f"Too blurry (score={blur_score:.2f})")
                return LivenessResult(False, 0.0, "FAKE", "Ảnh quá mờ, vui lòng giữ yên điện thoại khi chụp.")

            face_crop = self._crop_face(face_image, bbox, self.CROP_SCALE)
            if face_crop is None:
                return LivenessResult(False, 0.0, "FAKE", "Không crop được khuôn mặt")

            # Model tự quyết định (ảnh gốc, không enhance)
            is_real, confidence = self._infer(face_crop)
            label = "REAL" if is_real else "FAKE"

            if is_real:
                message = "Xác thực thành công"
            else:
                message = "Phát hiện giả mạo"

            logger.info(f"Liveness: {label} ({confidence:.2%})")

            return LivenessResult(is_real=is_real, confidence=confidence, label=label, message=message)

        except Exception as e:
            logger.error(f"Liveness error: {e}")
            return LivenessResult(False, 0.0, "ERROR", str(e))

    def is_available(self) -> bool:
        return self.session is not None


face_liveness_detector = FaceLivenessDetector()

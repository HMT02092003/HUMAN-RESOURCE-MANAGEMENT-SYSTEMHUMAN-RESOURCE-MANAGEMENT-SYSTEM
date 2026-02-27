"""
Face Liveness Detection Service
Kiểm tra ảnh thật/giả bằng Silent-Face-Anti-Spoofing model (ONNX)
Chống giả mạo: ảnh chụp từ màn hình máy tính, điện thoại, ảnh in giấy

Luồng xử lý:
1. Xử lý ánh sáng (enhance) trước khi detect
2. Dùng 1 model (MiniFASNetV2) để phát hiện giả mạo
3. Model tự quyết định thật/giả (threshold 0.5 — chuẩn binary classification)
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
    label: str  # "REAL" hoặc "FAKE"
    message: str


class FaceLivenessDetector:
    """
    Anti-spoofing detector.
    
    Luồng đơn giản:
      1. Crop face scale 2.7 (đủ context để thấy viền screen/giấy)
      2. Enhance ảnh (denoise + sharpen + cân bằng sáng)
      3. Feed vào MiniFASNetV2
      4. Model output > 0.5 → REAL, ≤ 0.5 → FAKE
    
    Singleton pattern.
    """

    _instance = None

    # Scale chuẩn Silent-Face-Anti-Spoofing
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
            self.input_size = (80, 80)  # (W, H)
            self._load_model()

    # ------------------------------------------------------------------
    # MODEL LOADING (chỉ 1 model: MiniFASNetV2)
    # ------------------------------------------------------------------
    def _load_model(self):
        """Load MiniFASNetV2 — model chính để detect giả mạo."""
        user_home = os.path.expanduser("~")

        # Tìm model theo thứ tự ưu tiên
        candidate_paths = [
            os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
            os.path.join(user_home, ".insightface", "models", "2.7_80x80_MiniFASNetV2.onnx"),
            "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
            "models/2.7_80x80_MiniFASNetV2.onnx",
            "/app/models/2.7_80x80_MiniFASNetV2.onnx",
            "/root/.insightface/models/2.7_80x80_MiniFASNetV2.onnx",
        ]

        model_path = None
        for p in candidate_paths:
            if os.path.exists(p):
                model_path = p
                break

        if model_path is None:
            logger.warning("⚠️ MiniFASNetV2 not found — anti-spoofing disabled")
            return

        try:
            logger.info(f"Loading MiniFASNetV2 from: {model_path}")
            self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

            inputs = self.session.get_inputs()
            outputs = self.session.get_outputs()
            self.input_name = inputs[0].name
            self.output_name = outputs[0].name

            # Auto-detect input size
            try:
                shape = inputs[0].shape
                if shape and len(shape) >= 4:
                    h, w = shape[-2], shape[-1]
                    if isinstance(h, int) and isinstance(w, int):
                        self.input_size = (int(w), int(h))
            except Exception:
                pass

            logger.info(f"✅ MiniFASNetV2 loaded — input: {self.input_name}, size: {self.input_size}")
        except Exception as e:
            logger.error(f"Failed to load MiniFASNetV2: {e}")
            self.session = None

    # ------------------------------------------------------------------
    # IMAGE ENHANCEMENT (xử lý ánh sáng trước khi detect)
    # ------------------------------------------------------------------
    @staticmethod
    def _enhance_image(image: np.ndarray) -> np.ndarray:
        """
        Xử lý ánh sáng cho ảnh trước khi đưa vào model.
        
        Pipeline:
        1. Bilateral filter: khử noise giữ cạnh (camera rẻ tạo nhiều noise)
        2. CLAHE trên L channel: cân bằng ánh sáng cục bộ (cứu ảnh tối/backlight)
        3. Unsharp mask: làm nét chi tiết khuôn mặt
        """
        try:
            # 1. Denoise (giữ cạnh)
            denoised = cv2.bilateralFilter(image, d=9, sigmaColor=75, sigmaSpace=75)

            # 2. CLAHE trên L channel (cân bằng sáng)
            lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l_ch)
            enhanced = cv2.cvtColor(cv2.merge((l_enhanced, a_ch, b_ch)), cv2.COLOR_LAB2BGR)

            # 3. Sharpen (làm nét)
            gaussian = cv2.GaussianBlur(enhanced, (0, 0), 3)
            sharpened = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)

            return sharpened
        except Exception as e:
            logger.warning(f"Enhancement error: {e}")
            return image

    # ------------------------------------------------------------------
    # CROP FACE
    # ------------------------------------------------------------------
    @staticmethod
    def _crop_face(image: np.ndarray, bbox: Optional[list], scale: float) -> Optional[np.ndarray]:
        """Crop khuôn mặt với scale cho trước."""
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

        pad_left = max(0, -nx1)
        pad_top = max(0, -ny1)
        pad_right = max(0, nx2 - image.shape[1])
        pad_bottom = max(0, ny2 - image.shape[0])
        if any([pad_left, pad_top, pad_right, pad_bottom]):
            crop = cv2.copyMakeBorder(crop, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_REPLICATE)

        if crop is None or crop.size == 0:
            return None
        return crop

    # ------------------------------------------------------------------
    # PREPROCESSING (chuẩn MiniFASNet)
    # ------------------------------------------------------------------
    def _preprocess(self, face_image: np.ndarray) -> np.ndarray:
        """Resize → RGB → ImageNet normalize → NCHW tensor."""
        if face_image.size == 0:
            raise ValueError("Empty face image")

        resized = cv2.resize(face_image, self.input_size, interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        normalized = rgb.astype(np.float32) / 255.0

        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (normalized - mean) / std

        transposed = normalized.transpose(2, 0, 1)
        tensor = np.expand_dims(transposed, axis=0).copy()
        return tensor.astype(np.float32)

    # ------------------------------------------------------------------
    # INFERENCE (chạy model)
    # ------------------------------------------------------------------
    def _infer(self, face_crop: np.ndarray) -> float:
        """Chạy model, trả về real_probability (0-1)."""
        tensor = self._preprocess(face_crop)
        outputs = self.session.run([self.output_name], {self.input_name: tensor.copy()})
        output = np.array(outputs[0][0], dtype=np.float32)

        if output.size == 2:
            # 2-class output: [fake_score, real_score]
            if (np.any(output < 0) or np.any(output > 1)) or (not np.isclose(np.sum(output), 1.0, rtol=1e-3)):
                ex = np.exp(output - np.max(output))
                probs = ex / ex.sum()
            else:
                probs = output / np.sum(output)
            return float(probs[1])
        else:
            val = float(output[0])
            if val < 0.0 or val > 1.0:
                return float(1.0 / (1.0 + np.exp(-val)))
            return val

    # ------------------------------------------------------------------
    # MAIN: CHECK LIVENESS
    # ------------------------------------------------------------------
    def check_liveness(
        self,
        face_image: np.ndarray,
        bbox: Optional[list] = None
    ) -> LivenessResult:
        """
        Kiểm tra ảnh thật/giả.
        
        Luồng:
          1. Kiểm tra blur
          2. Crop face (scale 2.7)
          3. Enhance ảnh (xử lý ánh sáng)
          4. Feed vào model → model tự quyết định
          5. confidence > 0.5 → REAL, ≤ 0.5 → FAKE
        """
        if self.session is None:
            return LivenessResult(is_real=True, confidence=1.0, label="UNKNOWN", message="Liveness disabled")

        try:
            # 1. Kiểm tra blur
            blur_score, is_sharp = face_quality_checker.check_blur(face_image)
            if not is_sharp:
                logger.warning(f"Liveness aborted: too blurry (score={blur_score:.2f})")
                return LivenessResult(
                    is_real=False, confidence=0.0, label="FAKE",
                    message="Ảnh quá mờ, vui lòng giữ yên điện thoại khi chụp."
                )

            # 2. Crop face (scale 2.7 — đủ rộng để thấy viền screen/giấy)
            face_crop = self._crop_face(face_image, bbox, self.CROP_SCALE)
            if face_crop is None or face_crop.size == 0:
                return LivenessResult(False, 0.0, "FAKE", "Empty crop")

            # 3. Xử lý ánh sáng TRƯỚC khi detect
            enhanced = self._enhance_image(face_crop)

            # 4. Model tự quyết định (binary: > 0.5 = REAL)
            confidence = self._infer(enhanced)

            is_real = confidence > 0.5
            label = "REAL" if is_real else "FAKE"

            if is_real:
                message = "Xác thực ảnh thật thành công"
            elif confidence < 0.3:
                message = "PHÁT HIỆN GIAN LẬN: Sử dụng ảnh in hoặc màn hình điện thoại."
            else:
                message = "CẢNH BÁO: Hệ thống nghi ngờ ảnh không phải thực thể sống."

            logger.info(
                f"Liveness: {label} (confidence={confidence:.2%}) | "
                f"scale={self.CROP_SCALE}, enhanced=True"
            )

            return LivenessResult(
                is_real=is_real,
                confidence=confidence,
                label=label,
                message=message
            )

        except Exception as e:
            logger.error(f"Liveness error: {e}")
            return LivenessResult(False, 0.0, "ERROR", str(e))

    def is_available(self) -> bool:
        """Kiểm tra model sẵn sàng"""
        return self.session is not None


# Singleton instance
face_liveness_detector = FaceLivenessDetector()

"""
Face Liveness Detection Service
Kiểm tra ảnh thật/giả bằng Silent-Face-Anti-Spoofing model (ONNX)
Chống giả mạo: ảnh in, màn hình, mặt nạ

Phase 1: Multi-Model Ensemble + Multi-Scale Crop + TTA
- 2 models: MiniFASNetV2 + MiniFASNetV1SE
- 3 scales: 1.0 (tight), 2.7 (medium), 4.0 (wide)
- TTA: original + horizontal flip
→ Tối đa 12 lần inference, lấy MAX → giảm false positive mạnh
"""

import cv2
import numpy as np
import logging
import onnxruntime as ort
from typing import Dict, Tuple, Optional, List
from dataclasses import dataclass
import os
from app.config.rate_config import LIVENESS_THRESHOLD
from app.services.face_quality_service import face_quality_checker

logger = logging.getLogger(__name__)


@dataclass
class LivenessResult:
    """Kết quả kiểm tra liveness"""
    is_real: bool
    confidence: float
    label: str  # "REAL" hoặc "FAKE"
    message: str


class _OnnxModel:
    """Wrapper cho một ONNX anti-spoofing model."""

    def __init__(self, model_path: str, name: str):
        self.name = name
        self.session = None
        self.input_name = None
        self.output_name = None
        self.input_size = (80, 80)  # default (W, H)
        self._load(model_path)

    def _load(self, model_path: str):
        try:
            logger.info(f"Loading liveness model [{self.name}] from: {model_path}")
            self.session = ort.InferenceSession(
                model_path,
                providers=['CPUExecutionProvider']
            )
            model_inputs = self.session.get_inputs()
            model_outputs = self.session.get_outputs()
            self.input_name = model_inputs[0].name if model_inputs else None
            self.output_name = model_outputs[0].name if model_outputs else None

            # Auto-detect input size
            try:
                inp_shape = model_inputs[0].shape
                if inp_shape and len(inp_shape) >= 4:
                    h, w = inp_shape[-2], inp_shape[-1]
                    if isinstance(h, int) and isinstance(w, int):
                        self.input_size = (int(w), int(h))
                        logger.info(f"  [{self.name}] input size: {self.input_size} (W,H)")
            except Exception:
                pass

            logger.info(f"✅ [{self.name}] loaded — input: {self.input_name}, output: {self.output_name}")
        except Exception as e:
            logger.error(f"Failed to load [{self.name}]: {e}")
            self.session = None

    @property
    def is_available(self) -> bool:
        return self.session is not None

    def run(self, face_crop: np.ndarray) -> float:
        """Preprocess + inference, trả về real_probability."""
        tensor = self._preprocess(face_crop)
        outputs = self.session.run(
            [self.output_name],
            {self.input_name: tensor.copy()}
        )
        output = np.array(outputs[0][0], dtype=np.float32)

        if output.size == 2:
            # 2-class: [fake_score, real_score]
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
    def _preprocess(self, face_image: np.ndarray) -> np.ndarray:
        """Chuẩn MiniFASNet preprocessing: resize → RGB → ImageNet normalise → NCHW."""
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


class FaceLivenessDetector:
    """
    Service kiểm tra liveness (Anti-spoofing)
    Phase 1: Multi-Model Ensemble + Multi-Scale Crop + TTA
    Singleton pattern
    """

    _instance = None

    # Ngưỡng confidence
    REAL_THRESHOLD = float(LIVENESS_THRESHOLD)

    # Multi-scale crop scales
    CROP_SCALES = [1.0, 2.7, 4.0]

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceLivenessDetector, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.models: List[_OnnxModel] = []
            self._discover_and_load_models()

    # ------------------------------------------------------------------
    # MODEL DISCOVERY
    # ------------------------------------------------------------------
    def _discover_and_load_models(self):
        """
        Tìm và load tất cả anti-spoofing model.
        Ưu tiên:
          1. MiniFASNetV2    (2.7_80x80_MiniFASNetV2.onnx)
          2. MiniFASNetV1SE  (MiniFASNetV1SE.onnx / 4_0_0_80x80_MiniFASNetV1SE.onnx)
        """
        user_home = os.path.expanduser("~")

        # Danh sách candidate (tên hiển thị, danh sách path ưu tiên)
        model_candidates = [
            ("MiniFASNetV2", [
                os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
                os.path.join(user_home, ".insightface", "models", "2.7_80x80_MiniFASNetV2.onnx"),
                "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
                "models/2.7_80x80_MiniFASNetV2.onnx",
                "/app/models/2.7_80x80_MiniFASNetV2.onnx",
                # Docker: COPY models → /root/.insightface/models
                "/root/.insightface/models/2.7_80x80_MiniFASNetV2.onnx",
            ]),
            ("MiniFASNetV1SE", [
                os.path.join(user_home, ".insightface", "models", "anti_spoofing", "MiniFASNetV1SE.onnx"),
                os.path.join(user_home, ".insightface", "models", "MiniFASNetV1SE.onnx"),
                os.path.join(user_home, ".insightface", "models", "anti_spoofing", "4_0_0_80x80_MiniFASNetV1SE.onnx"),
                os.path.join(user_home, ".insightface", "models", "4_0_0_80x80_MiniFASNetV1SE.onnx"),
                "models/anti_spoofing/MiniFASNetV1SE.onnx",
                "models/MiniFASNetV1SE.onnx",
                "models/anti_spoofing/4_0_0_80x80_MiniFASNetV1SE.onnx",
                "models/4_0_0_80x80_MiniFASNetV1SE.onnx",
                "/app/models/MiniFASNetV1SE.onnx",
                "/app/models/4_0_0_80x80_MiniFASNetV1SE.onnx",
                # Docker
                "/root/.insightface/models/MiniFASNetV1SE.onnx",
                "/root/.insightface/models/4_0_0_80x80_MiniFASNetV1SE.onnx",
            ]),
        ]

        for name, paths in model_candidates:
            model_path = None
            for p in paths:
                if os.path.exists(p):
                    model_path = p
                    break
            if model_path:
                m = _OnnxModel(model_path, name)
                if m.is_available:
                    self.models.append(m)
            else:
                logger.warning(f"⚠️ Model [{name}] not found — skipped")

        if not self.models:
            logger.warning(
                "⚠️ No liveness model found. Anti-spoofing will be disabled. "
                "Please download Silent-Face-Anti-Spoofing ONNX models."
            )
        else:
            logger.info(f"🔒 Liveness ensemble: {len(self.models)} model(s) loaded — "
                        f"{[m.name for m in self.models]}")

    # ------------------------------------------------------------------
    # CROP HELPERS
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
    # MAIN LIVENESS CHECK
    # ------------------------------------------------------------------
    def check_liveness(
        self,
        face_image: np.ndarray,
        bbox: Optional[list] = None
    ) -> LivenessResult:
        """
        Kiểm tra ảnh có phải thật không.
        Chiến lược Phase 1:
          - Multi-Scale Crop (3 scales)
          - Multi-Model Ensemble (2 models)
          - TTA: original + horizontal flip
        Lấy MAX confidence trong tất cả kết quả → giảm false positive.
        """
        if not self.models:
            return LivenessResult(is_real=True, confidence=1.0, label="UNKNOWN", message="Liveness disabled")

        try:
            # 0. Kiểm tra chất lượng ảnh (Blur)
            blur_score, is_sharp = face_quality_checker.check_blur(face_image)
            if not is_sharp:
                logger.warning(f"Liveness aborted: Image too blurry (score={blur_score:.2f})")
                return LivenessResult(
                    is_real=False,
                    confidence=0.0,
                    label="FAKE",
                    message="Ảnh quá mờ, vui lòng giữ yên điện thoại khi chụp."
                )

            # 1. Multi-Scale Crop
            all_confidences: List[float] = []
            details: Dict[str, List[float]] = {}

            for scale in self.CROP_SCALES:
                face_crop = self._crop_face(face_image, bbox, scale)
                if face_crop is None or face_crop.size == 0:
                    continue

                # TTA: original + horizontal flip
                augmented = [face_crop, cv2.flip(face_crop, 1)]

                for model in self.models:
                    model_confs = []
                    for aug in augmented:
                        try:
                            conf = model.run(aug)
                            model_confs.append(conf)
                            all_confidences.append(conf)
                        except Exception as e:
                            logger.warning(f"Inference error [{model.name}] scale={scale}: {e}")

                    # Thêm CLAHE pass cho mỗi model (giữ tương thích với phiên bản cũ)
                    try:
                        lab = cv2.cvtColor(face_crop, cv2.COLOR_BGR2LAB)
                        l_ch, a_ch, b_ch = cv2.split(lab)
                        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                        l_clahe = clahe.apply(l_ch)
                        face_crop_clahe = cv2.cvtColor(cv2.merge((l_clahe, a_ch, b_ch)), cv2.COLOR_LAB2BGR)
                        conf_clahe = model.run(face_crop_clahe)
                        model_confs.append(conf_clahe)
                        all_confidences.append(conf_clahe)
                    except Exception as e:
                        logger.warning(f"CLAHE error [{model.name}]: {e}")

                    key = f"{model.name}_s{scale}"
                    details[key] = model_confs

            if not all_confidences:
                return LivenessResult(False, 0.0, "FAKE", "No valid inference results")

            # 2. Lấy MAX confidence (giảm false positive cho ảnh thật)
            confidence = max(all_confidences)

            is_real = confidence >= self.REAL_THRESHOLD
            label = "REAL" if is_real else "FAKE"

            if is_real:
                message = "Xác thực ảnh thật thành công"
            else:
                if confidence < 0.70:
                    message = "PHÁT HIỆN GIAN LẬN: Sử dụng ảnh in hoặc màn hình điện thoại."
                else:
                    message = "CẢNH BÁO GIAN LẬN: Hệ thống nghi ngờ ảnh không phải thực thể sống."

            # Log chi tiết để debug
            logger.info(
                f"Liveness check: {label} (confidence={confidence:.2%}) | "
                f"models={len(self.models)}, scales={self.CROP_SCALES}, "
                f"total_inferences={len(all_confidences)}, "
                f"all_confs={[f'{c:.3f}' for c in sorted(all_confidences, reverse=True)[:6]]}"
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
        """Kiểm tra có ít nhất 1 model sẵn sàng không"""
        return len(self.models) > 0


# Singleton instance
face_liveness_detector = FaceLivenessDetector()


# ============================================================================
# HƯỚNG DẪN SỬ DỤNG (Phase 1 — Multi-Model Ensemble)
# ============================================================================
"""
## Models cần có (đặt trong thư mục models/):
  1. 2.7_80x80_MiniFASNetV2.onnx     (~1.3 MB) — Nhẹ, nhanh
  2. MiniFASNetV1SE.onnx              (~1.7 MB) — SE-Attention, chính xác hơn

## Chiến lược:
  - 3 crop scales (1.0, 2.7, 4.0) × 2 models × 2 TTA (original+flip) + CLAHE
  - Tổng tối đa 18 inferences
  - Lấy MAX confidence → giảm mạnh false positive cho ảnh thật

## Cài đặt:
   pip install onnxruntime

## Sử dụng:
   from app.services.face_liveness_service import face_liveness_detector

   result = face_liveness_detector.check_liveness(face_image, bbox)
   if result.is_real:
       print("Ảnh thật!")
   else:
       print("Ảnh giả mạo!")
"""

"""
Face Liveness Detection Service
Kiểm tra ảnh thật/giả bằng Silent-Face-Anti-Spoofing model (ONNX)
Chống giả mạo: ảnh in, màn hình, mặt nạ

Multi-Model Ensemble — Per-Model Aggregation
- 2 models: MiniFASNetV2 + MiniFASNetV1SE
- Scale 2.7 (chuẩn Silent-Face-Anti-Spoofing)
- Mỗi model: avg(original, CLAHE)
- Final: MAX of per-model averages
- Threshold: 0.50 (phù hợp camera chất lượng kém)
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
    Multi-Model Ensemble + Per-Model Aggregation
    
    Chiến lược:
    - Scale 2.7 (chuẩn Silent-Face-Anti-Spoofing)
    - Mỗi model chạy 2 pass: original + CLAHE
    - Per-model confidence = trung bình 2 pass
    - Final = MAX of per-model confidences
    - Threshold 0.50 (phù hợp camera chất lượng kém)
    
    Singleton pattern
    """

    _instance = None

    # Ngưỡng confidence
    REAL_THRESHOLD = float(LIVENESS_THRESHOLD)

    # Scale chuẩn Silent-Face-Anti-Spoofing
    CROP_SCALE = 2.7

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

        model_candidates = [
            ("MiniFASNetV2", [
                os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
                os.path.join(user_home, ".insightface", "models", "2.7_80x80_MiniFASNetV2.onnx"),
                "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
                "models/2.7_80x80_MiniFASNetV2.onnx",
                "/app/models/2.7_80x80_MiniFASNetV2.onnx",
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
        
        Chiến lược:
          1. Crop face ở scale 2.7 (chuẩn Silent-Face-Anti-Spoofing)
          2. Mỗi model chạy 2 pass: original + CLAHE
          3. Per-model confidence = trung bình 2 pass
          4. Final = MAX of per-model confidences
          5. So sánh với threshold 0.50
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

            # 1. Crop face ở scale 2.7
            face_crop = self._crop_face(face_image, bbox, self.CROP_SCALE)
            if face_crop is None or face_crop.size == 0:
                return LivenessResult(False, 0.0, "FAKE", "Empty crop")

            # 2. CLAHE variant
            face_crop_clahe = None
            try:
                lab = cv2.cvtColor(face_crop, cv2.COLOR_BGR2LAB)
                l_ch, a_ch, b_ch = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l_clahe = clahe.apply(l_ch)
                face_crop_clahe = cv2.cvtColor(cv2.merge((l_clahe, a_ch, b_ch)), cv2.COLOR_LAB2BGR)
            except Exception as e:
                logger.warning(f"CLAHE preparation error: {e}")

            # 3. Per-model inference
            per_model_scores: Dict[str, float] = {}
            all_confs: List[float] = []

            for model in self.models:
                model_confs = []
                try:
                    conf = model.run(face_crop)
                    model_confs.append(conf)
                    all_confs.append(conf)
                except Exception as e:
                    logger.warning(f"Inference error [{model.name}]: {e}")

                if face_crop_clahe is not None:
                    try:
                        conf_clahe = model.run(face_crop_clahe)
                        model_confs.append(conf_clahe)
                        all_confs.append(conf_clahe)
                    except Exception as e:
                        logger.warning(f"CLAHE inference error [{model.name}]: {e}")

                if model_confs:
                    per_model_scores[model.name] = float(np.mean(model_confs))

            if not per_model_scores:
                return LivenessResult(False, 0.0, "FAKE", "No valid inference results")

            # 4. Final = MAX of per-model averages
            confidence = max(per_model_scores.values())

            is_real = confidence >= self.REAL_THRESHOLD
            label = "REAL" if is_real else "FAKE"

            if is_real:
                message = "Xác thực ảnh thật thành công"
            else:
                if confidence < 0.30:
                    message = "PHÁT HIỆN GIAN LẬN: Sử dụng ảnh in hoặc màn hình điện thoại."
                else:
                    message = "CẢNH BÁO GIAN LẬN: Hệ thống nghi ngờ ảnh không phải thực thể sống."

            # Log chi tiết
            logger.info(
                f"Liveness check: {label} (confidence={confidence:.2%}) | "
                f"models={len(self.models)}, scale={self.CROP_SCALE}, "
                f"per_model={{{', '.join(f'{k}={v:.3f}' for k,v in per_model_scores.items())}}}, "
                f"all_raw={[f'{c:.3f}' for c in all_confs]}"
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

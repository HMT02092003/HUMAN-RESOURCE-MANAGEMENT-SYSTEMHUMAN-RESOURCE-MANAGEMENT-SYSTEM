"""
Face Liveness Detection Service
Kiểm tra ảnh thật/giả bằng Silent-Face-Anti-Spoofing model (ONNX)
Chống giả mạo: ảnh in, màn hình, mặt nạ

Multi-Model Ensemble + Image Enhancement
- 2 models: MiniFASNetV2 + MiniFASNetV1SE
- Scale 2.7 (chuẩn Silent-Face-Anti-Spoofing)
- Image enhancement: bilateral filter + unsharp mask (cứu ảnh camera kém)
- 3 variants per model: original, enhanced, CLAHE
- Final: MAX of per-model averages
- Threshold: 0.65
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
    Multi-Model Ensemble + Image Enhancement + Lighting Analysis
    
    Chiến lược:
    - Scale 2.7 (chuẩn Silent-Face-Anti-Spoofing)
    - Image enhancement: bilateral filter + sharpen (cứu camera kém)
    - Lighting analysis: điều chỉnh threshold theo điều kiện ánh sáng
      + Tối → hạ threshold (model cho điểm thấp là bình thường)
      + Sáng đều (screen) → giữ/tăng threshold
    - 3 variants per model: original, enhanced, CLAHE
    - Final: MAX of per-model MAX
    
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
    # IMAGE ENHANCEMENT (cho camera chất lượng kém)
    # ------------------------------------------------------------------
    @staticmethod
    def _enhance_image(face_crop: np.ndarray) -> np.ndarray:
        """
        Tăng chất lượng ảnh cho camera kém.
        
        Pipeline:
        1. Bilateral filter: Khử noise nhưng giữ cạnh (edge-preserving)
           → Làm sạch sensor noise của camera rẻ, giữ chi tiết khuôn mặt
        2. Unsharp mask: Làm nét chi tiết
           → Phục hồi các chi tiết bị mờ do camera kém
        3. CLAHE trên L channel: Cân bằng ánh sáng cục bộ
           → Cải thiện ảnh trong điều kiện thiếu sáng
        
        Kết quả: ảnh thật sẽ rõ hơn → model cho điểm cao hơn
        """
        try:
            # 1. Bilateral filter: denoise giữ cạnh
            denoised = cv2.bilateralFilter(face_crop, d=9, sigmaColor=75, sigmaSpace=75)
            
            # 2. Unsharp mask: sharpen
            gaussian = cv2.GaussianBlur(denoised, (0, 0), 3)
            sharpened = cv2.addWeighted(denoised, 1.5, gaussian, -0.5, 0)
            
            # 3. CLAHE trên L channel: cân bằng ánh sáng
            lab = cv2.cvtColor(sharpened, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(4, 4))
            l_enhanced = clahe.apply(l_ch)
            enhanced = cv2.cvtColor(cv2.merge((l_enhanced, a_ch, b_ch)), cv2.COLOR_LAB2BGR)
            
            return enhanced
        except Exception as e:
            logger.warning(f"Image enhancement error: {e}")
            return face_crop

    # ------------------------------------------------------------------
    # LIGHTING ANALYSIS (điều chỉnh threshold theo ánh sáng)
    # ------------------------------------------------------------------
    @staticmethod
    def _analyze_lighting(face_crop: np.ndarray) -> Dict[str, float]:
        """
        Phân tích điều kiện ánh sáng của ảnh.
        
        Trả về:
        - brightness: độ sáng trung bình (0-255)
        - contrast: độ tương phản (std deviation)
        - uniformity: mức độ đồng đều (0-1, 1 = rất đồng đều = nghi ngờ screen)
        - threshold_adjustment: điều chỉnh threshold (-0.15 đến +0.05)
        
        Logic:
        - Ảnh tối (brightness < 100): model cho điểm thấp là bình thường → hạ threshold
        - Ảnh sáng đều (screen): ánh sáng màn hình rất đồng đều → thêm penalty
        - Ảnh sáng tự nhiên: có shadow, gradient → không điều chỉnh
        """
        try:
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
            
            brightness = float(np.mean(gray))
            contrast = float(np.std(gray))
            
            # Uniformity: chia ảnh thành 4x4 blocks, tính std của các block means
            h, w = gray.shape
            bh, bw = h // 4, w // 4
            block_means = []
            for i in range(4):
                for j in range(4):
                    block = gray[i*bh:(i+1)*bh, j*bw:(j+1)*bw]
                    block_means.append(np.mean(block))
            
            # Uniformity = 1 - normalized_std (càng đồng đều càng gần 1)
            block_std = np.std(block_means)
            uniformity = max(0.0, 1.0 - block_std / 50.0)  # normalize: std=50 → uniformity=0
            
            # Tính threshold adjustment
            adjustment = 0.0
            
            # 1. Ảnh tối → hạ threshold (tối đa -0.15)
            if brightness < 120:
                # Càng tối càng hạ nhiều
                dark_factor = (120 - brightness) / 120.0  # 0→1 khi brightness 120→0
                adjustment -= dark_factor * 0.15  # tối đa giảm 0.15
            
            # 2. Ảnh contrast thấp → hạ thêm một chút
            if contrast < 35:
                low_contrast_factor = (35 - contrast) / 35.0
                adjustment -= low_contrast_factor * 0.05  # tối đa giảm thêm 0.05
            
            # 3. Ảnh sáng quá đồng đều (nghi screen) → tăng threshold
            if uniformity > 0.85 and brightness > 120:
                adjustment += 0.05  # Screen penalty
            
            # Giới hạn adjustment
            adjustment = max(-0.15, min(0.05, adjustment))
            
            return {
                "brightness": brightness,
                "contrast": contrast,
                "uniformity": uniformity,
                "threshold_adjustment": adjustment
            }
        except Exception as e:
            logger.warning(f"Lighting analysis error: {e}")
            return {
                "brightness": 128.0,
                "contrast": 50.0,
                "uniformity": 0.5,
                "threshold_adjustment": 0.0
            }

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
          1. Crop face ở scale 2.7
          2. Phân tích ánh sáng → điều chỉnh threshold
          3. Tạo 3 variants: original, enhanced, CLAHE
          4. Mỗi model chạy cả 3 variants
          5. Per-model confidence = MAX của 3 results
          6. Final = MAX of per-model confidences
          7. So sánh với adaptive threshold
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

            # 2. Phân tích ánh sáng → adaptive threshold
            lighting = self._analyze_lighting(face_crop)
            adaptive_threshold = self.REAL_THRESHOLD + lighting["threshold_adjustment"]
            adaptive_threshold = max(0.45, min(0.70, adaptive_threshold))  # Giới hạn

            # 3. Tạo 3 variants
            face_enhanced = self._enhance_image(face_crop)
            
            face_clahe = None
            try:
                lab = cv2.cvtColor(face_crop, cv2.COLOR_BGR2LAB)
                l_ch, a_ch, b_ch = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l_clahe = clahe.apply(l_ch)
                face_clahe = cv2.cvtColor(cv2.merge((l_clahe, a_ch, b_ch)), cv2.COLOR_LAB2BGR)
            except Exception as e:
                logger.warning(f"CLAHE preparation error: {e}")

            # 4. Per-model: chạy 3 variants, lấy MAX
            variants = [("orig", face_crop), ("enhanced", face_enhanced)]
            if face_clahe is not None:
                variants.append(("clahe", face_clahe))

            per_model_scores: Dict[str, float] = {}
            details: Dict[str, Dict[str, float]] = {}

            for model in self.models:
                model_confs = {}
                for var_name, var_img in variants:
                    try:
                        conf = model.run(var_img)
                        model_confs[var_name] = conf
                    except Exception as e:
                        logger.warning(f"Inference error [{model.name}/{var_name}]: {e}")

                if model_confs:
                    per_model_scores[model.name] = max(model_confs.values())
                    details[model.name] = model_confs

            if not per_model_scores:
                return LivenessResult(False, 0.0, "FAKE", "No valid inference results")

            # 5. Final = MAX of per-model scores
            confidence = max(per_model_scores.values())

            # 6. So sánh với adaptive threshold
            is_real = confidence >= adaptive_threshold
            label = "REAL" if is_real else "FAKE"

            if is_real:
                message = "Xác thực ảnh thật thành công"
            else:
                if confidence < 0.30:
                    message = "PHÁT HIỆN GIAN LẬN: Sử dụng ảnh in hoặc màn hình điện thoại."
                else:
                    message = "CẢNH BÁO GIAN LẬN: Hệ thống nghi ngờ ảnh không phải thực thể sống."

            # Log chi tiết
            detail_str = "; ".join(
                f"{m}: {{{', '.join(f'{v}={s:.3f}' for v,s in vs.items())}}}"
                for m, vs in details.items()
            )
            logger.info(
                f"Liveness check: {label} (confidence={confidence:.2%}, threshold={adaptive_threshold:.2%}) | "
                f"models={len(self.models)}, "
                f"lighting={{bright={lighting['brightness']:.0f}, contrast={lighting['contrast']:.0f}, "
                f"uniform={lighting['uniformity']:.2f}, adj={lighting['threshold_adjustment']:+.3f}}}, "
                f"per_model={{{', '.join(f'{k}={v:.3f}' for k,v in per_model_scores.items())}}}, "
                f"details=[{detail_str}]"
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

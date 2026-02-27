"""
Face Liveness Detection Service
Kiểm tra ảnh thật/giả bằng Silent-Face-Anti-Spoofing model (ONNX)
Chống giả mạo: ảnh in, màn hình, mặt nạ
"""

import cv2
import numpy as np
import logging
import onnxruntime as ort
from typing import Dict, Tuple, Optional
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


class FaceLivenessDetector:
    """
    Service kiểm tra liveness (Anti-spoofing)
    Sử dụng Silent-Face-Anti-Spoofing ONNX model
    Singleton pattern
    """
    
    _instance = None
    
    # Ngưỡng confidence (0-1). Lấy từ config trung tâm (rate_config)
    REAL_THRESHOLD = float(LIVENESS_THRESHOLD)
    
    # Kích thước input model
    INPUT_SIZE = (80, 80)  # Hoặc (224, 224) tùy model bạn dùng
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(FaceLivenessDetector, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Khởi tạo liveness detector
        
        Args:
            model_path: Đường dẫn đến file ONNX model
                       Nếu None, sẽ tìm trong thư mục models/anti_spoofing/
        """
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.session = None
            self.input_name = None
            self.output_name = None
            
            # Tìm model path
            if model_path is None:
                # Candidate paths (project-relative and user ~/.insightface locations)
                user_home = os.path.expanduser("~")
                possible_paths = [
                    # Preferred location used by our installer/docs
                    os.path.join(user_home, ".insightface", "models", "anti_spoofing", "2.7_80x80_MiniFASNetV2.onnx"),
                    # Some users put model directly in ~/.insightface/models/
                    os.path.join(user_home, ".insightface", "models", "2.7_80x80_MiniFASNetV2.onnx"),
                    # Project-relative fallbacks
                    "models/anti_spoofing/2.7_80x80_MiniFASNetV2.onnx",
                    "models/2.7_80x80_MiniFASNetV2.onnx",  # Found via search
                    "/app/models/2.7_80x80_MiniFASNetV2.onnx", # Docker volume path
                    "models/anti_spoofing/4_0_0_80x80_MiniFASNetV1SE.onnx",
                    "weight/anti_spoofing.onnx",
                    "../models/anti_spoofing.onnx"
                ]

                for path in possible_paths:
                    if os.path.exists(path):
                        model_path = path
                        break
            
            if model_path and os.path.exists(model_path):
                self._load_model(model_path)
            else:
                logger.warning(
                    "⚠️ Liveness model not found. Anti-spoofing will be disabled. "
                    "Please download Silent-Face-Anti-Spoofing ONNX model."
                )
    
    def _load_model(self, model_path: str):
        """Load ONNX model"""
        try:
            logger.info(f"Loading liveness model from: {model_path}")
            
            # Tạo ONNX Runtime session (CPU-only)
            self.session = ort.InferenceSession(
                model_path,
                providers=['CPUExecutionProvider']
            )
            
            # Lấy input/output names
            model_inputs = self.session.get_inputs()
            model_outputs = self.session.get_outputs()
            if len(model_inputs) > 0:
                self.input_name = model_inputs[0].name
            else:
                self.input_name = None
            if len(model_outputs) > 0:
                self.output_name = model_outputs[0].name
            else:
                self.output_name = None

            # Determine model expected input size (H,W) if available
            try:
                inp_shape = model_inputs[0].shape  # e.g. [1, 3, H, W]
                # Some shapes contain None for batch dim; pick last two dims
                if inp_shape and len(inp_shape) >= 4:
                    h = inp_shape[-2]
                    w = inp_shape[-1]
                    # If dims are integers, set the input size for resize
                    if isinstance(h, int) and isinstance(w, int):
                        # cv2.resize expects (width, height)
                        self.INPUT_SIZE = (int(w), int(h))
                        logger.info(f"Detected model input size: {self.INPUT_SIZE} (W,H)")
            except Exception:
                logger.debug("Could not determine model input shape, using default INPUT_SIZE")
            
            logger.info("✅ Liveness model loaded successfully")
            logger.info(f"   Input: {self.input_name}, Output: {self.output_name}")
            
        except Exception as e:
            logger.error(f"Failed to load liveness model: {e}")
            self.session = None
    
    def _run_inference(self, face_crop: np.ndarray) -> float:
        """Thực hiện inference cho một ảnh cụ thể và trả về confidence"""
        # Preprocess ảnh (ensure RGB conversion and resize to model input)
        input_tensor = self._preprocess(face_crop)
        
        # Inference - ensure fresh computation each time
        outputs = self.session.run(
            [self.output_name],
            {self.input_name: input_tensor.copy()}
        )
        
        # Parse output
        output = np.array(outputs[0][0], dtype=np.float32)
        
        if output.size == 2:
            # 2-class output: [fake_score, real_score]
            if (np.any(output < 0) or np.any(output > 1)) or (not np.isclose(np.sum(output), 1.0, rtol=1e-3)):
                ex = np.exp(output - np.max(output))
                probs = ex / ex.sum()
            else:
                probs = output / np.sum(output)
            return float(probs[1])  # real_prob
        else:
            # 1-class output: logit or probability
            val = float(output[0])
            if val < 0.0 or val > 1.0:
                return float(1.0 / (1.0 + np.exp(-val)))
            return val

    def check_liveness(
        self, 
        face_image: np.ndarray,
        bbox: Optional[list] = None
    ) -> LivenessResult:
        """
        Kiểm tra ảnh có phải thật không bằng chiến lược đa tầng (Multi-pass)
        """
        if self.session is None:
            return LivenessResult(is_real=True, confidence=1.0, label="UNKNOWN", message="Liveness disabled")
        
        try:
            # 0. Kiểm tra chất lượng ảnh sơ bộ (Blur)
            # Nếu ảnh quá mờ, texture-based anti-spoofing sẽ sai lệch
            blur_score, is_sharp = face_quality_checker.check_blur(face_image)
            if not is_sharp:
                logger.warning(f"Liveness aborted: Image too blurry (score={blur_score:.2f})")
                return LivenessResult(
                    is_real=False, 
                    confidence=0.0, 
                    label="FAKE", 
                    message="Ảnh quá mờ, vui lòng giữ yên điện thoại khi chụp."
                )

            # 1. Cắt ảnh khuôn mặt (Crop)
            scale = 2.7
            if bbox is not None:
                x1, y1, x2, y2 = list(map(int, bbox))
                w, h = x2 - x1, y2 - y1
                cx, cy = x1 + w // 2, y1 + h // 2
                new_w, new_h = int(w * scale), int(h * scale)
                nx1, ny1 = int(cx - new_w // 2), int(cy - new_h // 2)
                nx2, ny2 = nx1 + new_w, ny1 + new_h

                cx1, cy1 = max(0, nx1), max(0, ny1)
                cx2, cy2 = min(face_image.shape[1], nx2), min(face_image.shape[0], ny2)
                face_crop_orig = face_image[cy1:cy2, cx1:cx2].copy()

                pad_left, pad_top = max(0, -nx1), max(0, -ny1)
                pad_right, pad_bottom = max(0, nx2 - face_image.shape[1]), max(0, ny2 - face_image.shape[0])
                if any([pad_left, pad_top, pad_right, pad_bottom]):
                    face_crop_orig = cv2.copyMakeBorder(face_crop_orig, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_REPLICATE)
            else:
                h, w = face_image.shape[:2]
                new_w, new_h = int(w * scale), int(h * scale)
                nx1, ny1 = int(w//2 - new_w//2), int(h//2 - new_h//2)
                nx2, ny2 = nx1 + new_w, ny1 + new_h

                pad_left, pad_top = max(0, -nx1), max(0, -ny1)
                pad_right, pad_bottom = max(0, nx2 - w), max(0, ny2 - h)
                padded = cv2.copyMakeBorder(face_image, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_REPLICATE)
                start_x, start_y = max(0, nx1 + pad_left), max(0, ny1 + pad_top)
                face_crop_orig = padded[start_y:start_y + new_h, start_x:start_x + new_w].copy()

            if face_crop_orig is None or face_crop_orig.size == 0:
                return LivenessResult(False, 0.0, "FAKE", "Empty crop")

            # --- CHIẾN LƯỢC MULTI-PASS (Gốc + CLAHE 2.0) ---
            
            # Pass 1: Ảnh gốc (Original)
            conf_orig = self._run_inference(face_crop_orig)
            
            # Pass 2: Ảnh qua CLAHE (Tăng chi tiết khối, mức 2.0)
            conf_clahe = 0.0
            try:
                # Chuyển đổi sang không gian màu LAB
                lab = cv2.cvtColor(face_crop_orig, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                
                # Áp dụng CLAHE vào kênh L (Lightness) với clipLimit=2.0
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l_clahe = clahe.apply(l)
                
                # Ghép lại và chuyển về BGR
                face_crop_clahe = cv2.cvtColor(cv2.merge((l_clahe, a, b)), cv2.COLOR_LAB2BGR)
                
                # Thực hiện inference ảnh qua CLAHE
                conf_clahe = self._run_inference(face_crop_clahe)
                
            except Exception as e:
                logger.warning(f"Lỗi khi chạy CLAHE: {e}. Bỏ qua pass CLAHE.")
            
            # Chọn kết quả tốt nhất giữa hai lần quét
            confidence = max(conf_orig, conf_clahe)
            
            is_real = confidence >= self.REAL_THRESHOLD
            label = "REAL" if is_real else "FAKE"
            
            if is_real:
                message = "Xác thực ảnh thật thành công"
            else:
                if confidence < 0.70:
                    message = "PHÁT HIỆN GIAN LẬN: Sử dụng ảnh in hoặc màn hình điện thoại."
                else:
                    message = "CẢNH BÁO GIAN LẬN: Hệ thống nghi ngờ ảnh không phải thực thể sống."
            
            logger.info(f"Liveness check: {label} (confidence={confidence:.2%})")
            
            return LivenessResult(
                is_real=is_real,
                confidence=confidence,
                label=label,
                message=message
            )

        except Exception as e:
            logger.error(f"Liveness error: {e}")
            return LivenessResult(False, 0.0, "ERROR", str(e))

    
    def _preprocess(self, face_image: np.ndarray) -> np.ndarray:
        """
        Tiền xử lý ảnh cho model (Chuẩn MiniFASNet)
        
        Args:
            face_image: Ảnh khuôn mặt (BGR)
        
        Returns:
            Tensor shape (1, 3, H, W)
        """
        if face_image.size == 0:
            raise ValueError("Empty face image passed to liveness preprocess")

        # Resize về kích thước model (80x80)
        # Sử dụng INTER_AREA chuyên dùng để thu nhỏ ảnh, tránh tạo ra nhiễu sọc răng cưa (Moiré giả)
        resized = cv2.resize(face_image, self.INPUT_SIZE, interpolation=cv2.INTER_AREA)

        # Convert BGR -> RGB (MiniFASNet expects RGB)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        # Chuẩn hóa về [0, 1]
        normalized = rgb.astype(np.float32) / 255.0
        
        # CHUẨN HÓA THEO IMAGENET (Bắt buộc cho model này)
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (normalized - mean) / std
        
        # Chuyển về (C, H, W)
        transposed = normalized.transpose(2, 0, 1)
        
        # Thêm batch dimension: (1, C, H, W)
        tensor = np.expand_dims(transposed, axis=0).copy()
        
        return tensor.astype(np.float32)
    
    def is_available(self) -> bool:
        """Kiểm tra model có sẵn không"""
        return self.session is not None


# Singleton instance
face_liveness_detector = FaceLivenessDetector()


# ============================================================================
# HƯỚNG DẪN SỬ DỤNG SILENT-FACE-ANTI-SPOOFING
# ============================================================================
"""
## Tải model ONNX:

1. Download từ GitHub:
   https://github.com/minivision-ai/Silent-Face-Anti-Spoofing

2. Các model ONNX phổ biến:
   - 2.7_80x80_MiniFASNetV2.onnx (nhẹ, nhanh)
   - 4_0_0_80x80_MiniFASNetV1SE.onnx (chính xác hơn)

3. Đặt vào thư mục:
   models/anti_spoofing/

4. Hoặc chỉ định path khi khởi tạo:
   detector = FaceLivenessDetector(model_path="path/to/model.onnx")

## Cài đặt:
   pip install onnxruntime  # hoặc onnxruntime-gpu

## Sử dụng:
   from app.services.face_liveness_service import face_liveness_detector
   
   result = face_liveness_detector.check_liveness(face_image)
   if result.is_real:
       print("Ảnh thật!")
   else:
       print("Ảnh giả mạo!")
"""

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
    
    # Ngưỡng confidence
    REAL_THRESHOLD = 0.4  # Nếu score > 0.4 => REAL, ngược lại => FAKE
    
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
    
    def check_liveness(
        self, 
        face_image: np.ndarray,
        bbox: Optional[list] = None
    ) -> LivenessResult:
        """
        Kiểm tra ảnh có phải thật không
        
        Args:
            face_image: Ảnh khuôn mặt (BGR format)
            bbox: Bounding box [x1, y1, x2, y2] để crop (optional)
        
        Returns:
            LivenessResult với đầy đủ thông tin
        """
        # Nếu không có model, trả về kết quả mặc định
        if self.session is None:
            logger.warning("Liveness model not loaded, skipping check")
            return LivenessResult(
                is_real=True,  # Mặc định cho qua
                confidence=1.0,
                label="UNKNOWN",
                message="Liveness detection disabled (model not found)"
            )
        
        try:
            # Crop face nếu có bbox. Use scale factor 2.7 required by MiniFASNetV2.
            scale = 2.7
            if bbox is not None:
                # Ensure bbox are ints
                x1, y1, x2, y2 = list(map(int, bbox))
                w = x2 - x1
                h = y2 - y1
                cx = x1 + w // 2
                cy = y1 + h // 2

                new_w = int(w * scale)
                new_h = int(h * scale)
                nx1 = int(cx - new_w // 2)
                ny1 = int(cy - new_h // 2)
                nx2 = nx1 + new_w
                ny2 = ny1 + new_h

                # Compute padding if out of bounds
                pad_left = max(0, -nx1)
                pad_top = max(0, -ny1)
                pad_right = max(0, nx2 - face_image.shape[1])
                pad_bottom = max(0, ny2 - face_image.shape[0])

                # Clamp coords to image
                cx1 = max(0, nx1)
                cy1 = max(0, ny1)
                cx2 = min(face_image.shape[1], nx2)
                cy2 = min(face_image.shape[0], ny2)

                logger.debug(f"Liveness crop coords pre-pad: nx1={nx1},ny1={ny1},nx2={nx2},ny2={ny2}")
                logger.debug(f"Clamped crop coords: cx1={cx1},cy1={cy1},cx2={cx2},cy2={cy2}, pads={(pad_left,pad_top,pad_right,pad_bottom)}")

                face_crop = face_image[cy1:cy2, cx1:cx2]

                # If padding needed, pad with black (constant) to avoid replicate artifacts
                if pad_left or pad_top or pad_right or pad_bottom:
                    face_crop = cv2.copyMakeBorder(
                        face_crop,
                        pad_top,
                        pad_bottom,
                        pad_left,
                        pad_right,
                        borderType=cv2.BORDER_CONSTANT,
                        value=[0, 0, 0]
                    )
            else:
                # If bbox not provided, treat face_image as crop and expand/pad by scale
                h, w = face_image.shape[:2]
                cx = w // 2
                cy = h // 2
                new_w = int(w * scale)
                new_h = int(h * scale)
                nx1 = int(cx - new_w // 2)
                ny1 = int(cy - new_h // 2)
                nx2 = nx1 + new_w
                ny2 = ny1 + new_h

                pad_left = max(0, -nx1)
                pad_top = max(0, -ny1)
                pad_right = max(0, nx2 - w)
                pad_bottom = max(0, ny2 - h)

                # pad original crop first (use black padding to avoid replicate stripes)
                padded = cv2.copyMakeBorder(
                    face_image,
                    pad_top,
                    pad_bottom,
                    pad_left,
                    pad_right,
                    borderType=cv2.BORDER_CONSTANT,
                    value=[0, 0, 0]
                )
                # then extract centered region
                start_x = max(0, nx1 + pad_left)
                start_y = max(0, ny1 + pad_top)
                face_crop = padded[start_y:start_y + new_h, start_x:start_x + new_w]

            # Validate crop
            if face_crop is None or face_crop.size == 0:
                logger.warning("Liveness crop is empty. Returning FAKE result to be safe.")
                return LivenessResult(is_real=False, confidence=0.0, label="FAKE", message="Empty crop for liveness check")

            # Preprocess ảnh (ensure RGB conversion and resize to model input)
            input_tensor = self._preprocess(face_crop)
            
            # Log input statistics for debugging
            logger.debug(f"Input tensor shape: {input_tensor.shape}, mean: {input_tensor.mean():.3f}, std: {input_tensor.std():.3f}")
            
            # Inference - ensure fresh computation each time
            # Force no caching by using new dict for inputs
            outputs = self.session.run(
                [self.output_name],
                {self.input_name: input_tensor.copy()}  # Use copy to avoid any state retention
            )
            
            # Parse output
            # Output shape thường là (1, 2) hoặc (1, 1)
            # Tùy model có thể khác nhau. ONNX often returns logits -> convert to probabilities.
            output = np.array(outputs[0][0], dtype=np.float32)
            logger.debug(f"Raw liveness model output: {output}")

            if output.size == 2:
                # 2-class output: [fake_score, real_score] format
                # Convert logits -> probabilities with softmax when needed
                # If values are already probabilities (sum ~= 1 and in [0,1]) we keep them.
                if (np.any(output < 0) or np.any(output > 1)) or (not np.isclose(np.sum(output), 1.0, rtol=1e-3)):
                    ex = np.exp(output - np.max(output))
                    probs = ex / ex.sum()
                else:
                    probs = output / np.sum(output)

                # Model outputs [fake_prob, real_prob]
                fake_prob = float(probs[0])  # Index 0 is FAKE
                real_prob = float(probs[1])  # Index 1 is REAL
                confidence = real_prob
                logger.debug(f"Liveness probs (fake,real): {(fake_prob, real_prob)}")
            else:
                # 1-class output: often a logit that needs sigmoid, or already a probability
                val = float(output[0])
                if val < 0.0 or val > 1.0:
                    # Apply sigmoid
                    confidence = float(1.0 / (1.0 + np.exp(-val)))
                else:
                    confidence = val
                logger.debug(f"Liveness single-output confidence: {confidence}")
            
            # Xác định REAL/FAKE
            is_real = confidence >= self.REAL_THRESHOLD
            label = "REAL" if is_real else "FAKE"
            
            if is_real:
                message = f"✅ Ảnh thật (confidence={confidence:.2%})"
            else:
                message = f"❌ Ảnh giả mạo (confidence={confidence:.2%})"
            
            logger.info(f"Liveness check: {label} (confidence={confidence:.2%})")
            
            return LivenessResult(
                is_real=is_real,
                confidence=confidence,
                label=label,
                message=message
            )
            
        except Exception as e:
            logger.error(f"Error in liveness check: {e}")
            # Trường hợp lỗi, báo lỗi và trả về kết quả không hợp lệ
            return LivenessResult(
                is_real=False,
                confidence=0.0,
                label="ERROR",
                message=f"Lỗi kiểm tra liveness: {str(e)}"
            )
    
    def _preprocess(self, face_image: np.ndarray) -> np.ndarray:
        """
        Tiền xử lý ảnh cho model
        
        Args:
            face_image: Ảnh khuôn mặt (BGR)
        
        Returns:
            Tensor đã chuẩn hóa shape (1, 3, H, W)
        """
        # Resize về kích thước model yêu cầu
        # If face_image is tiny, cv2.resize will upsample; ensure non-empty
        if face_image.size == 0:
            raise ValueError("Empty face image passed to liveness preprocess")

        resized = cv2.resize(face_image, self.INPUT_SIZE)

        # Convert BGR -> RGB (model expects RGB)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        # Chuẩn hóa về [0, 1]
        normalized = rgb.astype(np.float32) / 255.0
        
        # Chuẩn hóa theo ImageNet mean/std (nếu model yêu cầu)
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (normalized - mean) / std
        
        # Chuyển về (C, H, W)
        transposed = normalized.transpose(2, 0, 1)
        
        # Thêm batch dimension: (1, C, H, W)
        tensor = np.expand_dims(transposed, axis=0)
        
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

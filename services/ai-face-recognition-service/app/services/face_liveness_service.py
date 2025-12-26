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
    REAL_THRESHOLD = 0.5  # Nếu score > 0.5 => REAL, ngược lại => FAKE
    
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
                # Tìm trong thư mục dự án
                possible_paths = [
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
            
            # Tạo ONNX Runtime session
            self.session = ort.InferenceSession(
                model_path,
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
            )
            
            # Lấy input/output names
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            
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
            # Crop face nếu có bbox
            if bbox is not None:
                x1, y1, x2, y2 = bbox
                face_crop = face_image[y1:y2, x1:x2]
            else:
                face_crop = face_image
            
            # Preprocess ảnh
            input_tensor = self._preprocess(face_crop)
            
            # Inference
            outputs = self.session.run(
                [self.output_name],
                {self.input_name: input_tensor}
            )
            
            # Parse output
            # Output shape thường là (1, 2) hoặc (1, 1)
            # Tùy model có thể khác nhau
            output = outputs[0][0]
            
            if len(output) == 2:
                # 2-class output: [fake_score, real_score]
                fake_score = float(output[0])
                real_score = float(output[1])
                confidence = real_score
            else:
                # 1-class output: sigmoid(score)
                confidence = float(output[0])
            
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
            # Trường hợp lỗi, mặc định cho qua để không block user
            return LivenessResult(
                is_real=True,
                confidence=0.5,
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
        resized = cv2.resize(face_image, self.INPUT_SIZE)
        
        # Convert BGR -> RGB
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

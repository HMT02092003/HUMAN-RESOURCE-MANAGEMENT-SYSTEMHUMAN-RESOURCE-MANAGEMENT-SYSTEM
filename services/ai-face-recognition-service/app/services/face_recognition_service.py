"""
Face Recognition Service (Main Orchestrator)
Tích hợp InsightFace + Quality Check + Liveness Check
Singleton pattern để load model 1 lần duy nhất
"""

import cv2
import numpy as np
import logging
import os
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from insightface.app import FaceAnalysis

# Import các service khác
from .face_quality_service import face_quality_checker, QualityResult
from .face_liveness_service import face_liveness_detector, LivenessResult

logger = logging.getLogger(__name__)


@dataclass
class FaceData:
    """Dữ liệu khuôn mặt"""
    bbox: List[int]                    # [x1, y1, x2, y2]
    confidence: float                  # Độ tin cậy phát hiện
    embedding: List[float]             # 512-dim vector
    landmarks: List[List[int]]         # 5 điểm [[x, y], ...]
    age: Optional[int] = None          # Tuổi (nếu có)
    gender: Optional[str] = None       # Giới tính (nếu có)


@dataclass
class RecognitionResult:
    """Kết quả nhận diện hoàn chỉnh"""
    success: bool
    message: str
    face_data: Optional[FaceData] = None
    quality_result: Optional[QualityResult] = None
    liveness_result: Optional[LivenessResult] = None
    
    def to_dict(self) -> Dict:
        """Convert sang dict để return API"""
        result = {
            'success': self.success,
            'message': self.message
        }
        
        if self.face_data:
            result['face_data'] = asdict(self.face_data)
        
        if self.quality_result:
            result['quality'] = asdict(self.quality_result)
        
        if self.liveness_result:
            result['liveness'] = asdict(self.liveness_result)
        
        return result


class FaceRecognizer:
    """
    Main Face Recognition Service
    - Khởi tạo InsightFace model 1 lần duy nhất
    - Pipeline: Detect -> Quality Check -> Liveness Check -> Extract Embedding
    - Singleton pattern
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(FaceRecognizer, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """
        Khởi tạo Face Recognizer.
        Model KHÔNG được load ở đây — gọi initialize() để load.
        """
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.app = None
            
            # Use thresholds from central config
            from app.config.rate_config import MIN_THRESHOLD, SAFE_THRESHOLD
            self.min_threshold = float(MIN_THRESHOLD)
            self.safe_threshold = float(SAFE_THRESHOLD)
            
            # Legacy fields (kept for compatibility with other services)
            self.enable_quality_check = True
            self.enable_liveness_check = True
            self.model_name = 'buffalo_l'
            
            logger.info("✅ [AI] FaceRecognizer singleton created (models not loaded yet)")

    def initialize(self):
        """
        Load InsightFace models vào RAM.
        Gọi từ main.py lifespan, KHÔNG gọi lúc import.
        """
        if self.app is not None:
            logger.info("ℹ️ [AI] InsightFace already loaded, skipping")
            return self.app
            
        logger.info(f"⏳ [AI] Loading InsightFace model: {self.model_name} ...")
        try:
            root_path = os.path.expanduser("~/.insightface")
            model_dir = os.path.join(root_path, "models", self.model_name)
            
            # Kiểm tra model tồn tại
            if not os.path.isdir(model_dir):
                logger.error(f"❌ [AI] Model directory NOT FOUND: {model_dir}")
                logger.error(f"   Listing {os.path.join(root_path, 'models')}: "
                             f"{os.listdir(os.path.join(root_path, 'models')) if os.path.isdir(os.path.join(root_path, 'models')) else 'DIR NOT EXIST'}")
                return None
            
            self.app = FaceAnalysis(
                name=self.model_name,
                root=root_path
            )
            
            # ctx_id=-1 = CPU only, det_size=(640,640) cho cân bằng RAM/accuracy
            self.app.prepare(ctx_id=-1, det_thresh=0.05, det_size=(640, 640))
            
            logger.info("✅ [AI] InsightFace loaded successfully!")
            return self.app
            
        except Exception as e:
            logger.error(f"❌ [AI] Failed to load InsightFace: {e}", exc_info=True)
            self.app = None
            return None

    def _ensure_ready(self):
        """Fallback: nếu app chưa load thì tự load"""
        if self.app is None:
            self.initialize()
        return self.app is not None
    
    def process_face(
        self,
        image: np.ndarray,
        skip_quality_check: bool = False,
        skip_liveness_check: bool = False
    ) -> RecognitionResult:
        """
        Xử lý nhận diện khuôn mặt (MAIN PIPELINE)
        
        Pipeline:
        1. Detect face bằng InsightFace
        2. Quality check (blur, brightness, head pose)
        3. Liveness check (anti-spoofing)
        4. Extract embedding nếu qua hết
        """
        try:
            # Ensure models are loaded
            if not self._ensure_ready():
                return RecognitionResult(
                    success=False,
                    message="Hệ thống AI chưa sẵn sàng. Vui lòng thử lại."
                )

            # === STEP 1: DETECT FACE ===
            logger.info("🔍 Step 1: Detecting face...")
            faces = self.app.get(image)

            if len(faces) == 0:
                logger.warning("No face detected")
                return RecognitionResult(
                    success=False,
                    message="Không phát hiện khuôn mặt trong ảnh"
                )
            # Nếu có nhiều face, chọn face LỚN NHẤT
            if len(faces) > 1:
                logger.info(f"Multiple faces detected: {len(faces)}")
                faces = sorted(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)

            face = faces[0]
            bbox = face.bbox.astype(int).tolist()
            landmarks = face.kps.astype(int).tolist()

            logger.info(f"✅ Face detected: bbox={bbox}, confidence={face.det_score:.3f}")
            
            # === STEP 2: LIVENESS CHECK ===
            liveness_result = None
            if self.enable_liveness_check and not skip_liveness_check:
                logger.info("🔍 Step 2: Liveness check...")
                liveness_result = face_liveness_detector.check_liveness(
                    face_image=image,
                    bbox=bbox
                )

                if not liveness_result.is_real:
                    logger.warning(f"Liveness check failed: {liveness_result.message}")
                    return RecognitionResult(
                        success=False,
                        message=liveness_result.message,
                        quality_result=None,
                        liveness_result=liveness_result
                    )

                logger.info("✅ Liveness check passed")

            # === STEP 3: QUALITY CHECK ===
            quality_result = None
            if self.enable_quality_check and not skip_quality_check:
                logger.info("🔍 Step 3: Quality check...")
                quality_result = face_quality_checker.check_all(
                    image=image,
                    landmarks=face.kps
                )
                
                if not quality_result.is_valid:
                    logger.warning(f"Quality check failed: {quality_result.messages}")
                    return RecognitionResult(
                        success=False,
                        message=f"Chất lượng ảnh không đạt: {'; '.join(quality_result.messages)}",
                        quality_result=quality_result,
                        liveness_result=liveness_result
                    )
                
                logger.info("✅ Quality check passed")
            
            # === STEP 4: EXTRACT EMBEDDING ===
            logger.info("🔍 Step 4: Extracting embedding...")
            embedding = face.embedding.tolist()
            
            face_data = FaceData(
                bbox=bbox,
                confidence=float(face.det_score),
                embedding=embedding,
                landmarks=landmarks,
                age=int(face.age) if hasattr(face, 'age') else None,
                gender='Male' if (hasattr(face, 'gender') and face.gender == 1) else 'Female' if hasattr(face, 'gender') else None
            )
            
            logger.info("✅ Face recognition completed successfully!")
            
            return RecognitionResult(
                success=True,
                message="Nhận diện khuôn mặt thành công",
                face_data=face_data,
                quality_result=quality_result,
                liveness_result=liveness_result
            )
            
        except Exception as e:
            logger.error(f"❌ Error in face recognition: {e}", exc_info=True)
            return RecognitionResult(
                success=False,
                message=f"Lỗi xử lý: {str(e)}"
            )
    
    def get_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """Trích xuất embedding trực tiếp (không check quality/liveness)"""
        try:
            if not self._ensure_ready():
                return None
            faces = self.app.get(image)
            if len(faces) == 0:
                return None
            return faces[0].embedding
        except Exception as e:
            logger.error(f"Error extracting embedding: {e}")
            return None
    
    def compare_faces(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
        threshold: float = 0.4
    ) -> Dict:
        """So sánh 2 embedding (Cosine Similarity)"""
        try:
            emb1 = embedding1 / np.linalg.norm(embedding1)
            emb2 = embedding2 / np.linalg.norm(embedding2)
            similarity = float(np.dot(emb1, emb2))
            
            return {
                'similarity': similarity,
                'is_same_person': similarity >= threshold,
                'threshold': threshold
            }
        except Exception as e:
            logger.error(f"Error comparing faces: {e}")
            return {
                'similarity': 0.0,
                'is_same_person': False,
                'error': str(e)
            }
    
    def detect_multiple_faces(self, image: np.ndarray) -> List[FaceData]:
        """Phát hiện nhiều khuôn mặt trong 1 ảnh"""
        try:
            if not self._ensure_ready():
                return []
            faces = self.app.get(image)
            
            results = []
            for face in faces:
                face_data = FaceData(
                    bbox=face.bbox.astype(int).tolist(),
                    confidence=float(face.det_score),
                    embedding=face.embedding.tolist(),
                    landmarks=face.kps.astype(int).tolist(),
                    age=int(face.age) if hasattr(face, 'age') else None,
                    gender='Male' if (hasattr(face, 'gender') and face.gender == 1) else 'Female' if hasattr(face, 'gender') else None
                )
                results.append(face_data)
            
            return results
        except Exception as e:
            logger.error(f"Error detecting multiple faces: {e}")
            return []
    
    def process_face_with_ui(
        self,
        image: np.ndarray,
        skip_quality_check: bool = False,
        skip_liveness_check: bool = False,
        draw_guide: bool = True
    ) -> Tuple[RecognitionResult, np.ndarray]:
        """Xử lý nhận diện KÈM VẼ UI"""
        from app.utils.face_ui_helper import face_ui
        
        result = self.process_face(image, skip_quality_check, skip_liveness_check)
        annotated = image.copy()
        
        if draw_guide:
            annotated = face_ui.draw_center_guide(annotated)
        
        if result.face_data:
            bbox = result.face_data.bbox
            
            if result.success:
                status = "good"
                message = "✓ Vị trí tốt! Đang nhận diện..."
            else:
                if result.quality_result:
                    message, status = face_ui.generate_instruction_message(
                        result.quality_result.details
                    )
                else:
                    status = "bad"
                    message = result.message
            
            quality_info = result.quality_result.details if result.quality_result else None
            annotated = face_ui.draw_face_box_with_status(
                annotated,
                bbox,
                status,
                message,
                quality_info
            )
        else:
            annotated = face_ui.draw_instruction_message(
                annotated,
                "⚠ Không tìm thấy khuôn mặt",
                position="top",
                color=face_ui.COLOR_RED
            )
        
        return result, annotated


# ============================================================================
# SINGLETON INSTANCE — tạo object nhưng KHÔNG load model
# ============================================================================
face_recognizer = FaceRecognizer()

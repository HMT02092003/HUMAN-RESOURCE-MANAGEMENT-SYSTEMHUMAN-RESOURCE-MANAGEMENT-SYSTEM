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
    
    def __init__(
        self,
        model_name: str = 'buffalo_l',
        det_size: Tuple[int, int] = (640, 640),
        enable_quality_check: bool = True,
        enable_liveness_check: bool = True
    ):
        """
        Khởi tạo Face Recognizer
        
        Args:
            model_name: Model InsightFace (buffalo_l, buffalo_s, ...)
            det_size: Kích thước detection (width, height)
            enable_quality_check: Bật kiểm tra chất lượng
            enable_liveness_check: Bật kiểm tra liveness
        """
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.model_name = model_name
            self.det_size = det_size
            self.enable_quality_check = enable_quality_check
            self.enable_liveness_check = enable_liveness_check
            self.app = None
            
            logger.info("🚀 Initializing FaceRecognizer...")
            self._initialize_insightface()
    
    def _initialize_insightface(self):
        """Khởi tạo InsightFace model"""
        try:
            # Khởi tạo FaceAnalysis (CPU-only)
            logger.info(f"📦 Loading InsightFace model (CPU-only): {self.model_name}")
            # Force CPU context
            self.app = FaceAnalysis(
                name=self.model_name,
                root=os.path.expanduser("~/.insightface")
            )

            # Always prepare with CPU ctx_id = -1, lower det_thresh to 0.35 to allow MASK angle detection
            self.app.prepare(ctx_id=-1, det_thresh=0.35, det_size=self.det_size)
            
            logger.info("✅ FaceRecognizer initialized successfully!")
            logger.info(f"   Detection size: {self.det_size}")
            logger.info(f"   Quality check: {'ON' if self.enable_quality_check else 'OFF'}")
            logger.info(f"   Liveness check: {'ON' if self.enable_liveness_check else 'OFF'}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize InsightFace: {e}")
            raise RuntimeError(f"Cannot initialize FaceRecognizer: {e}")
    
    def _get_providers(self) -> List[str]:
        """Xác định execution providers"""
        try:
            import onnxruntime as ort
            # Force CPU-only to avoid GPU/CUDA usage in this deployment
            available = ort.get_available_providers()
            logger.info(f"ONNX available providers: {available}")
            logger.info("💻 Forcing CPUExecutionProvider only")
            return ['CPUExecutionProvider']
        except:
            return ['CPUExecutionProvider']
    
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
        
        Args:
            image: Ảnh đầu vào (BGR format)
            skip_quality_check: Bỏ qua kiểm tra chất lượng
            skip_liveness_check: Bỏ qua kiểm tra liveness
        
        Returns:
            RecognitionResult với đầy đủ thông tin
        """
        try:
            # === STEP 1: DETECT FACE ===
            logger.info("🔍 Step 1: Detecting face...")
            faces = self.app.get(image)

            if len(faces) == 0:
                logger.warning("No face detected")
                return RecognitionResult(
                    success=False,
                    message="Không phát hiện khuôn mặt trong ảnh"
                )
            # Nếu có nhiều face, log thông tin và chọn face LỚN NHẤT (gần camera nhất)
            if len(faces) > 1:
                logger.info(f"Multiple faces detected: {len(faces)}")
                # Log each bbox and its computed area for debugging
                try:
                    face_areas = []
                    for i, f in enumerate(faces):
                        x1, y1, x2, y2 = f.bbox.astype(int).tolist()
                        area = (x2 - x1) * (y2 - y1)
                        face_areas.append((i, x1, y1, x2, y2, area, float(getattr(f, 'det_score', 0.0))))
                        logger.debug(f"  Face[{i}] bbox={(x1,y1,x2,y2)} area={area} score={getattr(f,'det_score',0.0):.3f}")
                    # Sort faces by area desc to be explicit
                    faces = sorted(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
                except Exception:
                    logger.exception("Failed to compute face areas; falling back to max selection")

            # Chọn mặt có diện tích lớn nhất (deterministic after sort)
            target_face = faces[0]

            face = target_face
            bbox = face.bbox.astype(int).tolist()
            landmarks = face.kps.astype(int).tolist()

            logger.info(f"✅ Face detected (selected largest): bbox={bbox}, confidence={face.det_score:.3f}")
            
            # === STEP 2: QUALITY CHECK ===
            quality_result = None
            if self.enable_quality_check and not skip_quality_check:
                logger.info("🔍 Step 2: Quality check...")
                quality_result = face_quality_checker.check_all(
                    image=image,
                    landmarks=face.kps  # numpy array (5, 2)
                )
                
                if not quality_result.is_valid:
                    logger.warning(f"Quality check failed: {quality_result.messages}")
                    return RecognitionResult(
                        success=False,
                        message=f"Chất lượng ảnh không đạt: {'; '.join(quality_result.messages)}",
                        quality_result=quality_result
                    )
                
                logger.info("✅ Quality check passed")
            
            # === STEP 3: LIVENESS CHECK ===
            liveness_result = None
            if self.enable_liveness_check and not skip_liveness_check:
                logger.info("🔍 Step 3: Liveness check...")

                # IMPORTANT: pass the full image + bbox to liveness detector
                # so the detector can expand the crop (e.g. 2.7x) and see
                # contextual cues like screen edges or paper borders.
                # Previously we cropped tightly here which hid those cues.
                liveness_result = face_liveness_detector.check_liveness(
                    face_image=image,
                    bbox=bbox
                )

                if not liveness_result.is_real:
                    logger.warning(f"Liveness check failed: {liveness_result.message}")
                    return RecognitionResult(
                        success=False,
                        message=liveness_result.message,
                        quality_result=quality_result,
                        liveness_result=liveness_result
                    )

                logger.info("✅ Liveness check passed")
            
            # === STEP 4: EXTRACT EMBEDDING ===
            logger.info("🔍 Step 4: Extracting embedding...")
            embedding = face.embedding.tolist()  # 512-dim vector
            
            # Tạo face data
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
        """
        Trích xuất embedding trực tiếp (không check quality/liveness)
        Sử dụng cho các trường hợp đã có ảnh sạch
        
        Args:
            image: Ảnh đầu vào (BGR)
        
        Returns:
            Embedding vector (512-dim) hoặc None
        """
        try:
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
        """
        So sánh 2 embedding (Cosine Similarity)
        
        Args:
            embedding1: Embedding thứ nhất
            embedding2: Embedding thứ hai
            threshold: Ngưỡng để coi là cùng người (0.4-0.6 tùy use case)
        
        Returns:
            Dict với similarity và is_same_person
        """
        try:
            # Normalize embeddings
            emb1 = embedding1 / np.linalg.norm(embedding1)
            emb2 = embedding2 / np.linalg.norm(embedding2)
            
            # Cosine similarity
            similarity = float(np.dot(emb1, emb2))
            
            is_same = similarity >= threshold
            
            return {
                'similarity': similarity,
                'is_same_person': is_same,
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
        """
        Phát hiện nhiều khuôn mặt trong 1 ảnh
        
        Args:
            image: Ảnh đầu vào
        
        Returns:
            List các FaceData
        """
        try:
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
        """
        Xử lý nhận diện KÈM VẼ UI (khung màu xanh/đỏ + text hướng dẫn)
        
        Args:
            image: Ảnh đầu vào
            skip_quality_check: Bỏ qua quality check
            skip_liveness_check: Bỏ qua liveness check
            draw_guide: Vẽ khung hướng dẫn oval ở giữa
        
        Returns:
            (result, annotated_image) - Kết quả + ảnh đã vẽ UI
        """
        from app.utils.face_ui_helper import face_ui
        
        # Process nhận diện
        result = self.process_face(image, skip_quality_check, skip_liveness_check)
        
        # Vẽ UI
        annotated = image.copy()
        
        # Vẽ khung oval hướng dẫn (nếu bật)
        if draw_guide:
            annotated = face_ui.draw_center_guide(annotated)
        
        # Nếu có face data
        if result.face_data:
            bbox = result.face_data.bbox
            
            # Xác định status và message
            if result.success:
                status = "good"
                message = "✓ Vị trí tốt! Đang nhận diện..."
            else:
                # Có face nhưng không pass quality/liveness
                if result.quality_result:
                    message, status = face_ui.generate_instruction_message(
                        result.quality_result.details
                    )
                else:
                    status = "bad"
                    message = result.message
            
            # Vẽ khung face với status
            quality_info = result.quality_result.details if result.quality_result else None
            annotated = face_ui.draw_face_box_with_status(
                annotated,
                bbox,
                status,
                message,
                quality_info
            )
        else:
            # Không detect được face
            annotated = face_ui.draw_instruction_message(
                annotated,
                "⚠ Không tìm thấy khuôn mặt",
                position="top",
                color=face_ui.COLOR_RED
            )
        
        return result, annotated


# ============================================================================
# SINGLETON INSTANCE - Khởi tạo 1 lần duy nhất khi import
# ============================================================================
face_recognizer = FaceRecognizer()


# ============================================================================
# USAGE EXAMPLES
# ============================================================================
"""
## Sử dụng trong FastAPI route:

from app.services.face_recognition_service import face_recognizer

@router.post("/recognize")
async def recognize_face(file: UploadFile):
    # Đọc ảnh
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Xử lý nhận diện
    result = face_recognizer.process_face(image)
    
    if result.success:
        return {
            "success": True,
            "embedding": result.face_data.embedding,
            "quality": result.quality_result.details,
            "liveness": result.liveness_result.label
        }
    else:
        return {
            "success": False,
            "error": result.message
        }

## So sánh 2 ảnh:

result1 = face_recognizer.process_face(image1)
result2 = face_recognizer.process_face(image2)

if result1.success and result2.success:
    comparison = face_recognizer.compare_faces(
        np.array(result1.face_data.embedding),
        np.array(result2.face_data.embedding),
        threshold=0.5
    )
    
    if comparison['is_same_person']:
        print(f"Cùng 1 người! Similarity: {comparison['similarity']:.2%}")
"""

"""
Batch Image Processor - Face Enrollment với Soft Filter & Ranking
=================================================================
Xử lý batch images từ camera điện thoại tầm trung (Mi 10T Lite)
Chiến lược: Chấp nhận ảnh không hoàn hảo, lọc mềm và chọn Top K
"""

import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO
from PIL import Image
from .face_liveness_service import face_liveness_detector

logger = logging.getLogger(__name__)

# ===== CẤU HÌNH QUAN TRỌNG =====
MIN_FACE_SIZE = 50  # Kích thước mặt tối thiểu (pixel) - Giảm nhẹ để bắt được mặt khi quay
MIN_DETECTION_SCORE = 0.60  # Ngưỡng detection chặt chẽ hơn cho các trường hợp bình thường
MIN_DETECTION_SCORE_MASK = 0.05  # Ngưỡng nới lỏng riêng cho trường hợp đeo khẩu trang
MIN_BLUR_SCORE = 30.0  # Laplacian variance tối thiểu - Giảm nhẹ để chống rung video
# Ngưỡng liveness check thắt chặt theo yêu cầu
MIN_LIVENESS_CONFIDENCE = 0.80 
TOP_K_IMAGES = 7  # Lấy top 7 ảnh tốt nhất (default cho single video)
TOP_K_IMAGES_MULTI = 15  # Lấy top 15 cho multi-angle (có nhiều frames hơn)
MIN_IMAGES_AFTER_FILTER = 1  # Số ảnh tối thiểu sau khi lọc - Cho phép qua dù chỉ có 1 vài frame tốt
OPTIMAL_IMAGE_WIDTH = 640  # Resize ảnh về 640px width

# ===== YAW ANGLE RANGES (Góc quay mặt) =====
ANGLE_RANGES = {
    # Center rộng hơn để chấp nhận sai số nhẹ
    'CENTER': (-20, 20),      # Chính diện: -20° đến +20°
    # Yêu cầu quay tối thiểu 10° để đảm bảo góc rõ ràng
    'LEFT': (10, 50),         # Quay trái: +10° đến +50°
    'RIGHT': (-50, -10),      # Quay phải: -50° đến -10°
    'MASK': (-15, 15)         # Khẩu trang (chính diện): -15° đến +15°
}

class BatchImageProcessor:
    """
    Processor xử lý batch images với logic Soft Filter & Ranking
    """
    
    def __init__(self, face_service):
        """
        Args:
            face_service: InsightFace service instance
        """
        self.face_service = face_service
        logger.info(f"📦 BatchImageProcessor initialized")
    
    def check_angle_match(self, yaw_angle: float, angle_type: str) -> bool:
        """
        Kiểm tra xem góc quay có khớp với angle_type không
        
        Args:
            yaw_angle: Góc yaw của khuôn mặt (-90 đến +90)
            angle_type: Loại góc mong muốn (CENTER, LEFT, RIGHT, MASK)
            
        Returns:
            bool: True nếu góc khớp với yêu cầu
        """
        if angle_type not in ANGLE_RANGES:
            return True  # Không filter nếu không có config
        
        min_angle, max_angle = ANGLE_RANGES[angle_type]
        return min_angle <= yaw_angle <= max_angle
    
    def preprocess_image(self, img_bytes: bytes) -> np.ndarray:
        """
        Tiền xử lý ảnh: Resize và giảm noise
        
        Args:
            img_bytes: Raw image bytes
            
        Returns:
            np.ndarray: Processed image array (BGR format)
        """
        try:
            # Load image
            img = Image.open(BytesIO(img_bytes))
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize nếu quá lớn (giữ tỉ lệ)
            width, height = img.size
            if width > OPTIMAL_IMAGE_WIDTH:
                new_height = int(height * (OPTIMAL_IMAGE_WIDTH / width))
                img = img.resize((OPTIMAL_IMAGE_WIDTH, new_height), Image.Resampling.LANCZOS)
            
            # Convert to numpy array (BGR for OpenCV)
            img_array = np.array(img)
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            return img_array
            
        except Exception as e:
            logger.error(f"❌ Preprocess error: {e}")
            return None
    
    def calculate_blur_score(self, img_array: np.ndarray) -> float:
        """
        Tính điểm độ nét bằng Laplacian Variance
        
        Args:
            img_array: Image array (BGR)
            
        Returns:
            float: Blur score (càng cao càng nét)
        """
        try:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            return laplacian_var
        except Exception as e:
            logger.error(f"❌ Blur score calculation error: {e}")
            return 0.0
    
    def detect_and_score_face(
        self, 
        img_array: np.ndarray, 
        img_index: int,
        angle_type: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        BƯỚC 2.1 & 2.2: Face Detection + Basic Check + Scoring
        
        Args:
            img_array: Image array
            img_index: Image index for logging
            
        Returns:
            (is_valid, face_data, rejection_reason): Tuple of validation status, face data, and rejection reason
        """
        try:
            # Step 1: Detect faces
            faces = self.face_service.app.get(img_array)
            
            if not faces or len(faces) == 0:
                logger.debug(f"❌ Image {img_index}: No face detected")
                return False, None, "no_face"
            
            if len(faces) > 1:
                logger.debug(f"❌ Image {img_index}: Multiple faces detected ({len(faces)})")
                return False, None, "multiple_faces"
            
            face = faces[0]
            
            # Step 2: Check face size
            bbox = face.bbox
            face_width = bbox[2] - bbox[0]
            face_height = bbox[3] - bbox[1]
            
            if face_width < MIN_FACE_SIZE or face_height < MIN_FACE_SIZE:
                logger.debug(f"❌ Image {img_index}: Face too small ({face_width}x{face_height})")
                return False, None, "too_small"
            
            # Step 3: Check detection score
            detection_score = face.det_score
            required_det_score = MIN_DETECTION_SCORE_MASK if angle_type == 'MASK' else MIN_DETECTION_SCORE
            if detection_score < required_det_score:
                logger.debug(f"❌ Image {img_index}: Low detection score ({detection_score:.3f} < {required_det_score})")
                return False, None, "low_detection"
            
            # Step 4: Calculate blur score
            blur_score = self.calculate_blur_score(img_array)
            if blur_score < MIN_BLUR_SCORE:
                logger.debug(f"❌ Image {img_index}: Too blurry ({blur_score:.2f})")
                return False, None, "too_blurry"
            
            # Step 5: Liveness Check (Anti-spoofing) - Nới lỏng cho góc nghiêng
            # Important: pass a copy of img_array to avoid any caching issues
            liveness_result = face_liveness_detector.check_liveness(
                img_array.copy(), 
                bbox.astype(int).tolist()
            )
            
            # Chỉ check liveness gắt gao nếu đang xử lý ảnh chính diện tĩnh,
            # Tuy nhiên batch processing chủ yếu dùng cho video quay ngang/mặt nạ nên ta dùng ngưỡng thấp
            if liveness_result.confidence < MIN_LIVENESS_CONFIDENCE:
                logger.debug(
                    f"❌ Image {img_index}: Liveness check failed - "
                    f"{liveness_result.label} (confidence: {liveness_result.confidence:.3f})"
                )
                return False, None, "fake_detected"
            
            # Step 6: Calculate Quality Score
            # Formula: QualityScore = (DetectionScore * 0.4) + (BlurScore * 0.6)
            # Normalize blur_score to 0-1 range (assume max blur is 500)
            normalized_blur = min(blur_score / 500.0, 1.0)
            quality_score = (detection_score * 0.4) + (normalized_blur * 0.6)
            
            # Crop face for display/dataset
            x1, y1, x2, y2 = bbox.astype(int)
            h, w = img_array.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            cropped_face = img_array[y1:y2, x1:x2].copy()

            # Extract yaw angle(s) if available (pose may be [yaw, pitch, roll] or [pitch, yaw, roll])
            yaw_angle = 0.0
            yaw_candidates = []
            if hasattr(face, 'pose') and face.pose is not None and len(face.pose) > 0:
                try:
                    # Collect all numeric pose elements as possible yaw candidates
                    yaw_candidates = [float(x) for x in face.pose if x is not None]
                    # Keep a primary yaw for backward compatibility (first element)
                    yaw_angle = yaw_candidates[0] if len(yaw_candidates) > 0 else 0.0
                except Exception:
                    yaw_candidates = [0.0]
                    yaw_angle = 0.0
            
            face_data = {
                "embedding": face.embedding,
                "quality_score": quality_score,
                "detection_score": detection_score,
                "blur_score": blur_score,
                "liveness_confidence": liveness_result.confidence,
                "is_real": liveness_result.is_real,
                "yaw_angle": yaw_angle,
                "yaw_angle_candidates": yaw_candidates,
                "face_size": (face_width, face_height),
                "index": img_index,
                "cropped_face": cropped_face
            }
            
            logger.debug(
                f"✅ Image {img_index}: Valid face - "
                f"Quality={quality_score:.3f}, Det={detection_score:.3f}, "
                f"Blur={blur_score:.2f}, Liveness={liveness_result.confidence:.3f}, Yaw={yaw_angle:.1f}°"
            )
            
            return True, face_data, None
            
        except Exception as e:
            logger.error(f"❌ Error processing image {img_index}: {e}")
            return False, None, "processing_error"
    
    def process_batch(self, images_bytes: List[bytes]) -> Dict[str, Any]:
        """
        MAIN PROCESSING PIPELINE
        ========================
        
        Step 1: Input Processing & Preprocessing
        Step 2: Filtering với Soft Filter & Ranking
        Step 3: Vectorization & Averaging
        
        Args:
            images_bytes: List of image bytes
            
        Returns:
            Dict with success status, vector, and metadata
        """
        logger.info(f"🚀 Starting batch processing for {len(images_bytes)} images")
        
        valid_faces = []
        
        # Track rejection reasons for detailed error reporting
        rejection_stats = {
            "no_face": 0,
            "multiple_faces": 0,
            "too_small": 0,
            "low_detection": 0,
            "too_blurry": 0,
            "fake_detected": 0,
            "preprocessing_failed": 0
        }
        
        # ===== STEP 1: Input Processing =====
        for idx, img_bytes in enumerate(images_bytes):
            # Preprocess
            img_array = self.preprocess_image(img_bytes)
            if img_array is None:
                logger.warning(f"⚠️ Image {idx}: Preprocessing failed")
                rejection_stats["preprocessing_failed"] += 1
                continue
            
            # Detect and score (with detailed rejection tracking)
            is_valid, face_data, rejection_reason = self.detect_and_score_face(img_array, idx)
            if is_valid and face_data:
                valid_faces.append(face_data)
            elif rejection_reason:
                rejection_stats[rejection_reason] = rejection_stats.get(rejection_reason, 0) + 1
        
        logger.info(f"📊 Filtering results: {len(valid_faces)}/{len(images_bytes)} images passed")
        
        # ===== STEP 2.3: Selection (Safety Net) =====
        if len(valid_faces) < MIN_IMAGES_AFTER_FILTER:
            # Build detailed error message
            error_details = []
            if rejection_stats["fake_detected"] > 0:
                error_details.append(f"🚫 {rejection_stats['fake_detected']} frames bị phát hiện là ảnh giả (màn hình/ảnh in)")
            if rejection_stats["too_blurry"] > 0:
                error_details.append(f"😵 {rejection_stats['too_blurry']} frames quá mờ")
            if rejection_stats["no_face"] > 0:
                error_details.append(f"👤 {rejection_stats['no_face']} frames không thấy khuôn mặt")
            if rejection_stats["multiple_faces"] > 0:
                error_details.append(f"👥 {rejection_stats['multiple_faces']} frames có nhiều người")
            if rejection_stats["too_small"] > 0:
                error_details.append(f"🔍 {rejection_stats['too_small']} frames khuôn mặt quá nhỏ")
            
            error_message = f"❌ Chất lượng video không đủ. Chỉ {len(valid_faces)}/{len(images_bytes)} frames đạt yêu cầu.\n\n"
            if error_details:
                error_message += "Chi tiết:\n" + "\n".join(error_details)
                error_message += "\n\n💡 Khuyến nghị:\n"
                if rejection_stats["fake_detected"] > 0:
                    error_message += "• Quay video thật, KHÔNG dùng ảnh trên màn hình/giấy in\n"
                if rejection_stats["too_blurry"] > 0:
                    error_message += "• Giữ điện thoại ổn định, lau sạch camera\n"
                if rejection_stats["no_face"] > 0 or rejection_stats["too_small"] > 0:
                    error_message += "• Đưa mặt gần camera hơn, đảm bảo ánh sáng đủ\n"
            
            return {
                "success": False,
                "message": error_message,
                "error_code": "INSUFFICIENT_QUALITY",
                "metadata": {
                    "total_images": len(images_bytes),
                    "valid_images": len(valid_faces),
                    "required_minimum": MIN_IMAGES_AFTER_FILTER,
                    "rejection_stats": rejection_stats
                }
            }
        
        # Sort by quality score (descending)
        valid_faces.sort(key=lambda x: x["quality_score"], reverse=True)
        
        # Take top K images
        top_k_faces = valid_faces[:TOP_K_IMAGES]
        
        logger.info(f"🎯 Selected top {len(top_k_faces)} images for averaging")
        
        # ===== STEP 3: Vectorization & Averaging =====
        
        # Step 3.1: Extract embeddings (already extracted)
        embeddings = np.array([face["embedding"] for face in top_k_faces])
        
        # Step 3.2: Average
        mean_embedding = np.mean(embeddings, axis=0)
        
        # Step 3.3: L2 Normalization (CRITICAL!)
        norm = np.linalg.norm(mean_embedding)
        if norm == 0:
            return {
                "success": False,
                "message": "Lỗi khi tính vector trung bình (norm = 0)",
                "metadata": {}
            }
        
        final_embedding = mean_embedding / norm
        
        # Convert to list for JSON serialization
        final_embedding_list = final_embedding.tolist()
        
        # Calculate metadata
        scores = [face["quality_score"] for face in top_k_faces]
        average_quality = np.mean(scores)
        min_quality = np.min(scores)
        max_quality = np.max(scores)
        
        yaw_angles = [face["yaw_angle"] for face in top_k_faces]
        yaw_diversity = np.std(yaw_angles)  # Standard deviation as diversity measure
        
        logger.info(
            f"✅ Batch processing successful - "
            f"Avg Quality: {average_quality:.3f}, "
            f"Quality Range: [{min_quality:.3f}, {max_quality:.3f}], "
            f"Yaw Diversity: {yaw_diversity:.2f}°"
        )
        
        return {
            "success": True,
            "vector": final_embedding_list,
            "best_cropped_face": top_k_faces[0].get("cropped_face") if top_k_faces else None,
            "top_k_cropped_faces": [f.get("cropped_face") for f in top_k_faces],
            "message": f"Đã xử lý thành công {len(top_k_faces)}/{len(images_bytes)} ảnh tốt nhất",
            "metadata": {
                "total_images": len(images_bytes),
                "valid_images": len(valid_faces),
                "selected_images": len(top_k_faces),
                "average_quality_score": float(average_quality),
                "min_quality_score": float(min_quality),
                "max_quality_score": float(max_quality),
                "yaw_diversity": float(yaw_diversity),
                "quality_scores": scores,
                "selected_indices": [face["index"] for face in top_k_faces]
            }
        }
    
    def process_batch_with_angle_filter(
        self, 
        images_bytes: List[bytes], 
        angle_type: str = None
    ) -> Dict[str, Any]:
        """
        MAIN PROCESSING PIPELINE với ANGLE FILTERING
        =============================================
        
        Giống process_batch nhưng thêm filter theo góc quay (yaw angle)
        
        Args:
            images_bytes: List of image bytes
            angle_type: Loại góc (CENTER, LEFT, RIGHT, MASK) - Nếu None thì không filter góc
            
        Returns:
            Dict with success status, vector, and metadata
        """
        logger.info(
            f"🚀 Starting batch processing with ANGLE FILTER: {angle_type or 'None'} "
            f"for {len(images_bytes)} images"
        )
        
        valid_faces = []
        angle_filtered_count = 0
        
        # Track rejection reasons for detailed error reporting
        rejection_stats = {
            "no_face": 0,
            "multiple_faces": 0,
            "too_small": 0,
            "low_detection": 0,
            "too_blurry": 0,
            "fake_detected": 0,
            "wrong_angle": 0,
            "preprocessing_failed": 0
        }
        
        # ===== STEP 1: Input Processing với Angle Filter =====
        for idx, img_bytes in enumerate(images_bytes):
            # Preprocess
            img_array = self.preprocess_image(img_bytes)
            if img_array is None:
                logger.debug(f"⚠️ Image {idx}: Preprocessing failed")
                rejection_stats["preprocessing_failed"] += 1
                continue
            
            # Detect and score (with detailed rejection tracking)
            is_valid, face_data, rejection_reason = self.detect_and_score_face(
                img_array, idx, angle_type=angle_type
            )
            
            if not is_valid or not face_data:
                if rejection_reason:
                    rejection_stats[rejection_reason] = rejection_stats.get(rejection_reason, 0) + 1
                continue
            
            # ✅ THÊM BƯỚC FILTER THEO GÓC
            if angle_type:
                # Try all available yaw candidates (robust to different pose ordering)
                yaw_candidates = face_data.get("yaw_angle_candidates") or [face_data.get("yaw_angle", 0.0)]
                matched = False
                for yc in yaw_candidates:
                    if self.check_angle_match(yc, angle_type):
                        matched = True
                        break
                if not matched:
                    angle_filtered_count += 1
                    rejection_stats["wrong_angle"] += 1
                    logger.debug(
                        f"❌ Image {idx}: Wrong angle - Expected {angle_type} {ANGLE_RANGES.get(angle_type)}, "
                        f"Yaw candidates: {yaw_candidates}"
                    )
                    continue
            
            valid_faces.append(face_data)
        
        logger.info(
            f"📊 Filtering results: {len(valid_faces)}/{len(images_bytes)} images passed "
            f"(angle filtered: {angle_filtered_count})"
        )
        
        # ===== STEP 2: Selection (Safety Net) =====
        if len(valid_faces) < MIN_IMAGES_AFTER_FILTER:
            # Build detailed error message
            error_details = []
            if rejection_stats["fake_detected"] > 0:
                error_details.append(f"🚫 {rejection_stats['fake_detected']} frames bị phát hiện là ảnh giả (màn hình/ảnh in)")
            if rejection_stats["too_blurry"] > 0:
                error_details.append(f"😵 {rejection_stats['too_blurry']} frames quá mờ")
            if rejection_stats["wrong_angle"] > 0:
                error_details.append(f"🔄 {rejection_stats['wrong_angle']} frames sai góc quay")
            if rejection_stats["no_face"] > 0:
                error_details.append(f"👤 {rejection_stats['no_face']} frames không thấy khuôn mặt")
            if rejection_stats["multiple_faces"] > 0:
                error_details.append(f"👥 {rejection_stats['multiple_faces']} frames có nhiều người")
            if rejection_stats["too_small"] > 0:
                error_details.append(f"🔍 {rejection_stats['too_small']} frames khuôn mặt quá nhỏ")
            
            error_message = f"❌ Chất lượng video không đủ cho góc {angle_type}. Chỉ {len(valid_faces)}/{len(images_bytes)} frames đạt yêu cầu.\n\n"
            if error_details:
                error_message += "Chi tiết:\n" + "\n".join(error_details)
                error_message += "\n\n💡 Khuyến nghị:\n"
                if rejection_stats["fake_detected"] > 0:
                    error_message += "• Quay video thật, KHÔNG dùng ảnh trên màn hình/giấy in\n"
                if rejection_stats["wrong_angle"] > 0:
                    error_message += f"• Quay đúng góc {angle_type} theo hướng dẫn\n"
                if rejection_stats["too_blurry"] > 0:
                    error_message += "• Giữ điện thoại ổn định, lau sạch camera\n"
                if rejection_stats["no_face"] > 0 or rejection_stats["too_small"] > 0:
                    error_message += "• Đưa mặt gần camera hơn, đảm bảo ánh sáng đủ\n"
            
            return {
                "success": False,
                "message": error_message,
                "error_code": "INSUFFICIENT_QUALITY",
                "metadata": {
                    "total_images": len(images_bytes),
                    "valid_images": len(valid_faces),
                    "angle_filtered": angle_filtered_count,
                    "required_minimum": MIN_IMAGES_AFTER_FILTER,
                    "angle_type": angle_type,
                    "rejection_stats": rejection_stats
                }
            }
        
        # Sort by quality score
        valid_faces.sort(key=lambda x: x["quality_score"], reverse=True)
        
        # Take top K images (more for multi-angle since we have more frames)
        top_k = TOP_K_IMAGES_MULTI if angle_type else TOP_K_IMAGES
        top_k_faces = valid_faces[:top_k]
        
        logger.info(f"🎯 Selected top {len(top_k_faces)} images for angle {angle_type}")
        
        # ===== STEP 3: Vectorization & Averaging =====
        embeddings = np.array([face["embedding"] for face in top_k_faces])
        mean_embedding = np.mean(embeddings, axis=0)
        
        # L2 Normalization
        norm = np.linalg.norm(mean_embedding)
        if norm == 0:
            return {
                "success": False,
                "message": "Lỗi khi tính vector trung bình (norm = 0)",
                "metadata": {}
            }
        
        final_embedding = mean_embedding / norm
        final_embedding_list = final_embedding.tolist()
        
        # Calculate metadata
        scores = [face["quality_score"] for face in top_k_faces]
        average_quality = np.mean(scores)
        min_quality = np.min(scores)
        max_quality = np.max(scores)
        
        yaw_angles = [face["yaw_angle"] for face in top_k_faces]
        yaw_diversity = np.std(yaw_angles)
        yaw_mean = np.mean(yaw_angles)
        
        logger.info(
            f"✅ Batch processing successful for {angle_type} - "
            f"Avg Quality: {average_quality:.3f}, "
            f"Yaw Mean: {yaw_mean:.1f}°, "
            f"Yaw Diversity: {yaw_diversity:.2f}°"
        )
        
        return {
            "success": True,
            "vector": final_embedding_list,
            "best_cropped_face": top_k_faces[0].get("cropped_face") if top_k_faces else None,
            "top_k_cropped_faces": [f.get("cropped_face") for f in top_k_faces],
            "message": f"Đã xử lý thành công {len(top_k_faces)}/{len(images_bytes)} frames tốt nhất cho góc {angle_type}",
            "metadata": {
                "angle_type": angle_type,
                "total_images": len(images_bytes),
                "valid_images": len(valid_faces),
                "angle_filtered": angle_filtered_count,
                "selected_images": len(top_k_faces),
                "average_quality_score": float(average_quality),
                "min_quality_score": float(min_quality),
                "max_quality_score": float(max_quality),
                "yaw_mean": float(yaw_mean),
                "yaw_diversity": float(yaw_diversity),
                "quality_scores": scores,
                "selected_indices": [face["index"] for face in top_k_faces]
            }
        }


# Singleton instance (will be initialized in routes)
batch_processor = None

def initialize_batch_processor(face_service):
    """Initialize global batch processor instance"""
    global batch_processor
    batch_processor = BatchImageProcessor(face_service)
    logger.info("✅ Batch processor initialized")
    return batch_processor

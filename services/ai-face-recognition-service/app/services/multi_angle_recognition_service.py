"""
Multi-Angle Face Recognition Service
=====================================
Service hỗ trợ đăng ký và nhận diện khuôn mặt đa góc (1 User - N Vectors)
Chuẩn eKYC cho độ chính xác cao nhất

Chiến lược:
- Lưu 3 vector: frontal (thẳng), left (trái), right (phải)
- Tìm kiếm tự động chọn vector khớp nhất (min distance)
- Ngưỡng: < 1.1 (L2 distance) cho khớp thành công
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import FaceEmbedding, AttendanceLog
from app.services.face_recognition_service import face_recognizer

logger = logging.getLogger(__name__)

# Ngưỡng L2 distance cho InsightFace (512-dim vector)
# Với 1-shot learning: < 1.1 là khá tốt, < 0.9 là rất tốt
MATCH_THRESHOLD = 1.1
SAFE_THRESHOLD = 0.9


class MultiAngleFaceService:
    """Service for multi-angle face recognition (eKYC standard)"""
    
    @staticmethod
    def process_image_for_registration(image_bytes: bytes) -> Dict[str, Any]:
        """
        Xử lý ảnh và trích xuất embedding cho đăng ký
        
        Returns:
            {
                "success": bool,
                "embedding": List[float],
                "message": str,
                "metadata": dict (gender, age, pose angles, etc.)
            }
        """
        try:
            # Decode image
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {
                    "success": False,
                    "message": "Không thể đọc ảnh. Vui lòng kiểm tra định dạng."
                }
            
            # Process with face_recognizer (full validation)
            result = face_recognizer.process_face(
                img, 
                skip_quality_check=False,
                skip_liveness_check=False
            )
            
            if not result.success or not result.face_data:
                return {
                    "success": False,
                    "message": result.message or "Không phát hiện khuôn mặt"
                }
            
            # Extract embedding
            embedding = result.face_data.embedding
            if isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()
            
            return {
                "success": True,
                "embedding": list(map(float, embedding)),
                "message": "Xử lý ảnh thành công",
                "metadata": {
                    "gender": getattr(result.face_data, 'gender', None),
                    "age": getattr(result.face_data, 'age', None),
                    "bbox": getattr(result.face_data, 'bbox', None),
                    "quality_score": result.quality_result.blur_score if result.quality_result else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing image: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi xử lý ảnh: {str(e)}"
            }
    
    @staticmethod
    def register_multiple_poses(
        db: Session,
        user_id: int,
        username: str,
        full_name: Optional[str],
        poses_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Đăng ký nhiều vector cho 1 user (3 góc: frontal, left, right)
        
        Args:
            poses_data: [
                {
                    "pose_type": "frontal",
                    "embedding": [...],
                    "image_path": "...",
                    "confidence": 99.5
                },
                ...
            ]
        
        Returns:
            {
                "success": bool,
                "message": str,
                "data": {
                    "registered_count": int,
                    "embedding_ids": [...]
                }
            }
        """
        try:
            # Kiểm tra user đã có embedding chưa
            existing_count = db.query(FaceEmbedding).filter(
                FaceEmbedding.user_id == user_id
            ).count()
            
            if existing_count > 0:
                return {
                    "success": False,
                    "message": f"User {username} đã có {existing_count} ảnh đăng ký. Vui lòng xóa trước khi đăng ký mới."
                }
            
            # Validate poses_data
            if not poses_data or len(poses_data) == 0:
                return {
                    "success": False,
                    "message": "Không có dữ liệu ảnh để đăng ký"
                }
            
            # Mapping from API pose names to DB face_type names
            pose_map = {
                "frontal": "CENTER",
                "left": "LEFT",
                "right": "RIGHT",
                "center": "CENTER"
            }
            
            # Lưu từng pose vào DB
            embedding_ids = []
            import json
            for pose_data in poses_data:
                api_pose = pose_data.get("pose_type", "frontal")
                db_face_type = pose_map.get(api_pose, api_pose.upper())
                
                new_embedding = FaceEmbedding(
                    user_id=user_id,
                    username=username,
                    # full_name=full_name, # Remove this if not in DB model
                    embedding_vector=json.dumps(pose_data["embedding"]), # Use json.dumps for Text column
                    face_type=db_face_type,
                    quality_score=pose_data.get("metadata", {}).get("quality_score")
                )
                db.add(new_embedding)
                db.flush()
                embedding_ids.append(new_embedding.id)
            
            db.commit()
            
            logger.info(f"✅ Registered {len(embedding_ids)} poses for user {username} (ID: {user_id})")
            
            return {
                "success": True,
                "message": f"Đăng ký thành công {len(embedding_ids)} góc mặt cho {username}",
                "data": {
                    "registered_count": len(embedding_ids),
                    "embedding_ids": embedding_ids,
                    "user_id": user_id,
                    "username": username
                }
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error registering multiple poses: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi đăng ký: {str(e)}"
            }
    
    @staticmethod
    def search_face(
        db: Session,
        embedding: List[float],
        threshold: float = MATCH_THRESHOLD
    ) -> Optional[Dict[str, Any]]:
        """
        Tìm kiếm khuôn mặt khớp nhất trong database
        
        Cách hoạt động:
        - Query tất cả embeddings từ DB (JSON text format)
        - Tính L2 distance với từng embedding
        - Chọn embedding có distance nhỏ nhất
        - So sánh với threshold
        
        Returns:
            {
                "user_id": int,
                "username": str,
                "distance": float,
                "confidence": float (0-100),
                "matched_pose": str,  # face_type (CENTER/LEFT/RIGHT/MASK)
                "embedding_id": int
            }
            hoặc None nếu không tìm thấy
        """
        try:
            import json
            
            # Query tất cả embeddings (vì embedding_vector là JSON text, không phải pgvector)
            all_embeddings = db.query(FaceEmbedding).all()
            
            if not all_embeddings:
                logger.info("🔍 No embeddings found in database")
                return None
            
            # Chuyển input embedding thành numpy array
            query_emb = np.array(embedding, dtype=np.float32)
            query_emb = query_emb / np.linalg.norm(query_emb)  # L2 normalize
            
            best_match = None
            min_distance = float('inf')
            
            # Tính distance với từng embedding trong DB
            for db_emb in all_embeddings:
                try:
                    # Parse JSON embedding
                    stored_emb = json.loads(db_emb.embedding_vector)
                    stored_emb = np.array(stored_emb, dtype=np.float32)
                    stored_emb = stored_emb / np.linalg.norm(stored_emb)  # L2 normalize
                    
                    # Tính L2 distance
                    distance = float(np.linalg.norm(query_emb - stored_emb))
                    
                    if distance < min_distance:
                        min_distance = distance
                        best_match = db_emb
                        
                except Exception as e:
                    logger.warning(f"Failed to process embedding {db_emb.id}: {e}")
                    continue
            
            if not best_match:
                logger.info("⚠️ No valid embeddings found")
                return None
            
            logger.info(
                f"📊 Best match: user_id={best_match.user_id}, "
                f"face_type={best_match.face_type}, distance={min_distance:.4f}"
            )
            
            # Kiểm tra ngưỡng
            if min_distance >= threshold:
                logger.info(f"⚠️ Distance {min_distance:.4f} >= threshold {threshold}, không khớp")
                return None
            
            # Tính confidence score (0-100) từ distance
            confidence = max(0, (2.0 - min_distance) / 2.0) * 100
            
            return {
                "user_id": best_match.user_id,
                "username": best_match.username,
                "full_name": None,  # Không có full_name trong model hiện tại
                "distance": min_distance,
                "confidence": round(confidence, 2),
                "matched_pose": best_match.face_type,  # CENTER/LEFT/RIGHT/MASK
                "embedding_id": best_match.id,
                "is_safe_match": min_distance < SAFE_THRESHOLD
            }
            
        except Exception as e:
            logger.error(f"Error searching face: {e}", exc_info=True)
            return None
    
    @staticmethod
    def recognize_face(
        db: Session,
        image_bytes: bytes,
        recognition_type: str,
        threshold: float = MATCH_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Nhận diện khuôn mặt từ ảnh
        
        Returns:
            {
                "success": bool,
                "message": str,
                "data": {
                    "user": {...},
                    "confidence": float,
                    "matched_pose": str,
                    "recognition_log_id": int
                }
            }
        """
        try:
            # Extract embedding from image
            process_result = MultiAngleFaceService.process_image_for_registration(image_bytes)
            
            if not process_result["success"]:
                # Log failed attempt
                log = AttendanceLog(
                    user_id=0,
                    username='unknown',
                    recognition_type=recognition_type,
                    similarity_score=0.0,
                    status='validation_failed',
                    notes=process_result["message"]
                )
                db.add(log)
                db.commit()
                
                return {
                    "success": False,
                    "message": process_result["message"]
                }
            
            embedding = process_result["embedding"]
            
            # Search in database
            match = MultiAngleFaceService.search_face(db, embedding, threshold)
            
            if not match:
                # Log unknown face
                log = AttendanceLog(
                    user_id=0,
                    username='unknown',
                    recognition_type=recognition_type,
                    similarity_score=0.0,
                    status='unknown_face',
                    notes='Không tìm thấy khuôn mặt khớp trong hệ thống'
                )
                db.add(log)
                db.commit()
                
                return {
                    "success": False,
                    "message": "Không nhận diện được khuôn mặt. Vui lòng đăng ký trước."
                }
            
            # Log successful recognition
            log = AttendanceLog(
                user_id=match["user_id"],
                username=match["username"],
                recognition_type=recognition_type,
                similarity_score=match["confidence"] / 100.0,
                matched_by_type=match["matched_pose"],
                status='recognized',
                notes=f"Matched with {match['matched_pose']} pose (distance: {match['distance']:.4f})"
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            
            logger.info(
                f"✅ Recognition success: {match['username']} "
                f"(confidence: {match['confidence']:.2f}%, pose: {match['matched_pose']})"
            )
            
            return {
                "success": True,
                "message": f"Nhận diện thành công: {match['full_name'] or match['username']}",
                "data": {
                    "user": {
                        "user_id": match["user_id"],
                        "username": match["username"],
                        "full_name": match["full_name"]
                    },
                    "confidence": match["confidence"],
                    "matched_pose": match["matched_pose"],
                    "distance": match["distance"],
                    "is_safe_match": match["is_safe_match"],
                    "recognition_log_id": log.id
                }
            }
            
        except Exception as e:
            logger.error(f"Error in recognize_face: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi hệ thống: {str(e)}"
            }


# Singleton instance
multi_angle_service = MultiAngleFaceService()

__all__ = ["multi_angle_service", "MultiAngleFaceService"]

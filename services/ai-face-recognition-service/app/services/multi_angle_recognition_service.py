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

import os
import uuid
from typing import Dict, Any, List
import logging
from fastapi import UploadFile
from sqlalchemy.orm import Session
import numpy as np
import cv2
import json

from app.core.config import settings
from app.core.database import FaceEmbedding, AttendanceLog

logger = logging.getLogger(__name__)

# Default thresholds for L2 distance (lower is better)
MATCH_THRESHOLD = 1.1
SAFE_THRESHOLD = 0.9

class MultiAngleFaceService:
    """Service for multi-angle face recognition (eKYC standard)"""
    
    @staticmethod
    def _save_snapshot(image_bytes: bytes) -> str:
        """Save image snapshot directly to uploads directory"""
        try:
            if not image_bytes:
                logger.error("❌ _save_snapshot: Empty image bytes")
                return ""

            # Resolve upload directory
            # Use strict 'uploads' folder in current working directory to ensure Nginx mapping works
            base_dir = os.getcwd()
            upload_dir = os.path.join(base_dir, 'uploads')
            
            if not os.path.exists(upload_dir):
                logger.info(f"📁 Creating upload directory: {upload_dir}")
                os.makedirs(upload_dir, exist_ok=True)
            
            # Generate filename
            filename = f"log_{uuid.uuid4().hex}.jpg"
            file_absolute_path = os.path.join(upload_dir, filename)
            
            # Write bytes directly (more robust than cv2 decode/encode)
            with open(file_absolute_path, "wb") as f:
                f.write(image_bytes)
            
            if os.path.exists(file_absolute_path) and os.path.getsize(file_absolute_path) > 0:
                logger.info(f"📸 Snapshot saved successfully: {file_absolute_path} (Size: {len(image_bytes)} bytes)")
                # Return URL path with /ai prefix for Gateway routing compatibility
                return f"/ai/uploads/{filename}"
            else:
                logger.error(f"❌ File write verification failed: {file_absolute_path}")
                return ""

        except Exception as e:
            logger.error(f"❌ Failed to save snapshot: {e}", exc_info=True)
            return ""

    @staticmethod
    def process_image_for_registration(image_bytes: bytes) -> Dict[str, Any]:
        """Process image to extract face embedding"""
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {"success": False, "message": "Không thể đọc ảnh"}

            # Import here to avoid circular dependency
            from app.services.face_recognition_service import face_recognizer
            
            if not face_recognizer.app:
                face_recognizer.initialize()
                
            faces = face_recognizer.app.get(img)
            
            if not faces or len(faces) == 0:
                return {"success": False, "message": "Không tìm thấy khuôn mặt"}
            
            # Get largest face
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            
            # Normalize embedding
            embedding = face.embedding
            norm_embedding = embedding / np.linalg.norm(embedding)
            
            return {
                "success": True, 
                "embedding": norm_embedding.tolist(),
                "face": face
            }
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {"success": False, "message": f"Lỗi xử lý ảnh: {str(e)}"}

    @staticmethod
    def search_face(db: Session, embedding: List[float], threshold: float) -> Dict[str, Any]:
        """Search for best matching face in database using pgvector"""
        try:
            from sqlalchemy import select
            
            # Search using L2 distance
            distance_expr = FaceEmbedding.face_embedding.l2_distance(embedding)
            stmt = select(FaceEmbedding, distance_expr.label('distance')).order_by(distance_expr).limit(1)
            
            result = db.execute(stmt).first()
            
            if not result:
                return None
                
            match_obj, distance = result
            
            if distance > threshold:
                return None
                
            # Convert distance to confidence (approximate)
            # L2 distance range [0, 2] for normalized vectors
            # 0 -> 100%, 2 -> 0%
            confidence = max(0, (2.0 - distance) / 2.0) * 100
            
            return {
                "user_id": match_obj.user_id,
                "username": match_obj.username,
                "full_name": getattr(match_obj, 'username', ''), # Fallback
                "matched_pose": getattr(match_obj, 'face_type', 'unknown'),
                "distance": float(distance),
                "confidence": float(confidence),
                "is_safe_match": distance < SAFE_THRESHOLD
            }
            
        except Exception as e:
            logger.error(f"Error searching face: {e}")
            return None

    @staticmethod
    def register_multiple_poses(db: Session, user_id: int, username: str, images: Dict[str, bytes]) -> Dict[str, Any]:
        """Register multiple poses (unused but kept for interface compatibility)"""
        return {"success": False, "message": "Method not implemented in this simplified version"}


    @staticmethod
    def recognize_face(
        db: Session,
        image_bytes: bytes,
        recognition_type: str,
        threshold: float = MATCH_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Nhận diện khuôn mặt từ ảnh
        """
        try:
            # Save snapshot first
            snapshot_url = MultiAngleFaceService._save_snapshot(image_bytes)
             # _save_snapshot handles logging
            
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
                    notes=process_result["message"],
                    image_snapshot_url=snapshot_url
                )
                db.add(log)
                db.commit()
                
                return {
                    "success": False,
                    "message": process_result["message"],
                    "image_snapshot_url": snapshot_url
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
                    notes='Không tìm thấy khuôn mặt khớp trong hệ thống',
                    image_snapshot_url=snapshot_url
                )
                db.add(log)
                db.commit()
                
                return {
                    "success": False,
                    "message": "Không nhận diện được khuôn mặt. Vui lòng đăng ký trước.",
                    "image_snapshot_url": snapshot_url
                }
            
            # Log successful recognition
            log = AttendanceLog(
                user_id=match["user_id"],
                username=match["username"],
                recognition_type=recognition_type,
                similarity_score=match["confidence"] / 100.0,
                matched_by_type=match["matched_pose"],
                status='recognized',
                notes=f"Matched with {match['matched_pose']} pose (distance: {match['distance']:.4f})",
                image_snapshot_url=snapshot_url
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
                    "recognition_log_id": log.id,
                    "image_snapshot_url": snapshot_url
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

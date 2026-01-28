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
from app.core.config import settings

# ... (Previous imports)

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

    # ... (Keep existing methods: process_image_for_registration, register_multiple_poses, search_face)

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
            logger.info(f"📸 DEBUG: Result from _save_snapshot: '{snapshot_url}'")
            
            if not snapshot_url:
                logger.error("❌ DEBUG: snapshot_url is empty! Forcing a debug value.")
                snapshot_url = "/error/snapshot_save_failed_debug.jpg"
            
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

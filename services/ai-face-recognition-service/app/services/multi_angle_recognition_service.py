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
from app.core.recognition_constants import recognition_settings

logger = logging.getLogger(__name__)

class MultiAngleFaceService:
    """Service for multi-angle face recognition (eKYC standard)"""
    
    def _save_snapshot(self, image_bytes: bytes) -> str:
        """Save image snapshot directly to uploads directory"""
        try:
            if not image_bytes:
                logger.error("❌ _save_snapshot: Empty image bytes")
                return ""

            # Resolve upload directory
            base_dir = os.getcwd()
            upload_dir = os.path.join(base_dir, 'uploads')
            
            if not os.path.exists(upload_dir):
                logger.info(f"📁 Creating upload directory: {upload_dir}")
                os.makedirs(upload_dir, exist_ok=True)
            
            # Generate filename
            filename = f"log_{uuid.uuid4().hex}.jpg"
            file_absolute_path = os.path.join(upload_dir, filename)
            
            # Write bytes directly
            with open(file_absolute_path, "wb") as f:
                f.write(image_bytes)
            
            if os.path.exists(file_absolute_path) and os.path.getsize(file_absolute_path) > 0:
                logger.info(f"📸 Snapshot saved successfully: {filename}")
                return f"/uploads/{filename}"
            else:
                logger.error(f"❌ File write verification failed: {file_absolute_path}")
                return ""

        except Exception as e:
            logger.error(f"❌ Failed to save snapshot: {e}", exc_info=True)
            return ""

    def process_image_for_registration(self, image_bytes: bytes) -> Dict[str, Any]:
        """Process image to extract face embedding with configurable quality checks"""
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {"success": False, "message": "Không thể đọc dữ liệu ảnh"}

            # --- CONFIGURABLE QUALITY CHECKS ---
            # 1. Check Brightness
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            brightness = np.mean(hsv[:, :, 2])
            
            if brightness < recognition_settings.MIN_BRIGHTNESS:
                return {
                    "success": False, 
                    "message": f"Ảnh quá tối ({int(brightness)}/255). Vui lòng bật thêm đèn."
                }
            if brightness > recognition_settings.MAX_BRIGHTNESS:
                return {
                    "success": False, 
                    "message": f"Ảnh quá sáng ({int(brightness)}/255). Tránh nguồn sáng mạnh phía sau."
                }
                
            # 2. Check Blur
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            if blur_score < recognition_settings.MIN_BLUR_SCORE:
                return {
                    "success": False, 
                    "message": "Ảnh chưa được rõ nét. Vui lòng giữ chắc tay và chụp lại."
                }
            # -----------------------------------

            # Import here to avoid circular dependency
            from app.services.face_recognition_service import face_recognizer
            
            if not face_recognizer.app:
                face_recognizer.initialize()
                
            faces = face_recognizer.app.get(img)
            
            if not faces or len(faces) == 0:
                return {"success": False, "message": "Không tìm thấy khuôn mặt nào."}
            
            # Get largest face
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            
            # Liveness check will be handled separately in recognition flow
            # to provide better error messages for unknown users.

            # --- 4. Check Face Size (Resolution) ---
            face_w = face.bbox[2] - face.bbox[0]
            face_h = face.bbox[3] - face.bbox[1]
            min_w, min_h = recognition_settings.MIN_FACE_SIZE
            
            if face_w < min_w or face_h < min_h:
                logger.warning(f"⚠️ Face too small: {int(face_w)}x{int(face_h)} < {min_w}x{min_h}")
                return {
                    "success": False,
                    "message": f"Khuôn mặt quá nhỏ/xa ({int(face_w)}x{int(face_h)}px). Vui lòng tiến lại gần camera hơn."
                }
            # ---------------------------------------

            # --- 5. Check Head Pose (Angle) ---
            # face.pose is usually [pitch, yaw, roll] in degrees (InsightFace models vary)
            if hasattr(face, 'pose') and face.pose is not None:
                pitch, yaw, roll = face.pose
                # Basic check: Reject extreme angles (> 45 degrees) that distort features
                if abs(pitch) > 45 or abs(yaw) > 45 or abs(roll) > 45:
                     logger.warning(f"⚠️ Face angle extreme: P={pitch:.1f}, Y={yaw:.1f}, R={roll:.1f}")
                     return {
                        "success": False,
                        "message": "Góc mặt quá nghiêng. Vui lòng nhìn thẳng vào camera."
                     }
            # ----------------------------------
            
            # Normalize embedding
            embedding = face.embedding
            norm_embedding = embedding / np.linalg.norm(embedding)
            
            # Crop face for saving
            x1, y1, x2, y2 = [int(v) for v in face.bbox]
            h, w, _ = img.shape
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
            cropped_face = img[y1:y2, x1:x2]
            
            return {
                "success": True, 
                "embedding": norm_embedding.tolist(),
                "face": face,
                "cropped_face": cropped_face
            }
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {"success": False, "message": f"Lỗi xử lý ảnh: {str(e)}"}

    def search_face(self, db: Session, embedding: List[float], threshold: float) -> Dict[str, Any]:
        """Search for best matching face using configuration"""
        try:
            from sqlalchemy import select, cast
            from pgvector.sqlalchemy import Vector
            
            logger.info(f"🔍 Searching... Threshold={threshold}")

            try:
                # 1. Try search using pgvector (L2 distance)
                # Explicitly cast to Vector(512)
                distance_expr = cast(FaceEmbedding.embedding_vector, Vector(512)).l2_distance(embedding)
                
                # Get closest match regardless of threshold first to debug
                stmt = select(FaceEmbedding, distance_expr.label('distance')).order_by(distance_expr).limit(1)
                
                result = db.execute(stmt).first()
            except Exception as e:
                # 2. Fallback to Python calculation if pgvector/vector type is missing
                logger.warning(f"⚠️ SQL Vector search failed (likely missing pgvector): {e}")
                
                # IMPORTANT: Must rollback the failed transaction before making new queries
                db.rollback()
                
                logger.info("🔄 Falling back to Python-based distance calculation...")
                
                # Fetch all embeddings
                all_faces = db.query(FaceEmbedding).all()
                if not all_faces:
                     logger.warning("⚠️ Database empty (0 faces found)")
                     # Try to list tables to ensure we are connected to the right DB
                     try:
                         from sqlalchemy import text
                         result = db.execute(text("SELECT count(*) FROM face_embeddings"))
                         count = result.scalar()
                         logger.info(f"DEBUG: Raw SQL count from face_embeddings: {count}")
                     except Exception as ex:
                         logger.error(f"DEBUG: Failed to count faces: {ex}")
                     return None
                
                logger.info(f"DEBUG: Found {len(all_faces)} faces in DB. Starting Python comparison...")

                min_dist = 100.0
                best_face = None
                
                target_emb = np.array(embedding, dtype=np.float32)
                
                for i, face in enumerate(all_faces):
                    # Parse embedding from stored format (list or string)
                    db_emb = None
                    # FIX: Use 'is not None' to avoid numpy truth value ambiguity
                    emb_vec = face.embedding_vector
                    
                    if emb_vec is None:
                        continue

                    # Safe string preview
                    try:
                        emb_str_preview = str(emb_vec)[:20]
                    except:
                        emb_str_preview = "ErrorStr"
                    
                    if isinstance(emb_vec, str):
                        try:
                            # Try loading as JSON
                            db_emb = np.array(json.loads(emb_vec), dtype=np.float32)
                        except:
                            # Setup for simple string parsing if needed "[x,y,z]"
                            val = emb_vec.strip('[]')
                            if ',' in val:
                                db_emb = np.fromstring(val, sep=',', dtype=np.float32)
                    elif isinstance(emb_vec, list):
                        db_emb = np.array(emb_vec, dtype=np.float32)
                    # Check for numpy array directly (pgvector might map to it)
                    elif isinstance(emb_vec, np.ndarray):
                        db_emb = np.array(emb_vec, dtype=np.float32)
                    # Check for other types (e.g. pgvector object)
                    elif hasattr(emb_vec, 'tolist'):
                        db_emb = np.array(emb_vec.tolist(), dtype=np.float32)
                    else:
                         if i < 3: logger.warning(f"DEBUG: Face {face.id} has unknown embedding type: {type(emb_vec)}")
                         continue
                        
                    if db_emb is None:
                        if i < 3: logger.warning(f"DEBUG: Face {face.id} embedding is None after parse. Raw: {emb_str_preview}")
                        continue

                    if len(db_emb) != len(target_emb):
                        if i < 3: logger.warning(f"DEBUG: Face {face.id} dimension mismatch: {len(db_emb)} vs {len(target_emb)}")
                        continue
                        
                    # Calculate L2 distance
                    dist = np.linalg.norm(target_emb - db_emb)
                    
                    if dist < min_dist:
                        min_dist = float(dist)
                        best_face = face
                
                if best_face:
                    logger.info(f"DEBUG: Best match found in Python: {best_face.username} with dist {min_dist}")
                    result = (best_face, min_dist)
                else:
                    logger.warning("DEBUG: Loop finished but no best_face found.")
                    result = None

            if not result:
                logger.warning("⚠️ Database empty or no match candidates")
                return None
                
            match_obj, distance = result
            distance = float(distance)
            
            logger.info(f"👀 Closest: {match_obj.username} (ID: {match_obj.user_id}) - Dist: {distance:.4f}")

            if distance > threshold:
                logger.info(f"❌ Rejected: Dist {distance:.4f} > Threshold {threshold}")
                return None
                
            # Use centralized confidence calculation
            confidence = recognition_settings.calculate_confidence(distance)
            logger.info(f"✅ Accepted: {match_obj.username} - Conf: {confidence:.2f}%")
            
            return {
                "user_id": match_obj.user_id,
                "username": match_obj.username,
                "full_name": getattr(match_obj, 'full_name', None) or match_obj.username,
                "matched_pose": getattr(match_obj, 'face_type', 'unknown'),
                "distance": distance,
                "confidence": confidence,
                "is_safe_match": distance < recognition_settings.SAFE_THRESHOLD
            }
            
        except Exception as e:
            logger.error(f"Error searching face: {e}")
            db.rollback() 
            return None

    def register_multiple_poses(
        self, 
        db: Session, 
        user_id: int, 
        username: str, 
        full_name: str, 
        poses_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Register multiple face poses for a user.
        Replaces existing embeddings for this user.
        """
        try:
            # 1. Delete existing embeddings for this user
            db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).delete()
            
            # 2. Insert new embeddings
            for pose in poses_data:
                # Ensure embedding is list/json
                emb = pose["embedding"]
                if isinstance(emb, np.ndarray):
                    emb = emb.tolist()
                
                new_face = FaceEmbedding(
                    user_id=user_id,
                    username=username,
                    full_name=full_name or username,
                    embedding_vector=emb, # Pass list directly to pgvector
                    face_type=pose["pose_type"],
                    created_at=None # Let DB handle defaults or add if needed
                )
                db.add(new_face)
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Đăng ký thành công {len(poses_data)} góc khuôn mặt",
                "data": {
                    "user_id": user_id,
                    "registered_poses": [p["pose_type"] for p in poses_data]
                }
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error registering poses: {e}")
            return {"success": False, "message": f"Lỗi database: {str(e)}"}


    def recognize_face(
        self,
        db: Session,
        image_bytes: bytes,
        recognition_type: str,
        threshold: float = recognition_settings.MATCH_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Nhận diện khuôn mặt với threshold mặc định từ config
        """
        try:
            # Save snapshot first
            snapshot_url = self._save_snapshot(image_bytes)
            
            # Extract embedding from image
            process_result = self.process_image_for_registration(image_bytes)
            
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
            
            # --- STAGE: Liveness Check (Anti-Spoofing) ---
            # Perform liveness check after basic validation but before final confirmation
            from app.services.face_liveness_service import face_liveness_detector
            if face_liveness_detector.is_available():
                # Extract bbox from process_result
                face_obj = process_result["face"]
                # Decode image again for liveness (or we could pass it from process_result)
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                liveness_result = face_liveness_detector.check_liveness(img, face_obj.bbox)
                
                if not liveness_result.is_real:
                    # Log spoof attempt
                    log = AttendanceLog(
                        user_id=0,
                        username='spoof_detected',
                        recognition_type=recognition_type,
                        similarity_score=0.0,
                        status='spoof_detected',
                        notes=liveness_result.message,
                        image_snapshot_url=snapshot_url
                    )
                    db.add(log)
                    db.commit()
                    
                    return {
                        "success": False,
                        "message": liveness_result.message,
                        "is_spoof": True,
                        "image_snapshot_url": snapshot_url
                    }
            # ---------------------------------------------

            # Search in database
            match = self.search_face(db, embedding, threshold)
            
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
                full_name=match["full_name"],
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
            db.rollback() 
            return {
                "success": False,
                "message": f"Lỗi hệ thống: {str(e)}"
            }

# Singleton instance
multi_angle_service = MultiAngleFaceService()

__all__ = ["multi_angle_service", "MultiAngleFaceService"]

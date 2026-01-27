import asyncio
import logging
import cv2
import numpy as np
import json
import os
import uuid
import requests

from .face_recognition_service import face_recognizer
from app.core.config import settings
from app.core.database import FaceEmbedding, AttendanceLog

logger = logging.getLogger(__name__)

class InsightFaceRecognitionService:
    """
    Compatibility wrapper for older import path used by main.py.
    
    The real implementation lives in `face_recognition_service.py` and the
    module creates a singleton `face_recognizer` on import. This wrapper
    exposes an async `initialize_models` method so existing startup code
    can await it without changes.
    """

    @staticmethod
    async def initialize_models():
        """Initialize models (already done on import of face_recognition_service)"""
        logger.info("InsightFaceRecognitionService: initialize_models called")
        await asyncio.sleep(0)
        return face_recognizer

    async def recognize_face(self, image_bytes: bytes, recognition_type: str, db, threshold: float = None):
        """
        Recognize face from image bytes and compare with DB embeddings.
        
        This method:
        1. Decodes image
        2. Detects and extracts face embedding
        3. Loads all embeddings from DB (JSON format)
        4. Compares using cosine similarity
        5. Returns best match if above threshold
        """
        try:
            if threshold is None:
                threshold = 0.6  # Default threshold
            
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {
                    "success": False,
                    "error": "INVALID_IMAGE",
                    "message": "Không thể đọc ảnh"
                }

            # Process face
            result = face_recognizer.process_face(img, skip_quality_check=True, skip_liveness_check=True)

            if not result.success or not result.face_data:
                return {
                    "success": False,
                    "error": "NO_FACE_DETECTED",
                    "message": result.message or "Không phát hiện khuôn mặt"
                }

            # Get embedding vector
            emb = result.face_data.embedding
            if emb is None:
                return {
                    "success": False,
                    "error": "NO_EMBEDDING",
                    "message": "Không thể trích xuất đặc trưng khuôn mặt"
                }

            # Load all active embeddings from DB
            db_embeddings = db.query(FaceEmbedding).filter(
                FaceEmbedding.face_type == 'MASTER'
            ).all()

            if not db_embeddings:
                # Save snapshot even if no embeddings
                upload_dir = settings.UPLOAD_DIR or './uploads'
                os.makedirs(upload_dir, exist_ok=True)
                snapshot_filename = f"log_{uuid.uuid4().hex}.jpg"
                snapshot_path = os.path.join(upload_dir, snapshot_filename)
                cv2.imwrite(snapshot_path, img)
                snapshot_url = f"/uploads/{snapshot_filename}"

                # No embeddings in DB
                log = AttendanceLog(
                    user_id=0,
                    username='unknown',
                    recognition_type=recognition_type,
                    similarity_score=0.0,
                    matched_by_type='NONE',
                    status='no_embeddings',
                    image_snapshot_url=snapshot_url
                )
                db.add(log)
                db.commit()
                db.refresh(log)

                return {
                    "success": False,
                    "error": "NO_EMBEDDINGS",
                    "message": "Chưa có dữ liệu khuôn mặt trong hệ thống",
                    "recognition_log_id": log.id,
                    "image_snapshot_url": snapshot_url
                }

            # Compare with all embeddings (in-memory)
            best_match = None
            best_similarity = 0.0

            for db_emb in db_embeddings:
                try:
                    # Parse JSON vector
                    stored_vector = json.loads(db_emb.embedding_vector)
                    stored_vector = np.array(stored_vector, dtype=np.float32)
                    
                    # Compute cosine similarity
                    similarity = float(np.dot(emb, stored_vector) / (np.linalg.norm(emb) * np.linalg.norm(stored_vector)))
                    
                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_match = db_emb
                        
                except Exception as e:
                    logger.error(f"Error comparing with embedding {db_emb.id}: {e}")
                    continue

            # Save snapshot image
            upload_dir = settings.UPLOAD_DIR or './uploads'
            os.makedirs(upload_dir, exist_ok=True)
            snapshot_filename = f"log_{uuid.uuid4().hex}.jpg"
            snapshot_path = os.path.join(upload_dir, snapshot_filename)
            cv2.imwrite(snapshot_path, img)
            snapshot_url = f"/uploads/{snapshot_filename}"

            # Check if best match passes threshold
            if best_match and best_similarity >= threshold:
                status = 'recognized'
                
                # Create attendance log
                log = AttendanceLog(
                    user_id=best_match.user_id,
                    username=best_match.username,
                    recognition_type=recognition_type,
                    similarity_score=best_similarity,
                    matched_by_type='MASTER',
                    status=status,
                    image_snapshot_url=snapshot_url
                )
                db.add(log)
                db.commit()
                db.refresh(log)

                logger.info(f"✅ Face recognized: {best_match.username} (similarity: {best_similarity:.4f})")

                return {
                    "success": True,
                    "data": {
                        "user": {
                            "user_id": best_match.user_id,
                            "username": best_match.username
                        },
                        "confidence": best_similarity,
                        "similarity": best_similarity,
                        "recognition_log_id": log.id,
                        "image_snapshot_url": snapshot_url
                    }
                }
            else:
                # No match or below threshold
                log = AttendanceLog(
                    user_id=0,
                    username='unknown',
                    recognition_type=recognition_type,
                    similarity_score=best_similarity if best_match else 0.0,
                    matched_by_type='NONE',
                    status='unrecognized',
                    image_snapshot_url=snapshot_url
                )
                db.add(log)
                db.commit()
                db.refresh(log)

                return {
                    "success": False,
                    "error": "NOT_RECOGNIZED",
                    "message": f"Không nhận diện được (điểm tương đồng: {best_similarity:.2f})",
                    "recognition_log_id": log.id,
                    "image_snapshot_url": snapshot_url
                }

        except Exception as e:
            logger.error(f"Error in recognize_face: {e}", exc_info=True)
            return {
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": str(e)
            }

    async def register_face(self, image_bytes: bytes, user_id: int, username: str, db):
        """
        Register a new face embedding for a user.
        
        Note: This is legacy method. New code should use batch_registration API.
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {
                    "success": False,
                    "error": "INVALID_IMAGE",
                    "message": "Không thể đọc ảnh"
                }

            # Process face
            result = face_recognizer.process_face(img, skip_quality_check=False, skip_liveness_check=False)

            if not result.success or not result.face_data:
                return {
                    "success": False,
                    "error": "NO_FACE_DETECTED",
                    "message": result.message or "Không phát hiện khuôn mặt"
                }

            emb = result.face_data.embedding

            # Save image to uploads (do not persist path to DB)
            upload_dir = settings.UPLOAD_DIR or './uploads'
            os.makedirs(upload_dir, exist_ok=True)
            filename = f"{user_id}_{uuid.uuid4().hex}.jpg"
            _saved_path = os.path.join(upload_dir, filename)
            cv2.imwrite(_saved_path, img)

            # Convert embedding to JSON
            emb_json = json.dumps(emb.tolist() if hasattr(emb, 'tolist') else list(map(float, emb)))

            # Create new embedding record
            new_embedding = FaceEmbedding(
                user_id=user_id,
                username=username,
                embedding_vector=emb_json,
                face_type='MASTER'
            )
            db.add(new_embedding)
            db.commit()
            db.refresh(new_embedding)

            logger.info(f"✅ Registered face for user {username} (embedding_id: {new_embedding.id})")

            return {
                "success": True,
                "message": "Đăng ký khuôn mặt thành công",
                "data": {
                    "embedding_id": new_embedding.id,
                    "user_id": user_id,
                    "username": username
                }
            }

        except Exception as e:
            logger.error(f"Error in register_face: {e}", exc_info=True)
            db.rollback()
            return {
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": str(e)
            }

    def _send_to_attendance_service(self, user_match: dict, recognition_type: str, confidence_score: int):
        """Send attendance confirmation to API gateway (synchronous)."""
        try:
            url = f"{settings.API_GATEWAY_URL.rstrip('/')}/attendance/confirm-attendance"
            headers = {"Content-Type": "application/json"}
            if settings.SERVICE_API_TOKEN:
                headers['Authorization'] = f"Bearer {settings.SERVICE_API_TOKEN}"

            payload = {
                "user_id": user_match.get('user_id'),
                "username": user_match.get('username'),
                "recognition_type": recognition_type,
                "confidence_score": confidence_score
            }

            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            try:
                return resp.json()
            except Exception:
                return {
                    "success": resp.status_code == 200,
                    "status_code": resp.status_code
                }
        except Exception as e:
            logger.error(f"Error sending to attendance service: {e}")
            return {
                "success": False,
                "error": str(e)
            }


__all__ = ["InsightFaceRecognitionService"]

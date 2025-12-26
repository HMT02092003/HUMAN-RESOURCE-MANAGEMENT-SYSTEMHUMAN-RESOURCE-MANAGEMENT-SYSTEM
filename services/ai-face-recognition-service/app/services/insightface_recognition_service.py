import asyncio
import logging

from .face_recognition_service import face_recognizer
import cv2
import numpy as np
import json
import os
import uuid
import requests
from app.core.config import settings
from app.core.database import FaceEmbedding, AttendanceLog

logger = logging.getLogger(__name__)


class InsightFaceRecognitionService:
    """Compatibility wrapper for older import path used by main.py.

    The real implementation lives in `face_recognition_service.py` and the
    module creates a singleton `face_recognizer` on import. This wrapper
    exposes an async `initialize_models` method so existing startup code
    can await it without changes.
    """

    @staticmethod
    async def initialize_models():
        # The `face_recognizer` is initialized on import; yield control
        # once to allow the event loop to proceed.
        logger.info("InsightFaceRecognitionService: initialize_models called")
        await asyncio.sleep(0)
        return face_recognizer

    async def recognize_face(self, image_bytes: bytes, recognition_type: str, db, threshold: float = None):
        """Decode image bytes, run recognition (fast/normal mode), compare against DB embeddings."""
        try:
            if threshold is None:
                threshold = float(settings.CONFIDENCE_THRESHOLD)

            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {"success": False, "error": "INVALID_IMAGE", "message": "Không thể đọc ảnh"}

            # Use face_recognizer to process (skip quality/liveness for normal mode)
            result = face_recognizer.process_face(img, skip_quality_check=True, skip_liveness_check=True)

            if not result.success:
                return {"success": False, "error": "NO_FACE_DETECTED", "message": result.message}

            # Have embedding
            emb = np.array(result.face_data.embedding)

            # Query DB for stored embeddings
            stored = db.query(FaceEmbedding).filter(FaceEmbedding.is_active == True).all()
            logger.info(f"🔍 Found {len(stored)} stored embeddings in database")

            best = {"similarity": 0.0, "row": None}
            for row in stored:
                try:
                    stored_emb = np.array(json.loads(row.face_embedding))
                    cmp = face_recognizer.compare_faces(emb, stored_emb, threshold=threshold)
                    similarity = cmp.get('similarity', 0.0)
                    if similarity > best['similarity']:
                        best = {"similarity": similarity, "row": row}
                        logger.info(f"📊 New best match: user_id={row.user_id}, similarity={similarity:.4f}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to compare embedding for user_id={row.user_id}: {e}")
                    continue
            
            logger.info(f"🎯 Best match: similarity={best['similarity']:.4f} (threshold check disabled)")

            # Luôn trả về kết quả tốt nhất nếu có embeddings trong DB
            if best['row'] and len(stored) > 0:
                # Create attendance log với status dựa trên similarity
                status = 'recognized' if best['similarity'] >= threshold else 'low_confidence'
                
                log = AttendanceLog(
                    user_id=best['row'].user_id,
                    username=best['row'].username,
                    recognition_type=recognition_type,
                    confidence_score=int(best['similarity'] * 100),
                    image_path=None,
                    face_location=result.face_data.bbox if result.face_data else None,
                    status=status
                )
                db.add(log)
                db.commit()
                db.refresh(log)

                logger.info(f"✅ Best match found: {best['row'].username} (confidence: {best['similarity']:.4f})")

                return {
                    "success": True,
                    "data": {
                        "user": {
                            "user_id": best['row'].user_id,
                            "username": best['row'].username,
                            "full_name": best['row'].full_name
                        },
                        "confidence": best['similarity'],
                        "recognition_log_id": log.id,
                        "note": "low_confidence" if best['similarity'] < threshold else None
                    }
                }
            else:
                # Không có embeddings trong DB
                log = AttendanceLog(
                    user_id=0,
                    username='unknown',
                    recognition_type=recognition_type,
                    confidence_score=0,
                    image_path=None,
                    face_location=result.face_data.bbox if result.face_data else None,
                    status='no_embeddings'
                )
                db.add(log)
                db.commit()
                db.refresh(log)

                return {"success": False, "error": "NO_EMBEDDINGS", "message": "Chưa có dữ liệu khuôn mặt trong hệ thống", "recognition_log_id": log.id}

        except Exception as e:
            logger.error(f"Error in recognize_face wrapper: {e}", exc_info=True)
            return {"success": False, "error": "INTERNAL_ERROR", "message": str(e)}

    async def register_face(self, image_bytes: bytes, user_id: int, username: str, db):
        """Register a new face embedding for a user and save image to uploads."""
        try:
            # Decode
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {"success": False, "error": "INVALID_IMAGE", "message": "Không thể đọc ảnh"}

            # Process face with full checks
            result = face_recognizer.process_face(img, skip_quality_check=False, skip_liveness_check=False)

            if not result.success or not result.face_data:
                return {"success": False, "error": "NO_FACE_DETECTED", "message": result.message}

            emb = result.face_data.embedding

            # Save image to uploads
            upload_dir = settings.UPLOAD_DIR or './uploads'
            os.makedirs(upload_dir, exist_ok=True)
            filename = f"{user_id}_{uuid.uuid4().hex}.jpg"
            path = os.path.join(upload_dir, filename)
            cv2.imwrite(path, img)

            # Store embedding as JSON
            emb_json = json.dumps(emb)

            new = FaceEmbedding(
                user_id=user_id,
                username=username,
                full_name=None,
                face_embedding=emb_json,
                image_path=path,
                confidence_score=int(result.face_data.confidence * 100) if result.face_data and hasattr(result.face_data, 'confidence') else 0,
                is_active=True
            )
            db.add(new)
            db.commit()
            db.refresh(new)

            return {"success": True, "message": "Đăng ký khuôn mặt thành công", "data": {"embedding_id": new.id}}

        except Exception as e:
            logger.error(f"Error in register_face wrapper: {e}", exc_info=True)
            return {"success": False, "error": "INTERNAL_ERROR", "message": str(e)}

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
                return {"success": resp.status_code == 200, "status_code": resp.status_code}
        except Exception as e:
            logger.error(f"Error sending to attendance service: {e}")
            return {"success": False, "error": str(e)}


__all__ = ["InsightFaceRecognitionService"]

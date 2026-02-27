"""
Face Recognition API Routes
Enhanced with Quality & Liveness Checks + Real-time Detection
"""

import logging
from typing import List, Dict, Any
import cv2
import numpy as np
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Body
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.database import get_db
# Using NEW Clean Architecture Services
from app.services.face_recognition_service import face_recognizer
from app.services.insightface_recognition_service import InsightFaceRecognitionService
from app.services.face_quality_service import face_quality_checker
from app.utils.image_utils import base64_to_image, validate_image
from app.schemas.face_recognition import (
    FaceEmbeddingResponse,
    FaceRecognitionResponse,
    AttendanceLogResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register-face", response_model=FaceRecognitionResponse)
async def register_face(
    image: UploadFile = File(..., description="User identification photo"),
    user_id: int = Form(..., description="User ID"),
    username: str = Form(..., description="Username"),
    db: Session = Depends(get_db)
):
    """
    Register a new face for user
    """
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Validate file size (max 10MB)
        if image.size and image.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image file too large. Maximum size is 10MB"
            )
        
        # Read image data
        image_data = await image.read()
        
        # Validate image data
        if len(image_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image file"
            )
        
        logger.info(f"Processing image: {image.filename}, size: {len(image_data)} bytes, content_type: {image.content_type}")
        
        # Get face recognition service instance (InsightFace Manual ONNX)
        service = InsightFaceRecognitionService()
        
        # Register face
        result = await service.register_face(image_data, user_id, username, db)
        
        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content=result
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in register_face: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/recognize-face", response_model=FaceRecognitionResponse)
async def recognize_face(
    image: UploadFile = File(..., description="Image to recognize"),
    # recognition_type: str = Form(..., description="Type of recognition: check_in or check_out")
    # For compatibility, we keep receiving the form field but will force usage or just log as check_time
    recognition_type: str = Form(default="check_time", description="Deprecated, will be saved as check_time"),
    validation_mode: str = Form(default="normal", description="Validation mode: 'strict' for full checks, 'normal' for basic checks only"),
    baseline_yaw: str = Form(default="0", description="Baseline yaw from step1 (optional)"),
    baseline_roll: str = Form(default="0", description="Baseline roll from step1 (optional)"),
    baseline_pitch: str = Form(default="0", description="Baseline pitch from step1 (optional)"),
    db: Session = Depends(get_db)
):
    """
    Recognize face from image for attendance with flexible validation:
    - validation_mode='strict': Full 3-stage validation (Quality + Liveness + Recognition)
    - validation_mode='normal': Basic validation only (Recognition only, faster)
    
    Stages (when strict):
    1. Quality Check (blur, brightness, contrast)
    2. Liveness & Head Pose Check
    3. Face Recognition
    """
    try:
        # Override to check_time as per new requirement
        recognition_type = "check_time"

        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Removed legacy check_in/check_out validation
        
        # Validate validation mode (support 'normal', 'strict' and 'challenge')
        
        # Validate validation mode (support 'normal', 'strict' and 'challenge')
        if validation_mode not in ["normal", "strict", "challenge"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="validation_mode must be 'normal', 'strict' or 'challenge'"
            )
        
        # Read image data
        image_data = await image.read()
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": "INVALID_IMAGE",
                    "message": "Không thể đọc ảnh. Vui lòng thử lại!"
                }
            )
        
        # CHALLENGE MODE: require the user to move head (yaw OR pitch OR roll)
        if validation_mode == "challenge":
            try:
                # Detect faces quickly using the face recognizer
                faces = face_recognizer.app.get(img)
                if not faces or len(faces) == 0:
                    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={
                        "success": False,
                        "require_challenge": True,
                        "message": "Không tìm thấy khuôn mặt. Vui lòng đưa mặt vào camera."
                    })

                # Keep only the largest detected face (by bbox area)
                if len(faces) > 1:
                    try:
                        faces = sorted(
                            faces,
                            key=lambda f: ((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])) if hasattr(f, 'bbox') else 0,
                            reverse=True
                        )
                    except Exception:
                        # Fallback: keep first if bbox structure unexpected
                        pass
                face = faces[0]
                # landmarks: numpy array shape (5,2)
                kps = face.kps
                angles = face_quality_checker.check_head_pose(kps)
                yaw, pitch, roll = angles.get('yaw', 0.0), angles.get('pitch', 0.0), angles.get('roll', 0.0)
                logger.info(f"📐 Challenge Pose: Yaw={yaw:.1f}, Pitch={pitch:.1f}, Roll={roll:.1f}")

                # NEW: Delta check vs baseline sent from client (pre-step1 capture)
                try:
                    base_yaw = float(baseline_yaw)
                    base_roll = float(baseline_roll)
                    base_pitch = float(baseline_pitch)
                except Exception:
                    return JSONResponse(status_code=400, content={
                        "success": False,
                        "message": "Dữ liệu baseline không hợp lệ."
                    })

                # Compute deltas between current pose and baseline
                delta_yaw = abs(yaw - base_yaw)
                delta_roll = abs(roll - base_roll)
                delta_pitch = abs(pitch - base_pitch)
                logger.info(f"🔄 Delta Check: dYaw={delta_yaw:.1f}, dRoll={delta_roll:.1f}, dPitch={delta_pitch:.1f}")

                # Require a clear movement compared to baseline (>= 15° on any axis)
                is_moved_enough = delta_yaw > 15.0 or delta_roll > 15.0 or delta_pitch > 15.0
                if not is_moved_enough:
                    logger.warning("❌ Fake detected: No sufficient movement between steps.")
                    return JSONResponse(status_code=400, content={
                        "success": False,
                        "require_challenge": True,
                        "message": "Chưa phát hiện chuyển động đủ lớn. Vui lòng quay đầu rõ ràng hơn."
                    })

                # If movement detected, proceed to recognition (fast path)
                service = InsightFaceRecognitionService()
                result = await service.recognize_face(image_data, recognition_type, db)
                return JSONResponse(status_code=status.HTTP_200_OK, content=result)
            except Exception as e:
                logger.error(f"Error during challenge validation: {e}")
                return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

        # Light validation for 'normal' mode: allow up to 25 degrees on any axis
        if validation_mode == "normal":
            logger.info("⚡ NORMAL MODE: Light pose validation (max 25°)")
            try:
                faces = face_recognizer.app.get(img)
                if not faces or len(faces) == 0:
                    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={
                        "success": False,
                        "error": "NO_FACE",
                        "message": "Không tìm thấy khuôn mặt. Vui lòng đưa mặt vào camera."
                    })

                # Keep only the largest detected face (by bbox area)
                if len(faces) > 1:
                    try:
                        faces = sorted(
                            faces,
                            key=lambda f: ((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])) if hasattr(f, 'bbox') else 0,
                            reverse=True
                        )
                    except Exception:
                        pass
                face = faces[0]
                kps = face.kps
                angles = face_quality_checker.check_head_pose(kps)
                yaw, pitch, roll = angles.get('yaw', 0.0), angles.get('pitch', 0.0), angles.get('roll', 0.0)
                logger.info(f"📐 Normal Pose Check: Yaw={yaw:.1f}, Pitch={pitch:.1f}, Roll={roll:.1f}")

                # If any angle exceeds 25°, ask to look straight
                if abs(yaw) > 25.0 or abs(pitch) > 25.0 or abs(roll) > 25.0:
                    return JSONResponse(status_code=400, content={
                        "success": False,
                        "error": "HEAD_POSE_TOO_LARGE",
                        "message": "Vui lòng nhìn thẳng vào camera (góc < 25°)."
                    })

            except Exception as e:
                logger.warning(f"Normal mode: quick pose check failed: {e}")

            logger.info("📋 Processing face recognition directly...")
            service = InsightFaceRecognitionService()
            result = await service.recognize_face(image_data, recognition_type, db)

            if result.get("success"):
                result["validation"] = {
                    "mode": "normal",
                    "quality_check": "light_pose",
                    "liveness_check": "skipped"
                }
                logger.info(f"✅ Recognition successful: {result.get('data', {}).get('user', {}).get('username', 'Unknown')}")

            return JSONResponse(status_code=status.HTTP_200_OK, content=result)
        
        # STRICT MODE: Full 3-stage validation
        logger.info("=" * 50)
        logger.info("🔍 STARTING 3-STAGE VALIDATION (STRICT MODE)")
        logger.info("=" * 50)
        
        # ============================================
        # STAGE 1: LIVENESS & HEAD POSE CHECK (using face_liveness_service)
        # ============================================
        logger.info("📋 STAGE 1: Liveness & Head Pose Check")

        # Detect faces first to get landmarks and bbox
        faces = face_recognizer.app.get(img)
        if not faces or len(faces) == 0:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={
                "success": False,
                "error": "NO_FACE",
                "message": "Không tìm thấy khuôn mặt. Vui lòng đưa mặt vào camera."
            })
        # Keep only the largest detected face (by bbox area)
        if len(faces) > 1:
            try:
                faces = sorted(
                    faces,
                    key=lambda f: ((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])) if hasattr(f, 'bbox') else 0,
                    reverse=True
                )
            except Exception:
                pass

        face = faces[0]
        kps = face.kps if hasattr(face, 'kps') else None

        # Build bbox as integers if available
        bbox = None
        if hasattr(face, 'bbox'):
            try:
                b = getattr(face, 'bbox')
                x1, y1, x2, y2 = int(b[0]), int(b[1]), int(b[2]), int(b[3])
                bbox = [x1, y1, x2, y2]
            except Exception:
                bbox = None

        # Use singleton liveness detector
        from app.services.face_liveness_service import face_liveness_detector
        liv_result = face_liveness_detector.check_liveness(img, bbox=bbox)

        if not liv_result.is_real:
            logger.warning(f"❌ Liveness check failed: {liv_result.message}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": "LIVENESS_FAILED",
                    "message": liv_result.message,
                    "details": {
                        "confidence": float(liv_result.confidence),
                        "label": liv_result.label,
                        "liveness_message": liv_result.message
                    }
                }
            )

        logger.info(f"✅ Liveness passed (confidence={liv_result.confidence:.2%})")

        # ============================================
        # STAGE 2: QUALITY CHECK (using face_quality_service)
        # ============================================
        logger.info("📋 STAGE 2: Quality Check")

        # Use the existing face_quality_checker singleton
        quality_result = face_quality_checker.check_all(img, landmarks=kps)

        if not getattr(quality_result, 'is_valid', False):
            # Build message and return details
            error_message = "; ".join(quality_result.messages) if quality_result.messages else "POOR_QUALITY"
            logger.warning(f"❌ Quality check failed: {error_message}")

            # Map common messages to error codes
            error_code = "POOR_QUALITY"
            if quality_result.blur_score is not None and quality_result.blur_score < face_quality_checker.BLUR_THRESHOLD:
                error_code = "BLURRY_IMAGE"
            elif quality_result.details.get('brightness_status') == "TOO_DARK":
                error_code = "TOO_DARK"
            elif quality_result.details.get('brightness_status') == "TOO_BRIGHT":
                error_code = "TOO_BRIGHT"

            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=jsonable_encoder({
                    "success": False,
                    "error": error_code,
                    "message": error_message,
                    "details": {
                        "blur_score": float(quality_result.blur_score) if quality_result.blur_score is not None else None,
                        "brightness": float(quality_result.brightness) if quality_result.brightness is not None else None,
                        "head_pose": getattr(quality_result, 'head_pose_angles', None),
                        "quality_details": quality_result.details
                    }
                })
            )

        logger.info("✅ Quality check passed")

        # ============================================
        # STAGE 3: FACE RECOGNITION
        # ============================================
        logger.info("📋 STAGE 3: Face Recognition")
        service = InsightFaceRecognitionService()
        
        # Recognize face
        result = await service.recognize_face(image_data, recognition_type, db)
        
        # Add quality and liveness info to response
        if result.get("success"):
            result["validation"] = {
                "mode": "strict",
                "quality_score": float(getattr(quality_result, 'blur_score', None)),
                "liveness_confidence": float(getattr(liv_result, 'confidence', 0.0)),
                "head_pose": getattr(quality_result, 'head_pose_angles', None),
                "all_checks_passed": True
            }
            logger.info(f"✅ Recognition successful: {result.get('data', {}).get('user', {}).get('username', 'Unknown')}")
        
        logger.info("=" * 50)
        
        # Always return 200 OK for strict mode, let client handle success/failure
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in recognize_face: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/embeddings/{user_id}", response_model=List[FaceEmbeddingResponse])
async def get_user_embeddings(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all face embeddings for a user
    """
    try:
        # Note: This endpoint is deprecated, InsightFace doesn't use this method
        # service = InsightFaceRecognitionService()
        # embeddings = service.get_user_embeddings(user_id, db)
        embeddings = []
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": embeddings,
                "count": len(embeddings)
            }
        )
        
    except Exception as e:
        logger.error(f"Error in get_user_embeddings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.delete("/embeddings/{embedding_id}")
async def delete_user_embedding(
    embedding_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a face embedding
    """
    try:
        from app.core.database import FaceEmbedding
        
        # Find embedding
        embedding = db.query(FaceEmbedding).filter(FaceEmbedding.id == embedding_id).first()
        
        if not embedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Face embedding not found"
            )
        
        # Delete embedding
        db.delete(embedding)
        db.commit()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Face embedding deleted successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_user_embedding: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/attendance-logs", response_model=List[AttendanceLogResponse])
async def get_attendance_logs(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get recent attendance logs
    """
    try:
        # Note: This endpoint is deprecated, InsightFace doesn't use this method
        # service = InsightFaceRecognitionService()
        # logs = service.get_attendance_logs(db, limit)
        logs = []
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": logs,
                "count": len(logs)
            }
        )
        
    except Exception as e:
        logger.error(f"Error in get_attendance_logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/confirm-attendance")
async def confirm_attendance(
    recognition_log_id: int = Form(..., description="Recognition log ID from previous recognition"),
    db: Session = Depends(get_db)
):
    """
    Confirm attendance after face recognition
    Only saves to attendance system when user explicitly confirms
    """
    try:
        from app.core.database import AttendanceLog
        
        # Find the recognition log
        recognition_log = db.query(AttendanceLog).filter(
            AttendanceLog.id == recognition_log_id,
            AttendanceLog.status == "recognized"
        ).first()
        
        if not recognition_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recognition log not found or already processed"
            )
        
        # Get face recognition service instance
        service = InsightFaceRecognitionService()
        
        # Prepare user match data
        user_match = {
            'user_id': recognition_log.user_id,
            'username': recognition_log.username,
            'confidence_score': recognition_log.similarity_score
        }
        
        # Send to attendance service
        attendance_result = service._send_to_attendance_service(
            user_match, 
            recognition_log.recognition_type, 
            recognition_log.similarity_score,
            timestamp=recognition_log.checkin_time
        )
        
        # Update recognition log status
        recognition_log.status = "confirmed"
        recognition_log.notes = "Attendance confirmed by user"
        db.commit()
        
        logger.info(f"Attendance confirmed for user: {recognition_log.username} - {recognition_log.recognition_type}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": f"Attendance confirmed successfully for {recognition_log.username}",
                "data": {
                    "user_id": recognition_log.user_id,
                    "username": recognition_log.username,
                    "recognition_type": recognition_log.recognition_type,
                    "confidence_score": recognition_log.similarity_score,
                    "timestamp": recognition_log.checkin_time.isoformat(),
                    "attendance_result": attendance_result
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in confirm_attendance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/stats")
async def get_service_stats(db: Session = Depends(get_db)):
    """
    Get service statistics
    """
    try:
        from app.core.database import FaceEmbedding, AttendanceLog
        
        # Count total embeddings
        total_embeddings = db.query(FaceEmbedding).count()
        
        # Count total attendance logs
        total_logs = db.query(AttendanceLog).count()
        successful_logs = db.query(AttendanceLog).filter(AttendanceLog.status == "confirmed").count()  # Updated to "confirmed"
        recognized_logs = db.query(AttendanceLog).filter(AttendanceLog.status == "recognized").count()  # New: waiting for confirmation
        unknown_faces = db.query(AttendanceLog).filter(AttendanceLog.status == "unknown_face").count()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": {
                    "embeddings": {
                        "total": total_embeddings
                    },
                    "attendance_logs": {
                        "total": total_logs,
                        "confirmed": successful_logs,
                        "waiting_confirmation": recognized_logs,
                        "unknown_faces": unknown_faces,
                        "success_rate": (successful_logs / total_logs * 100) if total_logs > 0 else 0
                    }
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error in get_service_stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/detect-face")
async def detect_face_realtime(
    payload: Dict[str, Any] = Body(..., description="JSON payload with base64 image")
):
    """
    Real-time face detection endpoint for camera preview with FULL VALIDATION
    Returns: face bounding boxes, validation status, confidence
    Used by mobile app to show live feedback before capture
    
    Validation stages:
    1. Image Quality (blur, brightness, contrast)
    2. Face Detection (SCRFD)
    3. Multi-face check
    4. Face size & position validation
    """
    try:
        # Extract base64 image from payload
        image_base64 = payload.get("image")
        if not image_base64:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing 'image' field in payload"
            )
        
        # Remove data URI prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # Decode base64 to bytes
        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            logger.error(f"Base64 decode error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid base64 image data"
            )
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": False,
                    "face_detected": False,
                    "message": "Không thể đọc ảnh",
                    "validation": {
                        "isValid": False,
                        "message": "Ảnh không hợp lệ"
                    }
                }
            )
        
        # STAGE 1: Quality Check using centralized singleton
        # Blur check
        blur_score, is_sharp = face_quality_checker.check_blur(img)
        if not is_sharp:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "face_detected": False,
                    "message": "Ảnh bị mờ",
                    "validation": {
                        "isValid": False,
                        "message": "GIỮ CAMERA THẬT ỔN ĐỊNH",
                        "details": {"blur_score": float(blur_score)}
                    }
                }
            )
        
        # Brightness check
        brightness, bright_ok, bright_msg = face_quality_checker.check_brightness(img)
        if not bright_ok:
            msg = "CẢI THIỆN ÁNH SÁNG" if bright_msg == "TOO_DARK" else "GIẢM ÁNH SÁNG"
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "face_detected": False,
                    "message": "Ánh sáng không phù hợp",
                    "validation": {
                        "isValid": False,
                        "message": msg,
                        "details": {"brightness": float(brightness), "status": bright_msg}
                    }
                }
            )
        
        # STAGE 2: Face Detection using SCRFD
        service = InsightFaceRecognitionService()
        face_info = service.detect_faces(img)
        
        if not face_info or len(face_info) == 0:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "face_detected": False,
                    "message": "Không phát hiện khuôn mặt",
                    "validation": {
                        "isValid": False,
                        "message": "ĐƯA MẶT VÀO KHUNG HÌNH"
                    }
                }
            )
        
        # STAGE 3: Multi-face check
        if len(face_info) > 1:
            bboxes = [[int(f.bbox[0]), int(f.bbox[1]), int(f.bbox[2]), int(f.bbox[3])] for f in face_info]
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "face_detected": True,
                    "face_count": len(face_info),
                    "message": "Phát hiện nhiều khuôn mặt",
                    "bboxes": bboxes,
                    "validation": {
                        "isValid": False,
                        "message": "CHỈ ĐƯỢC CÓ 1 NGƯỜI"
                    }
                }
            )
        
        # STAGE 4: Single face validation
        face = face_info[0]
        bbox = face.bbox.astype(int).tolist()  # [x1, y1, x2, y2]
        det_score = float(face.det_score)
        
        img_h, img_w = img.shape[:2]
        face_w = bbox[2] - bbox[0]
        face_h = bbox[3] - bbox[1]
        face_area_percent = (face_w * face_h) / (img_w * img_h) * 100
        
        # Validation rules (mask-friendly)
        validation = {
            "isValid": True,
            "message": "✓ KHUÔN MẶT HỢP LỆ",
            "details": []
        }
        
        # Check 1: Face size (10-60% of image)
        if face_area_percent < 10:
            validation["isValid"] = False
            validation["message"] = "DI LẠI GẦN HƠN"
            validation["details"].append(f"Khuôn mặt quá nhỏ ({face_area_percent:.1f}%)")
        elif face_area_percent > 60:
            validation["isValid"] = False
            validation["message"] = "LÙI RA XA HƠN"
            validation["details"].append(f"Khuôn mặt quá gần ({face_area_percent:.1f}%)")
        
        # Check 2: Detection confidence (>= 0.5)
        if det_score < 0.5:
            validation["isValid"] = False
            validation["message"] = "CẢI THIỆN ÁNH SÁNG"
            validation["details"].append(f"Độ tin cậy thấp ({det_score:.2f})")
        
        # Check 3: Face position (not too close to edges)
        edge_threshold = 0.05  # 5% margin
        if (bbox[0] < img_w * edge_threshold or 
            bbox[2] > img_w * (1 - edge_threshold) or
            bbox[1] < img_h * edge_threshold or
            bbox[3] > img_h * (1 - edge_threshold)):
            validation["isValid"] = False
            validation["message"] = "GIỮ MẶT TRONG KHUNG HÌNH"
            validation["details"].append("Khuôn mặt quá gần mép")
        
        # Return detection result
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "face_detected": True,
                "face_count": 1,
                "bbox": bbox,  # [x1, y1, x2, y2]
                "confidence": det_score,
                "face_area_percent": round(face_area_percent, 2),
                "quality": {
                    "blur_score": blur_score,
                    "brightness": brightness
                },
                "validation": validation
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in detect_face_realtime: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": f"Lỗi server: {str(e)}"
            }
        )


@router.post("/detect-face-with-ui")
async def detect_face_with_ui(
    image: UploadFile = File(..., description="Image for real-time detection with UI")
):
    """
    Detect face với UI feedback (khung xanh/đỏ + hướng dẫn)
    - Khung XANH: Vị trí tốt, đang nhận diện
    - Khung ĐỎ: Có vấn đề, cần điều chỉnh
    - Chỉ lấy face LỚN NHẤT nếu có nhiều face
    
    Returns:
        - success: bool
        - message: Hướng dẫn người dùng
        - status: "good" | "bad"
        - face_data: Thông tin face (nếu có)
        - annotated_image: Base64 của ảnh đã vẽ UI
    """
    try:
        # Read image
        image_data = await image.read()
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": "INVALID_IMAGE",
                    "message": "Không thể đọc ảnh"
                }
            )
        
        # Process với UI
        result, annotated_img = face_recognizer.process_face_with_ui(
            img,
            skip_quality_check=False,
            skip_liveness_check=True,  # Skip liveness cho realtime (nhanh hơn)
            draw_guide=True  # Vẽ khung oval hướng dẫn
        )
        
        # Encode annotated image to base64
        _, buffer = cv2.imencode('.jpg', annotated_img)
        annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Build response
        response_data = {
            "success": result.success,
            "message": result.message,
            "annotated_image": f"data:image/jpeg;base64,{annotated_base64}"
        }
        
        if result.face_data:
            response_data["face_data"] = {
                "bbox": result.face_data.bbox,
                "confidence": result.face_data.confidence,
                "landmarks": result.face_data.landmarks
            }
        
        if result.quality_result:
            response_data["quality"] = {
                "is_valid": result.quality_result.is_valid,
                "blur_score": result.quality_result.blur_score,
                "brightness": result.quality_result.brightness,
                "head_pose": result.quality_result.head_pose_angles,
                "messages": result.quality_result.messages
            }
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except Exception as e:
        logger.error(f"Error in detect_face_with_ui: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": f"Lỗi server: {str(e)}"
            }
        )

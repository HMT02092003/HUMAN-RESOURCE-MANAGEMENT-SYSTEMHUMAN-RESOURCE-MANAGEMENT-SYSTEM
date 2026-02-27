"""
Enhanced Face Recognition Routes
=================================
API endpoints với:
- Ngưỡng thấp cho 1-shot learning (MIN_THRESHOLD = 0.35)
- Validation nghiêm ngặt với thông báo lỗi chi tiết
- Anti-spoofing check
"""

import logging
from typing import Dict, Any
import numpy as np
import json
import os
import uuid
from sqlalchemy import select

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, FaceEmbedding, AttendanceLog
from app.services.enhanced_insightface_service import enhanced_face_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Note: Model initialization is centrally managed in main.py lifespan


@router.post("/enhanced/register-face")
async def enhanced_register_face(
    image: UploadFile = File(..., description="User identification photo"),
    user_id: int = Form(..., description="User ID"),
    username: str = Form(..., description="Username"),
    full_name: str = Form(None, description="Full name"),
    db: Session = Depends(get_db)
):
    """
    Đăng ký khuôn mặt mới với validation nghiêm ngặt
    
    **Yêu cầu ảnh:**
    - Nhìn thẳng vào camera (góc < 15°)
    - Không đeo kính râm, khẩu trang
    - Ánh sáng đủ, không quá tối/chói
    - Ảnh không mờ
    - Không giả mạo (ảnh in, video)
    """
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File phải là ảnh (JPEG, PNG, ...)"
            )
        
        # Validate file size (max 10MB)
        if image.size and image.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File ảnh quá lớn. Tối đa 10MB."
            )
        
        # Read image data
        image_data = await image.read()
        
        if len(image_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File ảnh rỗng"
            )
        
        logger.info(f"📸 Registering face for user_id={user_id}, username={username}")
        
        # Process image với STRICT validation
        result = enhanced_face_service.process_image(
            image_data, 
            validation_mode='strict'
        )
        
        if not result["success"]:
            # Trả về lỗi chi tiết từ validation
            logger.warning(f"❌ Registration failed: {result['message']}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": result["message"],
                    "error_code": result.get("error_code", "VALIDATION_FAILED")
                }
            )
        
        # Lưu ảnh vào thư mục uploads (không lưu path vào DB)
        upload_dir = settings.UPLOAD_DIR if hasattr(settings, 'UPLOAD_DIR') else './uploads'
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{user_id}_{uuid.uuid4().hex}.jpg"
        _saved_image_path = os.path.join(upload_dir, filename)
        with open(_saved_image_path, 'wb') as f:
            f.write(image_data)
        
        # Kiểm tra xem user đã có embedding chưa
        existing = db.query(FaceEmbedding).filter(
            FaceEmbedding.user_id == user_id
        ).first()
        
        if existing:
            logger.warning(f"⚠️ User {user_id} already has an active embedding")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": f"User {username} đã được đăng ký. Vui lòng xóa ảnh cũ trước khi đăng ký mới.",
                    "error_code": "ALREADY_REGISTERED"
                }
            )
        
        # Lưu embedding vào database (pgvector accepts list[float])
        embedding_vec = list(map(float, result["embedding"]))

        new_embedding = FaceEmbedding(
            user_id=user_id,
            username=username,
            full_name=full_name,
            face_embedding=embedding_vec,
            confidence_score=100.0  # Registration luôn 100%
        )
        
        db.add(new_embedding)
        db.commit()
        db.refresh(new_embedding)
        
        logger.info(f"✅ Successfully registered face for user {username} (ID: {new_embedding.id})")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": f"Đăng ký khuôn mặt thành công cho {username}",
                "data": {
                    "embedding_id": new_embedding.id,
                    "user_id": user_id,
                    "username": username,
                    # image_path is intentionally omitted to reduce stored metadata
                    "metadata": {
                        "gender": result.get("gender"),
                        "age": result.get("age")
                    }
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in enhanced_register_face: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


def _save_snapshot(image_bytes: bytes) -> str:
    """Helper to save snapshot robustly"""
    try:
        if not image_bytes:
            return ""
        # Resolve upload directory
        base_dir = os.getcwd()
        upload_dir = os.path.join(base_dir, 'uploads')
        
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
        
        # Generate filename
        filename = f"log_{uuid.uuid4().hex}.jpg"
        file_absolute_path = os.path.join(upload_dir, filename)
        
        # Write bytes directly
        with open(file_absolute_path, "wb") as f:
            f.write(image_bytes)
        
        if os.path.exists(file_absolute_path) and os.path.getsize(file_absolute_path) > 0:
            return f"/ai/uploads/{filename}"
        return ""
    except Exception as e:
        logger.error(f"Snapshot save failed: {e}")
        return ""

@router.post("/enhanced/recognize-face")
async def enhanced_recognize_face(
    image: UploadFile = File(..., description="Image to recognize"),
    recognition_type: str = Form(..., description="Type: check_in or check_out"),
    validation_mode: str = Form(
        default="strict", 
        description="Validation mode: 'strict' (full checks) or 'normal' (skip liveness)"
    ),
    db: Session = Depends(get_db)
):
    """
    Nhận diện khuôn mặt với ngưỡng thấp cho 1-shot learning
    """
    try:
        # Validate inputs
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File phải là ảnh")
        
        if recognition_type not in ["check_in", "check_out"]:
            raise HTTPException(status_code=400, detail="recognition_type phải là 'check_in' hoặc 'check_out'")
        
        # Read image
        image_data = await image.read()
        
        # SAVE SNAPSHOT IMMEDIATELY
        snapshot_url = _save_snapshot(image_data)
        logger.info(f"📸 Enhanced Recognition - Snapshot URL: {snapshot_url}")
        
        logger.info(f"🔍 Starting recognition - Type: {recognition_type}, Mode: {validation_mode}")
        
        # STAGE 1: PROCESS IMAGE
        result = enhanced_face_service.process_image(image_data, validation_mode=validation_mode)
        
        if not result["success"]:
            logger.warning(f"❌ Validation failed: {result['message']}")
            
            # Log attendance with status failed
            failed_log = AttendanceLog(
                user_id=0,
                username='unknown',
                recognition_type=recognition_type,
                similarity_score=0.0,
                status='validation_failed',
                image_snapshot_url=snapshot_url
            )
            db.add(failed_log)
            db.commit()
            
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": result["message"],
                    "error_code": result.get("error_code", "VALIDATION_FAILED"),
                    "data": None,
                    "image_snapshot_url": snapshot_url
                }
            )
        
        # STAGE 2: COMPARE WITH DATABASE
        input_embedding = np.array(result["embedding"])
        emb_list = input_embedding.tolist() if hasattr(input_embedding, 'tolist') else list(map(float, input_embedding))
        distance_expr = FaceEmbedding.face_embedding.l2_distance(emb_list)
        stmt = select(FaceEmbedding, distance_expr.label('distance')).order_by(distance_expr).limit(1)

        res = db.execute(stmt).first()

        if not res:
            logger.warning("⚠️ No face embeddings in database")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "message": "Hệ thống chưa có dữ liệu khuôn mặt nào.",
                    "error_code": "NO_EMBEDDINGS",
                    "data": None,
                    "image_snapshot_url": snapshot_url
                }
            )

        best_match = res[0]
        distance = float(res[1]) if res[1] is not None else None
        best_score = max(0.0, (2.0 - distance) / 2.0) if distance is not None else 0.0
        
        # STAGE 3: DECISION MAKING
        MIN_THRESHOLD = enhanced_face_service.MIN_THRESHOLD
        SAFE_THRESHOLD = enhanced_face_service.SAFE_THRESHOLD
        
        if best_score >= MIN_THRESHOLD and best_match:
            # RECOGNIZED
            confidence_level = "high" if best_score >= SAFE_THRESHOLD else "low"
            status_text = "recognized"
            warning_msg = "" if best_score >= SAFE_THRESHOLD else " (Độ tin cậy thấp)"
            
            log = AttendanceLog(
                user_id=best_match.user_id,
                username=best_match.username,
                recognition_type=recognition_type,
                similarity_score=float(best_score),
                matched_by_type='ENHANCED',
                status=status_text,
                image_snapshot_url=snapshot_url
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": f"Nhận diện thành công{warning_msg}",
                    "data": {
                        "user": {
                            "user_id": best_match.user_id,
                            "username": best_match.username,
                            "full_name": best_match.full_name
                        },
                        "confidence": {
                            "score": float(best_score),
                            "percentage": float(best_score * 100),
                            "level": confidence_level
                        },
                        "recognition_log_id": log.id,
                        "image_snapshot_url": snapshot_url
                    }
                }
            )
        else:
            # UNRECOGNIZED
            stranger_log = AttendanceLog(
                user_id=0,
                username='stranger',
                recognition_type=recognition_type,
                similarity_score=float(best_score),
                status='unrecognized',
                image_snapshot_url=snapshot_url
            )
            db.add(stranger_log)
            db.commit()
            
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "message": "Không nhận diện được người dùng.",
                    "error_code": "UNRECOGNIZED",
                    "data": {
                        "best_similarity": float(best_score),
                    },
                    "image_snapshot_url": snapshot_url
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in enhanced_recognize_face: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


@router.get("/enhanced/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "message": "Enhanced Face Recognition Service is running",
        "models": {
            "insightface": enhanced_face_service.app is not None,
            "anti_spoofing": enhanced_face_service.anti_spoof_sess is not None
        },
        "thresholds": {
            "min_threshold": enhanced_face_service.MIN_THRESHOLD,
            "safe_threshold": enhanced_face_service.SAFE_THRESHOLD,
            "blur_threshold": enhanced_face_service.BLUR_THRESHOLD,
            "pose_threshold": enhanced_face_service.POSE_THRESHOLD
        }
    }


__all__ = ['router']

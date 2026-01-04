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

# Khởi tạo model khi startup
@router.on_event("startup")
async def startup_event():
    """Khởi tạo model AI khi service khởi động"""
    try:
        enhanced_face_service.initialize_models()
        logger.info("✅ Enhanced Face Recognition Service initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize models: {e}")
        raise


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
    
    **Ngưỡng (Thresholds):**
    - MIN_THRESHOLD = 0.35: Ngưỡng sàn (chấp nhận với cảnh báo)
    - SAFE_THRESHOLD = 0.55: Ngưỡng an toàn (tin cậy cao)
    
    **Validation Modes:**
    - `strict`: Full validation (quality + liveness + pose + accessories)
    - `normal`: Basic validation (quality + pose, skip liveness)
    """
    try:
        # Validate inputs
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File phải là ảnh"
            )
        
        if recognition_type not in ["check_in", "check_out"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recognition_type phải là 'check_in' hoặc 'check_out'"
            )
        
        if validation_mode not in ["normal", "strict"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="validation_mode phải là 'normal' hoặc 'strict'"
            )
        
        # Read image
        image_data = await image.read()
        
        logger.info(f"🔍 Starting recognition - Type: {recognition_type}, Mode: {validation_mode}")
        
        # ============================================================
        # STAGE 1: PROCESS IMAGE (VALIDATION + EXTRACT EMBEDDING)
        # ============================================================
        result = enhanced_face_service.process_image(
            image_data,
            validation_mode=validation_mode
        )
        
        if not result["success"]:
            # Trả về lỗi chi tiết từ validation pipeline
            logger.warning(f"❌ Validation failed: {result['message']}")
            
            # Log attendance với status failed
            failed_log = AttendanceLog(
                user_id=0,
                username='unknown',
                recognition_type=recognition_type,
                confidence_score=0,
                image_path=None,
                face_location=None,
                status='validation_failed'
            )
            db.add(failed_log)
            db.commit()
            
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": result["message"],
                    "error_code": result.get("error_code", "VALIDATION_FAILED"),
                    "data": None
                }
            )
        
        # ============================================================
        # STAGE 2: COMPARE WITH DATABASE (1-SHOT LEARNING)
        # ============================================================
        input_embedding = np.array(result["embedding"])
        
        # DB-side nearest neighbor search using pgvector (L2 distance)
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
                    "message": "Hệ thống chưa có dữ liệu khuôn mặt nào. Vui lòng đăng ký trước.",
                    "error_code": "NO_EMBEDDINGS",
                    "data": None
                }
            )

        best_match = res[0]
        distance = float(res[1]) if res[1] is not None else None
        # Convert L2 distance -> similarity in [0,1]
        best_score = max(0.0, (2.0 - distance) / 2.0) if distance is not None else 0.0
        logger.info(f"📊 DB best match: user={best_match.username}, distance={distance:.4f}, score={best_score:.4f}")
        
        # ============================================================
        # STAGE 3: DECISION MAKING (1-SHOT LEARNING THRESHOLD)
        # ============================================================
        MIN_THRESHOLD = enhanced_face_service.MIN_THRESHOLD  # 0.35
        SAFE_THRESHOLD = enhanced_face_service.SAFE_THRESHOLD  # 0.55
        
        logger.info(f"🎯 Best Match: {best_match.username if best_match else 'None'} - Score: {best_score:.4f}")
        
        if best_score >= MIN_THRESHOLD and best_match:
            # ✅ NHẬN DIỆN THÀNH CÔNG
            
            # Xác định confidence level
            if best_score >= SAFE_THRESHOLD:
                confidence_level = "high"
                status_text = "recognized"
                warning_msg = ""
            else:
                confidence_level = "low"
                status_text = "low_confidence"
                warning_msg = " (Độ tin cậy thấp - Có thể do thay đổi ngoại hình hoặc chỉ có 1 ảnh mẫu)"
            
            # Tạo attendance log
            log = AttendanceLog(
                user_id=best_match.user_id,
                username=best_match.username,
                recognition_type=recognition_type,
                confidence_score=int(best_score * 100),
                image_path=None,
                face_location=result.get("bbox"),
                status=status_text
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            
            logger.info(f"✅ Recognition successful: {best_match.username} (Score: {best_score:.4f})")
            
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
                        "validation_mode": validation_mode,
                        "note": f"Matched with {confidence_level} confidence. " + 
                               ("Recommend adding more training photos." if confidence_level == "low" else "")
                    }
                }
            )
        
        else:
            # ❌ KHÔNG NHẬN DIỆN ĐƯỢC (STRANGER)
            
            logger.warning(f"❌ No match found. Best score: {best_score:.4f} < {MIN_THRESHOLD}")
            
            # Log as stranger
            stranger_log = AttendanceLog(
                user_id=0,
                username='stranger',
                recognition_type=recognition_type,
                confidence_score=int(best_score * 100) if best_score > 0 else 0,
                image_path=None,
                face_location=result.get("bbox"),
                status='unrecognized'
            )
            db.add(stranger_log)
            db.commit()
            
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "message": "Không nhận diện được người dùng. (Người lạ hoặc khuôn mặt thay đổi quá nhiều)",
                    "error_code": "UNRECOGNIZED",
                    "data": {
                        "best_similarity": float(best_score),
                        "threshold": MIN_THRESHOLD,
                        "note": "Consider registering this face if this is a valid user."
                    }
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

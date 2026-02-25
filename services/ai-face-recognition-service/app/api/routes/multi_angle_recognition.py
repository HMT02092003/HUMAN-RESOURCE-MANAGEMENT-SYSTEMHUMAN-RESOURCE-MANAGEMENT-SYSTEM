import logging
import os
import uuid
import shutil
import cv2
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.multi_angle_recognition_service import multi_angle_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register-faces")
async def register_multiple_faces(
    images: List[UploadFile] = File(..., description="3 ảnh (Thẳng, Trái, Phải)"),
    user_id: int = Form(..., description="User ID"),
    username: str = Form(..., description="Username"),
    full_name: str = Form(None, description="Full name"),
    pose_types: str = Form(..., description="Comma-separated pose types: frontal,left,right"),
    db: Session = Depends(get_db)
):
    """
    Đăng ký khuôn mặt với nhiều góc (1 User - 3 Vectors)
    
    **Cách sử dụng:**
    1. Chụp 3 ảnh: Thẳng, Trái, Phải
    2. Upload cùng lúc 3 ảnh
    3. Chỉ định pose_types: "frontal,left,right"
    
    **Lợi ích:**
    - Tăng độ chính xác nhận diện lên 90%+
    - Hoạt động tốt với góc nghiêng
    - Chuẩn eKYC quốc tế
    """
    try:
        # Validate số lượng ảnh
        if len(images) != 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phải upload đúng 3 ảnh (Thẳng, Trái, Phải)"
            )
        
        # Parse pose types
        poses = [p.strip() for p in pose_types.split(',')]
        if len(poses) != 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pose_types phải có đúng 3 giá trị (VD: 'frontal,left,right')"
            )
        
        # Validate pose types
        valid_poses = {'frontal', 'left', 'right', 'up', 'down'}
        for pose in poses:
            if pose not in valid_poses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pose type '{pose}' không hợp lệ. Chỉ chấp nhận: {valid_poses}"
                )
        
        logger.info(f"📸 Registering {len(images)} faces for user_id={user_id}, poses={poses}")
        
        # Chuẩn bị thư mục uploads (legacy)
        upload_dir = getattr(settings, 'UPLOAD_DIR', './uploads')
        os.makedirs(upload_dir, exist_ok=True)

        # --- Chuẩn bị thư mục dataset theo yêu cầu user ---
        # Structure: dataset/username/pose_type.jpg
        dataset_dir = getattr(settings, 'DATASET_DIR', 'dataset')
        user_save_dir = os.path.join(dataset_dir, username)

        # Clear old data if exists (to replace old images on re-registration)
        if os.path.exists(user_save_dir):
            try:
                shutil.rmtree(user_save_dir)
                logger.info(f"🗑️ Cleared existing dataset for user: {username}")
            except Exception as e:
                logger.error(f"❌ Failed to clear user dataset dir: {e}")

        # Create fresh directory
        os.makedirs(user_save_dir, exist_ok=True)
        # ---------------------------------------------------
        
        # Process từng ảnh
        poses_data = []
        for idx, (image, pose_type) in enumerate(zip(images, poses)):
            # Validate file type
            if not image.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {idx+1} phải là ảnh"
                )
            
            # Read image
            image_bytes = await image.read()
            
            # Process image và extract embedding
            result = multi_angle_service.process_image_for_registration(image_bytes)
            
            if not result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ảnh {idx+1} ({pose_type}): {result['message']}"
                )
            
            # Save original image locally (legacy/backup log)
            filename = f"{user_id}_{pose_type}_{uuid.uuid4().hex}.jpg"
            _saved_path = os.path.join(upload_dir, filename)
            with open(_saved_path, 'wb') as f:
                f.write(image_bytes)

            # --- Save CROPPED face to user dataset ---
            cropped_face = result.get("cropped_face")
            if cropped_face is not None:
                # Filename: frontal.jpg, left.jpg, right.jpg
                save_path = os.path.join(user_save_dir, f"{pose_type}.jpg")
                try:
                    cv2.imwrite(save_path, cropped_face)
                    logger.info(f"✅ Saved cropped face: {save_path}")
                except Exception as e:
                    logger.error(f"❌ Failed to save cropped face: {e}")
            else:
                 logger.warning(f"⚠️ No cropped face returned for {pose_type}")
            # -----------------------------------------

            # Thêm vào danh sách (omit image_path to avoid storing paths in DB if using embedding only)
            poses_data.append({
                "pose_type": pose_type,
                "embedding": result["embedding"],
                "confidence": 100.0,
                "metadata": result.get("metadata", {})
            })
            
            logger.info(f"✅ Processed {pose_type} image for user {username}")
        
        # Lưu tất cả vào database
        reg_result = multi_angle_service.register_multiple_poses(
            db=db,
            user_id=user_id,
            username=username,
            full_name=full_name,
            poses_data=poses_data
        )
        
        if not reg_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=reg_result["message"]
            )
        
        logger.info(f"✅ Successfully registered {len(poses_data)} poses for user {username}")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": reg_result["message"],
                "data": reg_result["data"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in register_multiple_faces: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


@router.post("/recognize-face")
async def recognize_face_multi_angle(
    image: UploadFile = File(..., description="Ảnh cần nhận diện"),
    recognition_type: str = Form(..., description="Type: check_in hoặc check_out"),
    db: Session = Depends(get_db)
):
    """
    Nhận diện khuôn mặt (tự động tìm vector khớp nhất)
    
    **Cách hoạt động:**
    - Hệ thống tự động so sánh với TẤT CẢ các vector (thẳng, trái, phải)
    - Chọn vector có khoảng cách nhỏ nhất
    - Ngưỡng: L2 distance < 1.1 = khớp
    """
    try:
        # Validate recognition type
        if recognition_type not in ["check_in", "check_out"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recognition_type phải là 'check_in' hoặc 'check_out'"
            )
        
        # Validate file
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File phải là ảnh"
            )
        
        # Read image
        image_bytes = await image.read()
        
        logger.info(f"🔍 Starting multi-angle recognition - Type: {recognition_type}")
        
        # Recognize using multi-angle service
        result = multi_angle_service.recognize_face(
            db=db,
            image_bytes=image_bytes,
            recognition_type=recognition_type
        )
        
        if not result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": False,
                    "message": result["message"],
                    "error_code": result.get("error_code", "RECOGNITION_FAILED"),
                    "is_spoof": result.get("is_spoof", False),
                    "image_snapshot_url": result.get("image_snapshot_url")
                }
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": result["message"],
                "data": result["data"] # This contains image_snapshot_url
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in recognize_face_multi_angle: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check cho multi-angle service"""
    return {
        "success": True,
        "message": "Multi-Angle Face Recognition Service đang hoạt động",
        "config": {
            "match_threshold": 1.1,
            "safe_threshold": 0.9,
            "supported_poses": ["frontal", "left", "right"],
            "recommended_poses": 3
        }
    }


__all__ = ['router']

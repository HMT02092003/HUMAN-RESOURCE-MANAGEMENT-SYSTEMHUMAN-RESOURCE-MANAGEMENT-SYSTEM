"""
Batch Registration Routes
==========================
API endpoints cho đăng ký khuôn mặt bằng batch images hoặc video
"""

import logging
import os
import json
import cv2
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import requests

from app.core.database import get_db, FaceEmbedding
from app.services import batch_image_processor
from app.utils.video_frame_extractor import video_extractor
from app.core.config import settings

logger = logging.getLogger(__name__)

def fetch_user_full_name(user_id: int) -> str:
    """Fetch user's full name from auth-service."""
    try:
        base_url = getattr(settings, 'API_GATEWAY_URL', "http://api-gateway:4000")
        urls_to_try = [
            f"{base_url}/api/auth/users/bulk",
            "http://auth-service:4001/api/users/bulk",
            "http://localhost:4001/api/users/bulk"
        ]
        
        payload = {"userIds": [user_id]}
        headers = {"Content-Type": "application/json"}
        
        for url in urls_to_try:
            try:
                resp = requests.post(url, json=payload, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    fetched_users = data.get("data", [])
                    if fetched_users:
                        u_info = fetched_users[0]
                        fn = u_info.get("fullName") or u_info.get("full_name") or u_info.get("name")
                        if fn:
                            return fn
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Error fetching user full name: {e}")
    return None
router = APIRouter()


@router.post("/register-face")
async def register_face_batch(
    images: List[UploadFile] = File(..., description="15-20 ảnh chụp từ nhiều góc"),
    user_id: int = Form(..., description="User ID từ auth-service"),
    username: str = Form(..., description="Username/Employee code"),
    full_name: str = Form(None, description="Full name"),
    fullName: str = Form(None, description="Cấu trúc của Auth service"),
    db: Session = Depends(get_db)
):
    """
    Đăng ký khuôn mặt bằng batch images (15-20 ảnh)
    
    **Quy trình:**
    1. Nhận 15-20 ảnh từ client
    2. Lọc và chấm điểm quality
    3. Chọn top 5-7 ảnh tốt nhất
    4. Tính vector trung bình và normalize
    5. Lưu vector MASTER vào DB
    
    **Yêu cầu:**
    - Ít nhất 10 ảnh
    - Mỗi ảnh < 10MB
    - Chụp ở nơi sáng, camera ổn định
    """
    try:
        # Validate số lượng ảnh
        if len(images) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cần ít nhất 10 ảnh để đăng ký. Hiện tại chỉ có {len(images)} ảnh."
            )
        
        if len(images) > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quá nhiều ảnh ({len(images)}). Tối đa 30 ảnh."
            )
        
        logger.info(f"📸 Registering face for user_id={user_id}, username={username} with {len(images)} images")
        
        # Check if already has MASTER embedding
        existing_embedding = db.query(FaceEmbedding).filter(
            FaceEmbedding.user_id == user_id,
            FaceEmbedding.face_type == 'MASTER',
            FaceEmbedding.is_active == True
        ).first()
        
        if existing_embedding:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": f"User {username} đã được đăng ký. Vui lòng xóa trước khi đăng ký lại.",
                    "error_code": "ALREADY_REGISTERED"
                }
            )
        
        # Read all images
        images_bytes = []
        for img_file in images:
            # Validate file type
            if not img_file.content_type or not img_file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {img_file.filename} không phải là ảnh"
                )
            
            # Read image data
            img_data = await img_file.read()
            
            # Validate size
            if len(img_data) > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {img_file.filename} quá lớn (> 10MB)"
                )
            
            images_bytes.append(img_data)
        
        logger.info(f"✅ Received {len(images_bytes)} images, total size: {sum(len(b) for b in images_bytes) / 1024 / 1024:.2f} MB")
        
        # Process batch
        result = batch_image_processor.batch_processor.process_batch(images_bytes)
        
        if not result["success"]:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": result["message"],
                    "error_code": "BATCH_PROCESSING_FAILED"
                }
            )
        
        # Xử lý hợp nhất tên dựa trên DB Auth
        final_full_name = full_name or fullName
        if not final_full_name:
            fetched_name = fetch_user_full_name(user_id)
            if fetched_name:
                final_full_name = fetched_name
                logger.info(f"✅ Fetched full_name from auth-service for userId={user_id}: {final_full_name}")
        final_full_name = final_full_name or username

        # Save vector to database directly
        new_embedding = FaceEmbedding(
            user_id=user_id,
            username=username,
            full_name=final_full_name,
            embedding_vector=result["vector"],
            face_type='MASTER',
            quality_score=result["metadata"].get("average_quality_score", 0.0)
        )
        
        db.add(new_embedding)
        db.commit()
        db.refresh(new_embedding)
        
        # --- SAVE CROPPED FACES TO DATASET ---
        try:
            dataset_dir = getattr(settings, 'DATASET_DIR', 'dataset')
            # Use 'master' subfolder for batch registration
            user_save_dir = os.path.join(dataset_dir, username, 'master')
            
            # Clear old folder
            if os.path.exists(user_save_dir):
                shutil.rmtree(user_save_dir)
            os.makedirs(user_save_dir, exist_ok=True)
            
            # Save top K faces
            top_faces = result.get("top_k_cropped_faces", [])
            for idx, face_img in enumerate(top_faces):
                if face_img is not None:
                    save_path = os.path.join(user_save_dir, f"{idx}.jpg")
                    cv2.imwrite(save_path, face_img)
            
            logger.info(f"✅ Saved {len(top_faces)} cropped faces to {user_save_dir}")
        except Exception as e:
            logger.error(f"❌ Failed to save dataset images: {e}")
        # ------------------------------------
        
        logger.info(f"✅ Successfully registered MASTER vector for {username} (embedding_id: {new_embedding.id})")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": f"Đăng ký thành công cho user {username}",
                "data": {
                    "user_id": user_id,
                    "username": username,
                    "embedding_id": new_embedding.id,
                    "face_type": "MASTER",
                    "metadata": result["metadata"]
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error in register_face_batch: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check cho batch registration service"""
    return {
        "success": True,
        "message": "Batch Registration Service đang hoạt động",
        "config": {
            "min_images": 10,
            "max_images": 30,
            "recommended_images": "15-20",
            "min_face_size": 60,
            "min_detection_score": 0.65,
            "top_k_images": 7
        }
    }


@router.post("/register-face-video")
async def register_face_video(
    video_file: UploadFile = File(..., description="Video 4 giây quay khuôn mặt"),
    user_id: int = Form(..., description="User ID từ auth-service"),
    username: str = Form(..., description="Username/Employee code"),
    full_name: str = Form(None, description="Full name"),
    fullName: str = Form(None, description="Cấu trúc của Auth service"),
    target_frames: int = Form(40, description="Số frame cần trích xuất từ video"),
    db: Session = Depends(get_db)
):
    """
    Đăng ký khuôn mặt bằng video (PHƯƠNG PHÁP MỚI - NHANH HƠN)
    
    **Quy trình:**
    1. Nhận video 4 giây từ client (file size nhỏ hơn nhiều so với 40 ảnh riêng lẻ)
    2. Trích xuất 40 frames đều từ video bằng OpenCV
    3. Lọc và chấm điểm quality cho từng frame
    4. Chọn top 7 frames tốt nhất
    5. Tính vector trung bình và normalize
    6. Lưu vector MASTER vào DB
    
    **Ưu điểm:**
    - Upload nhanh hơn (1 file video ~2-3MB thay vì 40 ảnh ~20MB)
    - Ổn định hơn (không bị gián đoạn camera như chụp liên tục)
    - Server kiểm soát được frame extraction
    
    **Yêu cầu:**
    - Video 3-5 giây
    - Format: MP4, MOV, AVI
    - Quay ở nơi sáng, giữ camera ổn định
    - File size < 20MB
    """
    try:
        # Validate video file type
        if not video_file.content_type or not video_file.content_type.startswith('video/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File không phải là video. Content-Type: {video_file.content_type}"
            )
        
        # Read video data
        video_data = await video_file.read()
        video_size_mb = len(video_data) / 1024 / 1024
        
        # Validate size
        if video_size_mb > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video quá lớn ({video_size_mb:.1f}MB). Tối đa 20MB."
            )
        
        logger.info(
            f"📹 Registering face for user_id={user_id}, username={username} "
            f"with video ({video_size_mb:.2f}MB, target {target_frames} frames)"
        )
        
        # Check if already has MASTER embedding
        existing_embedding = db.query(FaceEmbedding).filter(
            FaceEmbedding.user_id == user_id,
            FaceEmbedding.face_type == 'MASTER',
            FaceEmbedding.is_active == True
        ).first()
        
        if existing_embedding:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": f"User {username} đã được đăng ký. Vui lòng xóa trước khi đăng ký lại.",
                    "error_code": "ALREADY_REGISTERED"
                }
            )
        
        # Extract frames from video
        logger.info(f"🎬 Extracting {target_frames} frames from video...")
        frames = await video_extractor.extract_frames_from_upload(
            video_data, 
            target_count=target_frames
        )
        
        if not frames or len(frames) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video lỗi hoặc quá ngắn. Chỉ trích xuất được {len(frames)} frames (cần ít nhất 10)."
            )
        
        logger.info(f"✅ Extracted {len(frames)} frames from video")
        
        # Convert frames to bytes for batch processor (reuse existing logic)
        images_bytes = video_extractor.frames_to_bytes_list(frames)
        
        logger.info(f"📦 Processing {len(images_bytes)} frames through batch processor...")
        
        # Process batch (reuse existing batch processor)
        result = batch_image_processor.batch_processor.process_batch(images_bytes)
        
        if not result["success"]:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": result["message"],
                    "error_code": "BATCH_PROCESSING_FAILED"
                }
            )
        
        # Xử lý hợp nhất tên dựa trên DB Auth
        final_full_name = full_name or fullName
        if not final_full_name:
            fetched_name = fetch_user_full_name(user_id)
            if fetched_name:
                final_full_name = fetched_name
                logger.info(f"✅ Fetched full_name from auth-service for userId={user_id}: {final_full_name}")
        final_full_name = final_full_name or username

        # Save vector to database directly (pgvector handles conversion)
        new_embedding = FaceEmbedding(
            user_id=user_id,
            username=username,
            full_name=final_full_name,
            embedding_vector=result["vector"],
            face_type='MASTER',
            quality_score=result["metadata"].get("average_quality_score", 0.0)
        )
        
        db.add(new_embedding)
        db.commit()
        db.refresh(new_embedding)
        
        # --- SAVE CROPPED FACES TO DATASET ---
        try:
            dataset_dir = getattr(settings, 'DATASET_DIR', 'dataset')
            # Use 'master' subfolder for video registration
            user_save_dir = os.path.join(dataset_dir, username, 'master')
            
            # Clear old folder
            if os.path.exists(user_save_dir):
                shutil.rmtree(user_save_dir)
            os.makedirs(user_save_dir, exist_ok=True)
            
            # Save top K faces
            top_faces = result.get("top_k_cropped_faces", [])
            for idx, face_img in enumerate(top_faces):
                if face_img is not None:
                    save_path = os.path.join(user_save_dir, f"{idx}.jpg")
                    cv2.imwrite(save_path, face_img)
            
            logger.info(f"✅ Saved {len(top_faces)} cropped video frames to {user_save_dir}")
        except Exception as e:
            logger.error(f"❌ Failed to save dataset images: {e}")
        # ------------------------------------
        
        logger.info(f"✅ Successfully registered MASTER vector from video for {username} (embedding_id: {new_embedding.id})")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": f"Đăng ký thành công cho user {username} từ video",
                "data": {
                    "user_id": user_id,
                    "username": username,
                    "embedding_id": new_embedding.id,
                    "face_type": "MASTER",
                    "frames_extracted": len(frames),
                    "frames_processed": len(images_bytes),
                    "video_size_mb": round(video_size_mb, 2),
                    "metadata": result["metadata"]
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error in register_face_video: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


@router.post("/register-face-video-multi")
async def register_face_video_multi(
    video_file: UploadFile = File(..., description="Video 3 giây quay một góc cụ thể"),
    user_id: int = Form(..., description="User ID từ auth-service"),
    username: str = Form(..., description="Username/Employee code"),
    full_name: str = Form(None, description="Full name"),
    fullName: str = Form(None, description="Cấu trúc của Auth service"),
    angle_type: str = Form(..., description="Loại góc: CENTER, LEFT, RIGHT, MASK"),
    target_frames: int = Form(90, description="Số frame cần trích xuất (~90 cho 3s)"),
    db: Session = Depends(get_db)
):
    """
    Đăng ký khuôn mặt bằng video cho MỘT GÓC CỤ THỂ (Multi-angle approach)
    
    **Quy trình - MỖI GÓC TẠO 1 VECTOR RIÊNG:**
    1. Nhận video 3 giây cho một góc (CENTER/LEFT/RIGHT/MASK)
    2. Trích xuất ~90 frames đều từ video
    3. **FILTER theo góc quay (yaw angle)** - Loại bỏ frames không đúng góc
    4. Lọc thêm: blur, nhắm mắt, etc.
    5. Chọn top 10-20 frames tốt nhất
    6. Tính vector trung bình từ 10-20 frames
    7. Lưu vector với face_type = angle_type (CENTER/LEFT/RIGHT/MASK)
    
    **Ưu điểm:**
    - Mỗi góc có vector riêng → Độ chính xác cao hơn
    - Filter chặt chẽ theo góc → Chất lượng tốt hơn
    - Recognition so khớp với nhiều góc → Robust hơn
    
    **Yêu cầu:**
    - Video 3 giây, quay đúng góc yêu cầu
    - Format: MP4, MOV, AVI
    - File size < 15MB
    """
    try:
        # Validate angle_type
        valid_angles = ['CENTER', 'LEFT', 'RIGHT', 'MASK']
        if angle_type not in valid_angles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"angle_type phải là một trong: {', '.join(valid_angles)}"
            )
        
        # Validate video file
        if not video_file.content_type or not video_file.content_type.startswith('video/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File không phải là video. Content-Type: {video_file.content_type}"
            )
        
        # Read video data
        video_data = await video_file.read()
        video_size_mb = len(video_data) / 1024 / 1024
        
        if video_size_mb > 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video quá lớn ({video_size_mb:.1f}MB). Tối đa 15MB."
            )
        
        logger.info(
            f"📹 Registering {angle_type} angle for user_id={user_id}, username={username} "
            f"with video ({video_size_mb:.2f}MB, target {target_frames} frames)"
        )
        
        # Extract frames from video
        logger.info(f"🎬 Extracting {target_frames} frames from video...")
        frames = await video_extractor.extract_frames_from_upload(
            video_data, 
            target_count=target_frames
        )
        
        if not frames or len(frames) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video lỗi hoặc quá ngắn. Chỉ trích xuất được {len(frames)} frames (cần ít nhất 20)."
            )
        
        logger.info(f"✅ Extracted {len(frames)} frames from video")
        
        # Convert frames to bytes
        images_bytes = video_extractor.frames_to_bytes_list(frames)
        
        # ✅ KEY CHANGE: Process with angle-specific filtering
        logger.info(f"📦 Processing {len(images_bytes)} frames with {angle_type} angle filter...")
        result = batch_image_processor.batch_processor.process_batch_with_angle_filter(
            images_bytes,
            angle_type=angle_type
        )
        
        if not result["success"]:
            # Build detailed error response for app
            error_message = result.get("message", "Lỗi xử lý video")
            error_code = result.get("error_code", "BATCH_PROCESSING_FAILED")
            metadata = result.get("metadata", {})
            
            # Log detailed stats for debugging
            logger.warning(
                f"❌ Video registration failed for {username} ({angle_type}): "
                f"{metadata.get('valid_images', 0)}/{metadata.get('total_images', 0)} frames passed. "
                f"Rejection stats: {metadata.get('rejection_stats', {})}"
            )
            
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": error_message,
                    "error_code": error_code,
                    "angle_type": angle_type,
                    "metadata": metadata,
                    "detail": error_message  # Add detail field for consistent error format
                }
            )
        
        # Check if this angle already exists for user
        existing_embedding = db.query(FaceEmbedding).filter(
            FaceEmbedding.user_id == user_id,
            FaceEmbedding.face_type == angle_type
        ).first()
        
        # Save vector to database
        # vector_json = json.dumps(result["vector"])  # REMOVED: pgvector expects list, not json string
        
        # Xử lý hợp nhất tên dựa trên DB Auth
        final_full_name = full_name or fullName
        if not final_full_name:
            fetched_name = fetch_user_full_name(user_id)
            if fetched_name:
                final_full_name = fetched_name
                logger.info(f"✅ Fetched full_name from auth-service for userId={user_id}: {final_full_name}")
        final_full_name = final_full_name or username

        if existing_embedding:
            # Update existing
            existing_embedding.embedding_vector = result["vector"]
            existing_embedding.full_name = final_full_name
            existing_embedding.quality_score = result["metadata"].get("average_quality_score", 0.0)
            logger.info(f"🔄 Updated existing {angle_type} embedding for {username}")
        else:
            # Create new
            new_embedding = FaceEmbedding(
                user_id=user_id,
                username=username,
                full_name=final_full_name,
                embedding_vector=result["vector"],
                face_type=angle_type,  # CENTER, LEFT, RIGHT, or MASK
                quality_score=result["metadata"].get("average_quality_score", 0.0)
            )
            db.add(new_embedding)
            logger.info(f"➕ Created new {angle_type} embedding for {username}")
        
        db.commit()

        # --- SAVE CROPPED FACES TO DATASET ---
        try:
            dataset_dir = getattr(settings, 'DATASET_DIR', 'dataset')
            # Use specific angle subfolder (e.g., dataset/username/left)
            user_save_dir = os.path.join(dataset_dir, username, angle_type.lower())
            
            # Clear old folder to overwrite previous attempt for this angle
            if os.path.exists(user_save_dir):
                shutil.rmtree(user_save_dir)
            os.makedirs(user_save_dir, exist_ok=True)
            
            # Save top K faces
            top_faces = result.get("top_k_cropped_faces", [])
            for idx, face_img in enumerate(top_faces):
                if face_img is not None:
                    save_path = os.path.join(user_save_dir, f"{idx}.jpg")
                    cv2.imwrite(save_path, face_img)
                    
            logger.info(f"✅ Saved {len(top_faces)} cropped frames to {user_save_dir}")
        except Exception as e:
            logger.error(f"❌ Failed to save dataset images: {e}")
        # ------------------------------------
        
        # Count total embeddings for this user
        total_embeddings = db.query(FaceEmbedding).filter(
            FaceEmbedding.user_id == user_id
        ).count()
        
        logger.info(
            f"✅ Successfully registered {angle_type} vector for {username} "
            f"({total_embeddings}/4 angles completed)"
        )
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": f"Đăng ký thành công góc {angle_type} cho user {username}",
                "data": {
                    "user_id": user_id,
                    "username": username,
                    "angle_type": angle_type,
                    "frames_extracted": len(frames),
                    "frames_processed": len(images_bytes),
                    "video_size_mb": round(video_size_mb, 2),
                    "total_angles_registered": total_embeddings,
                    "metadata": result["metadata"]
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error in register_face_video_multi ({angle_type}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )


__all__ = ['router']


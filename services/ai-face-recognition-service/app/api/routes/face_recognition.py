"""
Face Recognition API Routes
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.yolov11_face_recognition_service import YOLOv11FaceRecognitionService
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
        
        # Get face recognition service instance
        service = YOLOv11FaceRecognitionService()
        
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
    recognition_type: str = Form(..., description="Type of recognition: check_in or check_out"),
    db: Session = Depends(get_db)
):
    """
    Recognize face from image for attendance
    """
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Validate recognition type
        if recognition_type not in ["check_in", "check_out"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recognition_type must be 'check_in' or 'check_out'"
            )
        
        # Read image data
        image_data = await image.read()
        
        # Get face recognition service instance
        service = YOLOv11FaceRecognitionService()
        
        # Recognize face
        result = await service.recognize_face(image_data, recognition_type, db)
        
        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=result
            )
        else:
            if result.get("error") == "NO_FACE_DETECTED":
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content=result
                )
            elif result.get("error") == "FACE_NOT_RECOGNIZED":
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content=result
                )
            else:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
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
        service = YOLOv11FaceRecognitionService()
        embeddings = service.get_user_embeddings(user_id, db)
        
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
        service = YOLOv11FaceRecognitionService()
        logs = service.get_attendance_logs(db, limit)
        
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
        service = YOLOv11FaceRecognitionService()
        
        # Prepare user match data
        user_match = {
            'user_id': recognition_log.user_id,
            'username': recognition_log.username,
            'confidence_score': recognition_log.confidence_score
        }
        
        # Send to attendance service
        attendance_result = service._send_to_attendance_service(
            user_match, 
            recognition_log.recognition_type, 
            recognition_log.confidence_score
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
                    "confidence_score": recognition_log.confidence_score,
                    "timestamp": recognition_log.timestamp.isoformat(),
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
        active_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.is_active == True).count()
        
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
                        "total": total_embeddings,
                        "active": active_embeddings,
                        "inactive": total_embeddings - active_embeddings
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

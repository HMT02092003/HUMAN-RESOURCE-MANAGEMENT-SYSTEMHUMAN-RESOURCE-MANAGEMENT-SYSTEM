"""
Pydantic schemas for face recognition
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class FaceEmbeddingBase(BaseModel):
    """Base face embedding schema"""
    user_id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username", max_length=100)
    pose_type: Optional[str] = Field("frontal", description="Pose type: frontal, left, right, up, down")
    confidence_score: Optional[int] = Field(0, description="Confidence score")

class FaceEmbeddingCreate(FaceEmbeddingBase):
    """Create face embedding schema"""
    face_embedding: List[float] = Field(..., description="Face embedding vector as list of floats")
    # image_path and is_active removed from schema to reduce stored metadata

class FaceEmbeddingResponse(FaceEmbeddingBase):
    """Face embedding response schema"""
    id: int
    face_embedding: List[float]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FaceRecognitionRequest(BaseModel):
    """Face recognition request schema"""
    recognition_type: str = Field(..., description="Type of recognition: check_in or check_out")

class FaceRecognitionResponse(BaseModel):
    """Face recognition response schema"""
    success: bool
    message: str
    data: Optional[dict] = None
    confidence_score: Optional[float] = None
    user_info: Optional[dict] = None

class AttendanceLogBase(BaseModel):
    """Base attendance log schema"""
    user_id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username", max_length=100)
    recognition_type: str = Field(..., description="Type of recognition")
    confidence_score: float = Field(..., description="Confidence score")
    status: Optional[str] = Field("success", description="Recognition status")

class AttendanceLogCreate(AttendanceLogBase):
    """Create attendance log schema"""
    # image_path removed from schema
    face_location: Optional[dict] = Field(None, description="Face bounding box coordinates")
    notes: Optional[str] = Field(None, description="Additional notes")

class AttendanceLogResponse(AttendanceLogBase):
    """Attendance log response schema"""
    id: int
    face_location: Optional[dict]
    timestamp: datetime
    notes: Optional[str]
    
    class Config:
        from_attributes = True

class HealthResponse(BaseModel):
    """Health check response schema"""
    status: str
    service: str
    version: str
    python_version: str

"""
Database configuration and models
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from app.core.config import settings

# Create database engine
engine = create_engine(settings.DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

class FaceEmbedding(Base):
    """Face embedding model"""
    __tablename__ = "face_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    full_name = Column(String(255), nullable=True)  # Tên đầy đủ của nhân viên
    face_embedding = Column(Text, nullable=False)  # JSON string of face vector
    image_path = Column(String(500), nullable=True)
    confidence_score = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AttendanceLog(Base):
    """Attendance log model"""
    __tablename__ = "attendance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    recognition_type = Column(String(20), nullable=False, index=True)  # 'check_in', 'check_out'
    confidence_score = Column(Integer, nullable=False)
    image_path = Column(String(500), nullable=True)
    face_location = Column(JSON, nullable=True)  # Bounding box coordinates
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status = Column(String(20), default="success", index=True)  # 'success', 'failed', 'unknown_face'
    notes = Column(Text, nullable=True)

# Dependency to get database session
def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
Database configuration and models
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from app.core.config import settings
from pgvector.sqlalchemy import Vector

# Create database engine
engine = create_engine(settings.DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

class FaceEmbedding(Base):
    """
    Face embedding model - Multi-template support (1 User - N Vectors)
    
    Không lưu thông tin user đầy đủ ở đây.
    Chỉ lưu user_id và username để tham chiếu tới auth-service.
    """
    __tablename__ = "face_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to user in auth-service (from auth DB)
    user_id = Column(Integer, nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)  # Employee code
    
    # Store vector as JSON string (512 floats) for easy debugging
    # Production: use BLOB or pgvector
    embedding_vector = Column(Text, nullable=False)
    
    # Face type: MASTER (averaged clean vector), MASK (with mask), GLASSES (with glasses)
    face_type = Column(String(20), default='MASTER', index=True)
    
    # Metadata
    # deprecated fields removed: device_model, image_path, is_active
    quality_score = Column(Float, nullable=True)  # Quality score from filtering
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AttendanceLog(Base):
    """Attendance log model"""
    __tablename__ = "attendance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True) # Nullable for unknown users
    username = Column(String(100), nullable=True)
    checkin_time = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Snapshot image for evidence
    image_snapshot_url = Column(String(500), nullable=True)
    
    # Recognition type: check_in or check_out
    recognition_type = Column(String(50), nullable=False, index=True)
    
    # Status: recognized, not_recognized, spoof, etc.
    status = Column(String(50), default="success", index=True)
    
    # Technical details
    matched_by_type = Column(String(50), nullable=True) # MASTER, MASK, etc.
    similarity_score = Column(Float, nullable=True) # 0.0 - 1.0
    
    # Optional notes
    notes = Column(Text, nullable=True)

    # Removed: confidence_score (redundant), image_path, face_location, timestamp

# Dependency to get database session
def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

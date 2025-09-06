"""
Configuration settings for AI Face Recognition Service
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "AI Face Recognition Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    PORT: int = int(os.getenv("PORT", "4006"))
    
    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5432/ai_face_recognition"
    )
    
    # AI Model Configuration
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.6"))
    FACE_DETECTION_SCALE_FACTOR: float = float(os.getenv("FACE_DETECTION_SCALE_FACTOR", "1.1"))
    FACE_DETECTION_MIN_NEIGHBORS: int = int(os.getenv("FACE_DETECTION_MIN_NEIGHBORS", "5"))
    FACE_DETECTION_MIN_SIZE: int = int(os.getenv("FACE_DETECTION_MIN_SIZE", "30"))
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".bmp"}
    
    # API Gateway Configuration
    API_GATEWAY_URL: str = os.getenv("API_GATEWAY_URL", "http://127.0.0.1:4000")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Model Weights Path
    WEIGHTS_DIR: str = os.getenv("WEIGHTS_DIR", "./weight")
    
    # YOLO Face Recognition Configuration
    YOLO_FACE_MODEL_PATH: str = os.getenv("YOLO_FACE_MODEL_PATH", "./weight/yolov11n-face.pt")
    YOLO_FACE_ONNX_PATH: str = os.getenv("YOLO_FACE_ONNX_PATH", "./weight/yolov11n-face.onnx")
    ARCFACE_MODEL_PATH: str = os.getenv("ARCFACE_MODEL_PATH", "./weight/arcface_r100.pth")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

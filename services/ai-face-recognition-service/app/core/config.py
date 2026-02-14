"""
Configuration settings for AI Face Recognition Service
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()  # Load .env file with PORT=4106

class Settings(BaseSettings):
    """Application settings"""
    
    # Service Configuration
    SERVICE_NAME: str = "AI Face Recognition Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    PORT: int = int(os.getenv("PORT", "4106"))
    
    # Database Configuration
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "123456")
    DB_HOST: str = os.getenv("DB_HOST", "postgres")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "ai_face_recognition")

    @property
    def DATABASE_URL(self) -> str:
        url = f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        # print(f"DEBUG: DATABASE_URL is {url}")
        return url
    
    # AI Model Configuration
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))  # Lower threshold for masks
    FACE_DETECTION_SCALE_FACTOR: float = float(os.getenv("FACE_DETECTION_SCALE_FACTOR", "1.1"))
    FACE_DETECTION_MIN_NEIGHBORS: int = int(os.getenv("FACE_DETECTION_MIN_NEIGHBORS", "5"))
    FACE_DETECTION_MIN_SIZE: int = int(os.getenv("FACE_DETECTION_MIN_SIZE", "30"))
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    DATASET_DIR: str = os.getenv("DATASET_DIR", "./dataset")
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".bmp"}
    
    # API Gateway Configuration
    API_GATEWAY_URL: str = os.getenv("API_GATEWAY_URL", "http://127.0.0.1:4000")
    # Optional service token to authenticate between internal services
    SERVICE_API_TOKEN: Optional[str] = os.getenv("SERVICE_API_TOKEN", None)
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # InsightFace Model Configuration (SCRFD + ArcFace from buffalo_l pack)
    MODELS_DIR: str = os.getenv("MODELS_DIR", "../../models/buffalo_l")
    DET_MODEL_NAME: str = "det_10g.onnx"  # SCRFD detection
    REC_MODEL_NAME: str = "w600k_r50.onnx"  # ArcFace recognition
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = 'ignore'

# Global settings instance
settings = Settings()

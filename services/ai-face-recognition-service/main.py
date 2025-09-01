#!/usr/bin/env python3
"""
AI Face Recognition Service - FastAPI Server
Sử dụng Python với các thư viện AI mạnh mẽ
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import face_recognition
from app.services.yolov11_face_recognition_service import YOLOv11FaceRecognitionService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting AI Face Recognition Service...")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
    
    # Initialize AI models
    try:
        await YOLOv11FaceRecognitionService.initialize_models()
        logger.info("✅ YOLOv11 + ArcFace models initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize YOLOv11 + ArcFace models: {e}")
    
    logger.info("🎉 AI Face Recognition Service started successfully!")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Face Recognition Service...")

# Create FastAPI app
app = FastAPI(
    title="AI Face Recognition Service",
    description="Service nhận diện khuôn mặt sử dụng AI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "AI Face Recognition Service",
        "version": "1.0.0",
        "python_version": "3.8+"
    }

# Include API routes
app.include_router(
    face_recognition.router,
    prefix="/api/face-recognition",
    tags=["face-recognition"]
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc)
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )

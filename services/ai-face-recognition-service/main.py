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
from app.core.database import engine, Base, SessionLocal
from sqlalchemy import text

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
    
    # ── DATABASE SETUP ──
    try:
        db = SessionLocal()
        try:
            db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            db.commit()
            logger.info("✅ pgvector extension enabled")
        except Exception as e:
            logger.warning(f"⚠️ pgvector extension: {e}")
        finally:
            db.close()

        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables ready")
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
    
    # ── MODEL LOADING (sequential, controlled) ──
    
    # 1. Core FaceRecognizer  (buffalo_l — ~340 MB RAM)
    try:
        from app.services.face_recognition_service import face_recognizer
        face_recognizer.initialize()
        logger.info("✅ [1/4] FaceRecognizer loaded")
    except Exception as e:
        logger.error(f"❌ [1/4] FaceRecognizer FAILED: {e}")

    # 2. Liveness Detector  (MiniFASNet V1SE + V2 — ~3 MB RAM)
    try:
        from app.services.face_liveness_service import face_liveness_detector
        face_liveness_detector.initialize()
        logger.info("✅ [2/4] LivenessDetector loaded")
    except Exception as e:
        logger.error(f"❌ [2/4] LivenessDetector FAILED: {e}")

    # 3. Enhanced service (reuses face_recognizer.app — 0 extra RAM)
    try:
        from app.services.enhanced_insightface_service import enhanced_face_service
        enhanced_face_service.initialize_models()
        logger.info("✅ [3/4] Enhanced service linked")
    except Exception as e:
        logger.warning(f"⚠️ [3/4] Enhanced service: {e}")
    
    # 4. Batch Image Processor
    try:
        from app.services.enhanced_insightface_service import enhanced_face_service
        from app.services.batch_image_processor import initialize_batch_processor
        initialize_batch_processor(enhanced_face_service)
        logger.info("✅ [4/4] BatchImageProcessor ready")
    except Exception as e:
        logger.error(f"❌ [4/4] BatchImageProcessor FAILED: {e}")
    
    logger.info("🎉 AI Face Recognition Service ready to serve!")
    
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="api_uploads")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "AI Face Recognition Service",
        "version": "1.0.0",
    }

# ── ROUTES (lazy imports — these must succeed at module load time) ──
from app.api.routes import face_recognition
from app.api.routes import enhanced_face_recognition
from app.api.routes import multi_angle_recognition
from app.api.routes import batch_registration
from app.api.routes import logs

app.include_router(
    face_recognition.router,
    prefix="/api/face-recognition",
    tags=["face-recognition"]
)
app.include_router(
    enhanced_face_recognition.router,
    prefix="/api/v1/face",
    tags=["Enhanced Face Recognition"]
)
app.include_router(
    multi_angle_recognition.router,
    prefix="/api/v1/multi-angle",
    tags=["Multi-Angle Face Recognition"]
)
app.include_router(
    batch_registration.router,
    prefix="/api/v1/batch",
    tags=["Batch Registration"]
)
app.include_router(
    logs.router,
    prefix="/api/logs",
    tags=["Logs"]
)
app.include_router(
    logs.router,
    prefix="/ai/api/logs",
    tags=["Logs (Gateway Path)"]
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

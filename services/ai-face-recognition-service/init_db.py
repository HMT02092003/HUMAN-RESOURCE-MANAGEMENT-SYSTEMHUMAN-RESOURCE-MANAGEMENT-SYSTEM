#!/usr/bin/env python3
"""
Database initialization script for AI Face Recognition Service
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Add the app directory to the Python path
sys.path.append(os.path.dirname(__file__))

from app.core.config import settings
from app.core.database import Base, engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize database and create tables"""
    try:
        logger.info("🚀 Initializing AI Face Recognition Service Database...")
        
        # Test database connection
        logger.info("📡 Testing database connection...")
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
        
        # Create all tables
        logger.info("📦 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        
        # Create uploads directory
        logger.info("📁 Creating uploads directory...")
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        logger.info("✅ Uploads directory created")
        
        logger.info("🎉 Database initialization completed successfully!")
        logger.info("\n📋 Next steps:")
        logger.info("1. Start the AI service: python main.py")
        logger.info("2. Test the API endpoints")
        logger.info("3. Check health endpoint: http://localhost:4006/health")
        
    except OperationalError as e:
        logger.error(f"❌ Database connection failed: {e}")
        logger.log("\n🔧 Troubleshooting:")
        logger.log("1. Check if PostgreSQL is running")
        logger.log("2. Verify database credentials in .env file")
        logger.log("3. Ensure database 'ai_face_recognition' exists")
        logger.log("4. Check if user has proper permissions")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()

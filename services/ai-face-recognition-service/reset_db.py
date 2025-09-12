#!/usr/bin/env python3
"""
Reset database và tạo lại HOG embeddings cho real user data
"""
import json
import numpy as np
import cv2
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.core.database import get_db, engine
from app.models.face_embedding import FaceEmbedding
from app.services.yolov11_face_recognition_service import YOLOv11FaceRecognitionService
from sqlalchemy.orm import sessionmaker

async def register_face(service, user_id, username, image_path, db):
    """Register face for a user"""
    try:
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            print(f"❌ Cannot load image: {image_path}")
            return False
            
        # Convert to bytes
        _, buffer = cv2.imencode('.jpg', image)
        image_data = buffer.tobytes()
        
        # Register face
        result = await service.register_face(image_data, user_id, username, db)
        
        if result['success']:
            print(f"✅ Successfully registered {username}")
            return True
        else:
            print(f"❌ Failed to register {username}: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error registering {username}: {e}")
        return False

async def main():
    print("🔄 Starting database reset with real user data...")
    
    # Initialize database
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Initialize service
    service = YOLOv11FaceRecognitionService()
    
    try:
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        
        print("🗑️ Clearing existing face embeddings...")
        # Delete all existing embeddings
        db.query(FaceEmbedding).delete()
        db.commit()
        
        print("👥 Registering real users...")
        
        # Register real users with their actual images
        users = [
            {
                'user_id': 100,
                'username': 'toanhm',
                'image_path': 'uploads/toanhm_35b3aab9.jpeg'
            },
            {
                'user_id': 200,
                'username': 'nicol',
                'image_path': 'uploads/nicol_02e92614.jpeg'
            },
            {
                'user_id': 300,
                'username': 'toan123',
                'image_path': 'uploads/toan123_5682c311.jpeg'
            }
        ]
        
        success_count = 0
        for user in users:
            success = await register_face(
                service, 
                user['user_id'], 
                user['username'], 
                user['image_path'], 
                db
            )
            if success:
                success_count += 1
        
        print(f"\n✅ Database reset complete!")
        print(f"   Registered: {success_count}/{len(users)} users")
        
        # Show current embeddings
        embeddings = db.query(FaceEmbedding).all()
        print(f"\n📊 Current database state:")
        for emb in embeddings:
            print(f"   User: {emb.username} (ID: {emb.user_id}) - Active: {emb.is_active}")
        
        # Test recognition với ảnh của Toanhm
        print("\n🧪 Testing recognition with toanhm image...")
        toanhm_image = cv2.imread('uploads/toanhm_35b3aab9.jpeg')
        if toanhm_image is not None:
            _, buffer = cv2.imencode('.jpg', toanhm_image)
            toanhm_data = buffer.tobytes()
            
            result = await service.recognize_face(toanhm_data, 'check_in', db)
            if result['success']:
                user_data = result['data']['user']
                print(f"   ✅ Recognition successful!")
                print(f"   User: {user_data['username']}")
                print(f"   Confidence: {result.get('confidence_score', 0)}%")
            else:
                print(f"   ❌ Recognition failed: {result.get('message', 'Unknown')}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    asyncio.run(main())

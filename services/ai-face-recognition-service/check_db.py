"""
Quick script to check database embeddings
"""
import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, FaceEmbedding, AttendanceLog

def check_database():
    db: Session = SessionLocal()
    try:
        # Count embeddings
        total_embeddings = db.query(FaceEmbedding).count()
        active_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.is_active == True).count()
        
        print("=" * 60)
        print("📊 DATABASE STATUS")
        print("=" * 60)
        print(f"Total face embeddings: {total_embeddings}")
        print(f"Active embeddings: {active_embeddings}")
        print()
        
        if active_embeddings > 0:
            print("✅ Active Face Embeddings:")
            embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.is_active == True).all()
            for emb in embeddings:
                print(f"  - ID: {emb.id}, User ID: {emb.user_id}, Username: {emb.username}, Full Name: {emb.full_name or 'N/A'}")
                print(f"    Confidence: {emb.confidence_score}%, Created: {emb.created_at}")
        else:
            print("⚠️  NO ACTIVE EMBEDDINGS FOUND!")
            print("   You need to register faces first using:")
            print("   POST /api/face-recognition/register-face")
        
        print()
        
        # Count logs
        total_logs = db.query(AttendanceLog).count()
        recent_logs = db.query(AttendanceLog).order_by(AttendanceLog.timestamp.desc()).limit(5).all()
        
        print(f"Total attendance logs: {total_logs}")
        if recent_logs:
            print("\n📝 Recent Attendance Logs:")
            for log in recent_logs:
                print(f"  - {log.timestamp}: User {log.username} ({log.recognition_type}) - {log.status}")
                print(f"    Confidence: {log.confidence_score}%")
        
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_database()

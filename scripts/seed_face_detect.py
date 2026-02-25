import psycopg2
import numpy as np
import uuid
import json

def seed_data():
    try:
        # 1. Connect to auth_service to get users
        auth_conn = psycopg2.connect(
            host="localhost",
            port=5433,
            user="postgres",
            password="123456",
            database="auth_service"
        )
        auth_cur = auth_conn.cursor()
        auth_cur.execute("SELECT id, username, \"fullName\" FROM users")
        users = auth_cur.fetchall()
        auth_conn.close()
        
        print(f"Found {len(users)} users in auth_service.")
        
        # 2. Connect to ai_face_recognition to insert embeddings
        ai_conn = psycopg2.connect(
            host="localhost",
            port=5433,
            user="postgres",
            password="123456",
            database="ai_face_recognition"
        )
        ai_cur = ai_conn.cursor()
        
        # We need to make sure the face_embeddings table exists and has the vector extension
        # Since the service is running, it should be fine.
        
        for user_id, username, full_name in users:
            # full_name is already fetched
            full_name = full_name or username
            
            # Check if user already has embeddings
            ai_cur.execute("SELECT count(*) FROM face_embeddings WHERE user_id = %s", (user_id,))
            if ai_cur.fetchone()[0] > 0:
                print(f"Skipping user {username} (already has embeddings).")
                continue
            
            print(f"Seeding 4 poses for user {username}...")
            poses = ['frontal', 'left', 'right', 'up']
            
            for pose in poses:
                # Generate a random 512-dim normalized vector
                vec = np.random.normal(0, 1, 512)
                vec = vec / np.linalg.norm(vec)
                vec_list = vec.tolist()
                # Format as postgres vector string "[val,val,...]"
                vec_str = "[" + ",".join(map(str, vec_list)) + "]"
                
                ai_cur.execute(
                    "INSERT INTO face_embeddings (user_id, username, full_name, embedding_vector, face_type, quality_score, created_at, updated_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",
                    (user_id, username, full_name, vec_str, pose, 0.95)
                )
        
        ai_conn.commit()
        ai_cur.close()
        ai_conn.close()
        print("Successfully seeded face embeddings for all users.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    seed_data()

#!/usr/bin/env python3
import sys
import json
import os
import psycopg2
import numpy as np
sys.path.append(os.path.dirname(__file__))

from detect import detect_face
from embedding_face import get_feature

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '123456'),
    'database': os.getenv('DB_NAME', 'attendance_service')
}

def get_database_connection():
    """
    Tạo kết nối đến database
    """
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        return connection
    except psycopg2.Error as e:
        print(f"Lỗi kết nối database: {e}", file=sys.stderr)
        return None

def load_user_embeddings():
    """
    Load tất cả embeddings từ database
    
    Returns:
        dict: Dictionary với key là userId và value là list các embeddings
    """
    connection = get_database_connection()
    if not connection:
        return {}
    
    try:
        cursor = connection.cursor()
        query = """
            SELECT userId, faceEmbedding 
            FROM face_training_images 
            WHERE isActive = true AND faceEmbedding IS NOT NULL
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        user_embeddings = {}
        for user_id, embedding_json in results:
            if embedding_json:
                try:
                    embedding = np.array(json.loads(embedding_json))
                    if user_id not in user_embeddings:
                        user_embeddings[user_id] = []
                    user_embeddings[user_id].append(embedding)
                except json.JSONDecodeError:
                    continue
        
        return user_embeddings
        
    except psycopg2.Error as e:
        print(f"Lỗi truy vấn database: {e}", file=sys.stderr)
        return {}
    finally:
        if connection:
            connection.close()

def compare_encodings(encoding, user_encodings):
    """
    So sánh encoding với danh sách encodings của user
    
    Args:
        encoding: Vector đặc trưng cần so sánh
        user_encodings: Danh sách các vector đặc trưng của user
        
    Returns:
        float: Độ tương đồng cao nhất
    """
    if not user_encodings or encoding is None:
        return 0.0
    
    similarities = []
    for user_encoding in user_encodings:
        # Tính cosine similarity
        similarity = np.dot(encoding, user_encoding.T)
        similarities.append(similarity)
    
    return max(similarities)

def recognize_face(image_path, confidence_threshold=0.3):
    """
    Nhận diện khuôn mặt từ ảnh
    
    Args:
        image_path: Đường dẫn đến ảnh
        confidence_threshold: Ngưỡng độ tin cậy
        
    Returns:
        dict: Kết quả nhận diện
    """
    try:
        # Kiểm tra file tồn tại
        if not os.path.exists(image_path):
            return {
                'status': 'error',
                'message': f'File không tồn tại: {image_path}',
                'confidence': 0.0,
                'user_id': None
            }
        
        # Phát hiện khuôn mặt
        faces = detect_face(image_path)
        
        if not faces:
            return {
                'status': 'no_face_detected',
                'message': 'Không phát hiện khuôn mặt trong ảnh',
                'confidence': 0.0,
                'user_id': None
            }
        
        # Lấy khuôn mặt đầu tiên
        face_image = faces[0]['face_image']
        
        # Trích xuất đặc trưng
        face_encoding = get_feature(face_image)
        
        if face_encoding is None:
            return {
                'status': 'feature_extraction_failed',
                'message': 'Không thể trích xuất đặc trưng từ khuôn mặt',
                'confidence': 0.0,
                'user_id': None
            }
        
        # Load user embeddings từ database
        user_embeddings = load_user_embeddings()
        
        if not user_embeddings:
            return {
                'status': 'no_training_data',
                'message': 'Không có dữ liệu training trong hệ thống',
                'confidence': 0.0,
                'user_id': None
            }
        
        # Tìm user có độ tương đồng cao nhất
        best_match_user_id = None
        best_similarity = 0.0
        
        for user_id, embeddings in user_embeddings.items():
            similarity = compare_encodings(face_encoding, embeddings)
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match_user_id = user_id
        
        # Kiểm tra ngưỡng độ tin cậy
        if best_similarity >= confidence_threshold:
            return {
                'status': 'recognized',
                'message': 'Nhận diện thành công',
                'confidence': float(best_similarity),
                'user_id': best_match_user_id,
                'face_bbox': faces[0]['bbox']
            }
        else:
            return {
                'status': 'unrecognized',
                'message': 'Không nhận diện được người dùng',
                'confidence': float(best_similarity),
                'user_id': None,
                'face_bbox': faces[0]['bbox']
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Lỗi trong quá trình nhận diện: {str(e)}',
            'confidence': 0.0,
            'user_id': None
        }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({
            'status': 'error',
            'message': 'Usage: python recognize_face.py <image_path>',
            'confidence': 0.0,
            'user_id': None
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = recognize_face(image_path)
    print(json.dumps(result))

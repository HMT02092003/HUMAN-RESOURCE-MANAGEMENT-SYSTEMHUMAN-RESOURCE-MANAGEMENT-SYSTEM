#!/usr/bin/env python3
import sys
import json
import os
sys.path.append(os.path.dirname(__file__))

from detect import detect_face
from embedding_face import get_feature

def add_training_image(user_id, image_path):
    """
    Xử lý ảnh training cho user
    
    Args:
        user_id: ID của user
        image_path: Đường dẫn đến ảnh
        
    Returns:
        dict: Kết quả xử lý
    """
    try:
        # Kiểm tra file tồn tại
        if not os.path.exists(image_path):
            return {
                'success': False,
                'message': f'File không tồn tại: {image_path}'
            }
        
        # Phát hiện khuôn mặt
        faces = detect_face(image_path)
        
        if not faces:
            return {
                'success': False,
                'message': 'Không phát hiện khuôn mặt trong ảnh'
            }
        
        # Lấy khuôn mặt đầu tiên (lớn nhất)
        face_image = faces[0]['face_image']
        
        # Trích xuất đặc trưng
        embedding = get_feature(face_image)
        
        if embedding is None:
            return {
                'success': False,
                'message': 'Không thể trích xuất đặc trưng từ khuôn mặt'
            }
        
        return {
            'success': True,
            'message': 'Xử lý ảnh training thành công',
            'embedding': embedding.tolist(),  # Convert numpy array to list for JSON serialization
            'face_bbox': faces[0]['bbox']
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Lỗi khi xử lý ảnh: {str(e)}'
        }

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({
            'success': False,
            'message': 'Usage: python add_training_image.py <user_id> <image_path>'
        }))
        sys.exit(1)
    
    user_id = sys.argv[1]
    image_path = sys.argv[2]
    
    result = add_training_image(user_id, image_path)
    print(json.dumps(result))

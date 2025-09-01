import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import face_recognition
from typing import Dict, List, Tuple, Optional
import json
import logging

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognizer:
    def __init__(self, confidence_threshold=0.3):
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
    def load_model(self):
        """Load face recognition model"""
        try:
            # Load model từ weights
            model_path = os.path.join(os.path.dirname(__file__), '../../weights/arcface_r100.pth')
            if os.path.exists(model_path):
                self.model = torch.load(model_path, map_location=self.device)
                self.model.eval()
                logger.info("Model loaded successfully")
            else:
                logger.warning("Model file not found, using face_recognition library")
                self.model = None
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.model = None

    def load_user_embeddings(self, db_connection) -> Dict[int, np.ndarray]:
        """Load user embeddings từ database và ảnh identification"""
        user_embeddings = {}
        
        try:
            # Lấy danh sách users từ database
            users = db_connection('users').select('id', 'username', 'identificationPhoto').where('status', 1)
            
            # Đường dẫn đến thư mục ảnh identification
            frontend_path = os.path.join(os.path.dirname(__file__), '../../../../frontend/public/uploads/identificationPhoto')
            
            for user in users:
                if user.identificationPhoto:
                    try:
                        # Tìm ảnh trong thư mục identificationPhoto
                        photo_path = None
                        
                        # Thử tìm theo username
                        username = user.username
                        for ext in ['.jpg', '.jpeg', '.png', '.gif']:
                            potential_path = os.path.join(frontend_path, f"{username}{ext}")
                            if os.path.exists(potential_path):
                                photo_path = potential_path
                                break
                        
                        # Nếu không tìm thấy theo username, thử theo đường dẫn trong database
                        if not photo_path and user.identificationPhoto:
                            # Loại bỏ prefix /identificationPhoto/ nếu có
                            relative_path = user.identificationPhoto.replace('/identificationPhoto/', '')
                            photo_path = os.path.join(frontend_path, relative_path)
                        
                        if photo_path and os.path.exists(photo_path):
                            # Load ảnh và trích xuất embedding
                            embedding = self.extract_face_embedding(photo_path)
                            if embedding is not None:
                                user_embeddings[user.id] = {
                                    'embedding': embedding,
                                    'username': username,
                                    'photo_path': photo_path
                                }
                                logger.info(f"Loaded embedding for user {username} (ID: {user.id})")
                            else:
                                logger.warning(f"Could not extract embedding from {photo_path}")
                        else:
                            logger.warning(f"Photo not found for user {username}: {photo_path}")
                            
                    except Exception as e:
                        logger.error(f"Error processing user {user.username}: {e}")
                        continue
            
            logger.info(f"Loaded {len(user_embeddings)} user embeddings")
            return user_embeddings
            
        except Exception as e:
            logger.error(f"Error loading user embeddings: {e}")
            return {}

    def extract_face_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Trích xuất face embedding từ ảnh"""
        try:
            # Load ảnh
            image = face_recognition.load_image_file(image_path)
            
            # Tìm khuôn mặt trong ảnh
            face_locations = face_recognition.face_locations(image)
            
            if not face_locations:
                logger.warning(f"No face found in {image_path}")
                return None
            
            # Lấy khuôn mặt đầu tiên
            face_location = face_locations[0]
            
            # Trích xuất embedding
            face_encoding = face_recognition.face_encodings(image, [face_location])[0]
            
            return face_encoding
            
        except Exception as e:
            logger.error(f"Error extracting face embedding from {image_path}: {e}")
            return None

    def compare_encodings(self, encoding: np.ndarray, user_embeddings: Dict[int, Dict]) -> Tuple[float, int]:
        """So sánh encoding với user embeddings và trả về confidence và userId"""
        best_match = None
        best_confidence = 0.0
        
        for user_id, user_data in user_embeddings.items():
            try:
                # So sánh face encodings
                distance = face_recognition.face_distance([user_data['embedding']], encoding)[0]
                confidence = 1.0 - distance
                
                if confidence > best_confidence and confidence >= self.confidence_threshold:
                    best_confidence = confidence
                    best_match = user_id
                    
            except Exception as e:
                logger.error(f"Error comparing with user {user_id}: {e}")
                continue
        
        return best_confidence, best_match

    def recognize_face(self, image_path: str, db_connection) -> Dict:
        """Nhận diện khuôn mặt trong ảnh"""
        try:
            logger.info(f"Processing image: {image_path}")
            
            # Load model nếu chưa load
            if self.model is None:
                self.load_model()
            
            # Load user embeddings
            user_embeddings = self.load_user_embeddings(db_connection)
            
            if not user_embeddings:
                logger.warning("No user embeddings available")
                return {
                    'success': False,
                    'recognized': False,
                    'message': 'Không có dữ liệu người dùng để so sánh'
                }
            
            # Trích xuất embedding từ ảnh input
            input_embedding = self.extract_face_embedding(image_path)
            
            if input_embedding is None:
                return {
                    'success': False,
                    'recognized': False,
                    'message': 'Không thể trích xuất khuôn mặt từ ảnh'
                }
            
            # So sánh với user embeddings
            confidence, user_id = self.compare_encodings(input_embedding, user_embeddings)
            
            if user_id and confidence >= self.confidence_threshold:
                # Lấy thông tin user từ database
                user = db_connection('users').where('id', user_id).first()
                
                if user:
                    # Lấy thông tin department và chevron
                    department = None
                    chevron = None
                    
                    try:
                        if user.departmentId:
                            dept_result = db_connection('departments').where('id', user.departmentId).first()
                            if dept_result:
                                department = dept_result.name
                    except:
                        pass
                    
                    try:
                        if user.chevronId:
                            chv_result = db_connection('chevrons').where('id', user.chevronId).first()
                            if chv_result:
                                chevron = chv_result.name
                    except:
                        pass
                    
                    user_info = {
                        'id': user.id,
                        'username': user.username,
                        'name': f"{user.firstName} {user.lastName}".strip(),
                        'email': user.email,
                        'employeeId': f"NV{user.id:04d}",
                        'department': department,
                        'position': chevron
                    }
                    
                    logger.info(f"Face recognized: {user.username} with confidence {confidence:.3f}")
                    
                    return {
                        'success': True,
                        'recognized': True,
                        'username': user.username,
                        'confidence': confidence,
                        'message': 'Nhận diện thành công'
                    }
            
            logger.info(f"No face recognized, best confidence: {confidence:.3f}")
            return {
                'success': True,
                'recognized': False,
                'confidence': confidence,
                'message': 'Không nhận diện được khuôn mặt'
            }
            
        except Exception as e:
            logger.error(f"Error in face recognition: {e}")
            return {
                'success': False,
                'recognized': False,
                'message': f'Lỗi khi nhận diện: {str(e)}'
            }

    def add_training_image(self, user_id: int, image_path: str, db_connection) -> Dict:
        """Thêm ảnh training cho user"""
        try:
            # Kiểm tra user có tồn tại không
            user = db_connection('users').where('id', user_id).first()
            if not user:
                return {
                    'success': False,
                    'message': 'User không tồn tại'
                }
            
            # Trích xuất embedding từ ảnh mới
            new_embedding = self.extract_face_embedding(image_path)
            
            if new_embedding is None:
                return {
                    'success': False,
                    'message': 'Không thể trích xuất khuôn mặt từ ảnh'
                }
            
            # Lưu ảnh vào thư mục identificationPhoto
            frontend_path = os.path.join(os.path.dirname(__file__), '../../../../frontend/public/uploads/identificationPhoto')
            os.makedirs(frontend_path, exist_ok=True)
            
            # Tạo tên file mới
            file_ext = os.path.splitext(image_path)[1]
            new_filename = f"{user.username}{file_ext}"
            new_path = os.path.join(frontend_path, new_filename)
            
            # Copy ảnh
            import shutil
            shutil.copy2(image_path, new_path)
            
            # Cập nhật database
            db_connection('users').where('id', user_id).update({
                'identificationPhoto': f'/identificationPhoto/{new_filename}',
                'updatedAt': db_connection.fn.now()
            })
            
            logger.info(f"Training image added for user {user.username}")
            
            return {
                'success': True,
                'message': 'Thêm ảnh training thành công',
                'photoPath': f'/identificationPhoto/{new_filename}'
            }
            
        except Exception as e:
            logger.error(f"Error adding training image: {e}")
            return {
                'success': False,
                'message': f'Lỗi khi thêm ảnh training: {str(e)}'
            }

# Hàm tiện ích để nhận diện từ ảnh
def recognize_face_from_image(image_path: str, db_connection) -> Dict:
    """Hàm tiện ích để nhận diện khuôn mặt từ ảnh"""
    recognizer = FaceRecognizer()
    return recognizer.recognize_face(image_path, db_connection)

# Hàm tiện ích để thêm ảnh training
def add_user_training_image(user_id: int, image_path: str, db_connection) -> Dict:
    """Hàm tiện ích để thêm ảnh training cho user"""
    recognizer = FaceRecognizer()
    return recognizer.add_training_image(user_id, image_path, db_connection)

import cv2
import numpy as np
from ultralytics import YOLO
import os

# Load YOLO model for face detection
model_path = os.path.join(os.path.dirname(__file__), '..', '..', 'weights', 'yolov11n-face.pt')

def detect_face(image):
    """
    Phát hiện khuôn mặt trong ảnh sử dụng YOLO
    
    Args:
        image: numpy array hoặc đường dẫn đến ảnh
        
    Returns:
        list: Danh sách các bounding box của khuôn mặt được phát hiện
    """
    try:
        # Load model
        model = YOLO(model_path)
        
        # Nếu input là đường dẫn file
        if isinstance(image, str):
            if not os.path.exists(image):
                raise FileNotFoundError(f"Không tìm thấy file ảnh: {image}")
            image = cv2.imread(image)
        
        # Phát hiện khuôn mặt
        results = model(image)
        
        faces = []
        if len(results) > 0 and results[0].boxes is not None:
            for box in results[0].boxes.xyxy:
                x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
                # Crop khuôn mặt
                face_crop = image[y1:y2, x1:x2]
                faces.append({
                    'bbox': [x1, y1, x2, y2],
                    'face_image': face_crop
                })
        
        return faces
        
    except Exception as e:
        print(f"Lỗi trong quá trình phát hiện khuôn mặt: {str(e)}")
        return []

def preprocess_face(face_image):
    """
    Tiền xử lý ảnh khuôn mặt trước khi trích xuất đặc trưng
    
    Args:
        face_image: numpy array của ảnh khuôn mặt
        
    Returns:
        numpy array: Ảnh đã được tiền xử lý
    """
    try:
        # Resize về kích thước chuẩn
        face_resized = cv2.resize(face_image, (112, 112))
        
        # Normalize pixel values
        face_normalized = face_resized.astype(np.float32) / 255.0
        
        # Convert BGR to RGB
        face_rgb = cv2.cvtColor(face_normalized, cv2.COLOR_BGR2RGB)
        
        return face_rgb
        
    except Exception as e:
        print(f"Lỗi trong quá trình tiền xử lý ảnh: {str(e)}")
        return None

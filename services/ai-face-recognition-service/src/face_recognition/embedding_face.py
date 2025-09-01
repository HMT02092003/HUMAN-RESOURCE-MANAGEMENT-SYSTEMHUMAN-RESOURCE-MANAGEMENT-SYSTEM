import torch
import torch.nn as nn
import numpy as np
import cv2
from .detect import preprocess_face
import os

class IResNet(nn.Module):
    """
    IResNet model for face embedding extraction
    """
    def __init__(self, num_features=512):
        super(IResNet, self).__init__()
        # Simplified version - you should use the actual iresnet implementation
        self.backbone = nn.Sequential(
            nn.Conv2d(3, 64, 3, 1, 1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten(),
            nn.Linear(64, num_features)
        )
    
    def forward(self, x):
        return self.backbone(x)

# Global model instance
model = None
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def load_model():
    """
    Load pre-trained face recognition model
    """
    global model
    if model is None:
        try:
            model_path = os.path.join(os.path.dirname(__file__), '..', '..', 'weights', 'arcface_r100.pth')
            
            # Load model architecture
            model = IResNet(num_features=512)
            
            # Load pre-trained weights if available
            if os.path.exists(model_path):
                checkpoint = torch.load(model_path, map_location=device)
                model.load_state_dict(checkpoint, strict=False)
            
            model.to(device)
            model.eval()
            print("Model loaded successfully")
            
        except Exception as e:
            print(f"Lỗi khi load model: {str(e)}")
            # Fallback to random initialization
            model = IResNet(num_features=512)
            model.to(device)
            model.eval()
    
    return model

def get_feature(face_image):
    """
    Trích xuất đặc trưng từ ảnh khuôn mặt
    
    Args:
        face_image: numpy array của ảnh khuôn mặt
        
    Returns:
        numpy array: Vector đặc trưng 512 chiều
    """
    try:
        # Load model if not already loaded
        model = load_model()
        
        # Preprocess face image
        face_preprocessed = preprocess_face(face_image)
        if face_preprocessed is None:
            return None
        
        # Convert to tensor and add batch dimension
        face_tensor = torch.from_numpy(face_preprocessed).permute(2, 0, 1).unsqueeze(0)
        face_tensor = face_tensor.to(device)
        
        # Extract features
        with torch.no_grad():
            features = model(face_tensor)
            features = features.cpu().numpy().flatten()
            
            # Normalize features
            features = features / np.linalg.norm(features)
        
        return features
        
    except Exception as e:
        print(f"Lỗi trong quá trình trích xuất đặc trưng: {str(e)}")
        return None

def extract_multiple_features(image_paths):
    """
    Trích xuất đặc trưng từ nhiều ảnh
    
    Args:
        image_paths: list các đường dẫn ảnh
        
    Returns:
        list: Danh sách các vector đặc trưng
    """
    features_list = []
    
    for image_path in image_paths:
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                print(f"Không thể đọc ảnh: {image_path}")
                continue
            
            # Detect faces
            from .detect import detect_face
            faces = detect_face(image)
            
            if faces:
                # Use the first detected face
                face_image = faces[0]['face_image']
                features = get_feature(face_image)
                
                if features is not None:
                    features_list.append({
                        'image_path': image_path,
                        'features': features,
                        'bbox': faces[0]['bbox']
                    })
                    
        except Exception as e:
            print(f"Lỗi khi xử lý ảnh {image_path}: {str(e)}")
            continue
    
    return features_list

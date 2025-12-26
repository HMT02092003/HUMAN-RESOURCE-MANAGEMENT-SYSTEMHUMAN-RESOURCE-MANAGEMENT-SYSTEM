"""
Utility functions for image processing
"""

import cv2
import numpy as np
import base64
from typing import Optional, Tuple, List


def base64_to_image(base64_string: str) -> Optional[np.ndarray]:
    """
    Convert base64 string to OpenCV image
    
    Args:
        base64_string: Base64 encoded image (có thể có hoặc không có prefix)
    
    Returns:
        OpenCV image (BGR) hoặc None nếu lỗi
    """
    try:
        # Remove data URI prefix if exists
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        img_bytes = base64.b64decode(base64_string)
        
        # Convert to numpy array
        nparr = np.frombuffer(img_bytes, np.uint8)
        
        # Decode image
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        return image
        
    except Exception as e:
        print(f"Error converting base64 to image: {e}")
        return None


def image_to_base64(image: np.ndarray, format: str = '.jpg') -> Optional[str]:
    """
    Convert OpenCV image to base64 string
    
    Args:
        image: OpenCV image (BGR)
        format: Image format (.jpg, .png)
    
    Returns:
        Base64 string hoặc None nếu lỗi
    """
    try:
        # Encode image
        success, buffer = cv2.imencode(format, image)
        
        if not success:
            return None
        
        # Convert to base64
        img_bytes = buffer.tobytes()
        base64_string = base64.b64encode(img_bytes).decode('utf-8')
        
        return base64_string
        
    except Exception as e:
        print(f"Error converting image to base64: {e}")
        return None


def draw_face_box(
    image: np.ndarray,
    bbox: List[int],
    label: Optional[str] = None,
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2
) -> np.ndarray:
    """
    Vẽ bounding box lên ảnh
    
    Args:
        image: Ảnh gốc
        bbox: [x1, y1, x2, y2]
        label: Text hiển thị
        color: Màu box (B, G, R)
        thickness: Độ dày đường viền
    
    Returns:
        Ảnh đã vẽ
    """
    result = image.copy()
    x1, y1, x2, y2 = bbox
    
    # Draw rectangle
    cv2.rectangle(result, (x1, y1), (x2, y2), color, thickness)
    
    # Draw label
    if label:
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.6
        font_thickness = 2
        
        # Get text size
        (text_width, text_height), baseline = cv2.getTextSize(
            label, font, font_scale, font_thickness
        )
        
        # Draw background rectangle for text
        cv2.rectangle(
            result,
            (x1, y1 - text_height - 10),
            (x1 + text_width, y1),
            color,
            -1  # Filled
        )
        
        # Draw text
        cv2.putText(
            result,
            label,
            (x1, y1 - 5),
            font,
            font_scale,
            (255, 255, 255),
            font_thickness
        )
    
    return result


def draw_landmarks(
    image: np.ndarray,
    landmarks: List[List[int]],
    color: Tuple[int, int, int] = (0, 0, 255),
    radius: int = 2
) -> np.ndarray:
    """
    Vẽ landmarks lên ảnh
    
    Args:
        image: Ảnh gốc
        landmarks: [[x, y], ...] - 5 điểm
        color: Màu điểm (B, G, R)
        radius: Bán kính điểm
    
    Returns:
        Ảnh đã vẽ
    """
    result = image.copy()
    
    for point in landmarks:
        cv2.circle(result, tuple(point), radius, color, -1)
    
    return result


def resize_with_aspect_ratio(
    image: np.ndarray,
    max_width: int = 1920,
    max_height: int = 1080
) -> np.ndarray:
    """
    Resize ảnh giữ nguyên aspect ratio
    
    Args:
        image: Ảnh gốc
        max_width: Chiều rộng tối đa
        max_height: Chiều cao tối đa
    
    Returns:
        Ảnh đã resize
    """
    h, w = image.shape[:2]
    
    # Tính tỷ lệ scale
    scale = min(max_width / w, max_height / h, 1.0)
    
    if scale < 1.0:
        new_w = int(w * scale)
        new_h = int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    return image


def validate_image(image: np.ndarray) -> Tuple[bool, str]:
    """
    Kiểm tra ảnh có hợp lệ không
    
    Args:
        image: OpenCV image
    
    Returns:
        (is_valid, message)
    """
    if image is None:
        return False, "Image is None"
    
    if not isinstance(image, np.ndarray):
        return False, "Image is not numpy array"
    
    if image.size == 0:
        return False, "Image is empty"
    
    if len(image.shape) < 2:
        return False, "Invalid image shape"
    
    # Check minimum size
    h, w = image.shape[:2]
    if h < 80 or w < 80:
        return False, f"Image too small: {w}x{h} (minimum 80x80)"
    
    return True, "OK"

"""
Face Quality Service
Kiểm tra chất lượng ảnh: độ mờ, độ sáng, góc nghiêng đầu
Chỉ sử dụng OpenCV và InsightFace Landmarks (không cần thư viện ngoài)
"""

import cv2
import numpy as np
import logging
from typing import Dict, Tuple, Optional
from dataclasses import dataclass
from app.config.rate_config import (
    BLUR_THRESHOLD,
    BRIGHTNESS_MIN,
    BRIGHTNESS_MAX,
    MAX_YAW,
    MAX_PITCH,
    MAX_ROLL,
)

logger = logging.getLogger(__name__)


@dataclass
class QualityResult:
    """Kết quả kiểm tra chất lượng ảnh"""
    is_valid: bool
    blur_score: float
    brightness: float
    head_pose_angles: Optional[Dict[str, float]]
    messages: list[str]
    details: Dict


class FaceQualityChecker:
    """
    Service kiểm tra chất lượng ảnh trước khi nhận diện
    Singleton pattern để tái sử dụng
    """
    
    _instance = None
    
    # Ngưỡng chất lượng (có thể điều chỉnh)
    # Use values from central config (rate_config)
    BLUR_THRESHOLD = float(BLUR_THRESHOLD)
    BRIGHTNESS_MIN = int(BRIGHTNESS_MIN)
    BRIGHTNESS_MAX = int(BRIGHTNESS_MAX)
    MAX_YAW = float(MAX_YAW)
    MAX_PITCH = float(MAX_PITCH)
    MAX_ROLL = float(MAX_ROLL)
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(FaceQualityChecker, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            logger.info("✅ FaceQualityChecker initialized")
    
    def check_all(
        self, 
        image: np.ndarray, 
        landmarks: Optional[np.ndarray] = None
    ) -> QualityResult:
        """
        Kiểm tra toàn bộ chất lượng ảnh
        
        Args:
            image: Ảnh đầu vào (BGR format từ OpenCV)
            landmarks: 5 điểm landmarks từ InsightFace [[x,y], ...] (optional)
        
        Returns:
            QualityResult với đầy đủ thông tin
        """
        messages = []
        details = {}
        
        # 1. Kiểm tra độ mờ
        blur_score, is_sharp = self.check_blur(image)
        # Ensure native Python types for JSON serialization
        blur_score = float(blur_score)
        is_sharp = bool(is_sharp)
        details['blur_score'] = blur_score
        details['is_sharp'] = is_sharp
        if not is_sharp:
            messages.append("Ảnh bị mờ, vui lòng giữ yên điện thoại.")
        
        # 2. Kiểm tra độ sáng
        brightness, brightness_ok, brightness_msg = self.check_brightness(image)
        brightness = float(brightness)
        brightness_ok = bool(brightness_ok)
        details['brightness'] = brightness
        details['brightness_status'] = brightness_msg
        if not brightness_ok:
            if brightness_msg == "TOO_DARK":
                messages.append(f"Ảnh quá tối (brightness={brightness:.1f})")
            elif brightness_msg == "TOO_BRIGHT":
                messages.append(f"Ảnh quá sáng (brightness={brightness:.1f})")
        
        # 3. Kiểm tra góc đầu (nếu có landmarks)
        head_pose_angles = None
        head_pose_ok = True
        if landmarks is not None and len(landmarks) == 5:
            angles = self.check_head_pose(landmarks, image.shape)
            # Convert to native floats
            angles = {k: float(v) for k, v in angles.items()}
            head_pose_angles = angles
            details['head_pose'] = angles

            # Kiểm tra từng góc
            if abs(angles['yaw']) > float(self.MAX_YAW):
                head_pose_ok = False
                messages.append(f"Mặt quay ngang quá nhiều (yaw={angles['yaw']:.1f}°)")
            if abs(angles['pitch']) > float(self.MAX_PITCH):
                head_pose_ok = False
                messages.append(f"Mặt ngẩng/cúi quá nhiều (pitch={angles['pitch']:.1f}°)")
            if abs(angles['roll']) > float(self.MAX_ROLL):
                head_pose_ok = False
                messages.append(f"Mặt nghiêng quá nhiều (roll={angles['roll']:.1f}°)")
        
        # Tổng hợp kết quả
        is_valid = is_sharp and brightness_ok and head_pose_ok
        
        if is_valid:
            messages.append("✅ Chất lượng ảnh đạt chuẩn")
        
        return QualityResult(
            is_valid=bool(is_valid),
            blur_score=blur_score,
            brightness=brightness,
            head_pose_angles=head_pose_angles,
            messages=messages,
            details=details
        )
    
    def check_blur(self, image: np.ndarray) -> Tuple[float, bool]:
        """
        Kiểm tra độ mờ bằng Laplacian Variance
        
        Args:
            image: Ảnh đầu vào (BGR format)
        
        Returns:
            (blur_score, is_sharp)
            - blur_score: Giá trị variance (càng cao càng sắc nét)
            - is_sharp: True nếu ảnh đủ sắc nét
        """
        try:
            # Chuyển sang grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Tính Laplacian (toán tử đạo hàm bậc 2)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            
            # Tính variance - đo độ phân tán của các giá trị
            # Ảnh mờ: edges yếu -> variance thấp
            # Ảnh sắc nét: edges mạnh -> variance cao
            variance = float(laplacian.var())
            is_sharp = bool(variance >= float(self.BLUR_THRESHOLD))

            logger.debug(f"Blur check: variance={variance:.2f}, sharp={is_sharp}")

            return variance, is_sharp
            
        except Exception as e:
            logger.error(f"Error checking blur: {e}")
            return 0.0, False
    
    def check_brightness(self, image: np.ndarray) -> Tuple[float, bool, str]:
        """
        Kiểm tra độ sáng của ảnh
        
        Args:
            image: Ảnh đầu vào (BGR format)
        
        Returns:
            (brightness, is_good, message)
            - brightness: Độ sáng trung bình (0-255)
            - is_good: True nếu độ sáng phù hợp
            - message: "TOO_DARK" / "TOO_BRIGHT" / "OK"
        """
        try:
            # Chuyển sang grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Tính độ sáng trung bình
            brightness = float(np.mean(gray))

            if brightness < float(self.BRIGHTNESS_MIN):
                logger.warning(f"Image too dark: {brightness:.1f}")
                return brightness, False, "TOO_DARK"
            elif brightness > float(self.BRIGHTNESS_MAX):
                logger.warning(f"Image too bright: {brightness:.1f}")
                return brightness, False, "TOO_BRIGHT"
            else:
                logger.debug(f"Brightness OK: {brightness:.1f}")
                return brightness, True, "OK"
                
        except Exception as e:
            logger.error(f"Error checking brightness: {e}")
            return 0.0, False, "ERROR"
    
    def check_head_pose(self, landmarks: np.ndarray, image_shape: Optional[Tuple[int,int]] = None) -> Dict[str, float]:
        """
        Kiểm tra góc nghiêng đầu dựa trên 5 điểm landmarks từ InsightFace
        
        InsightFace trả về 5 landmarks theo thứ tự:
        0: Mắt trái
        1: Mắt phải  
        2: Mũi
        3: Miệng trái
        4: Miệng phải
        
        Args:
            landmarks: numpy array shape (5, 2) - [[x, y], ...]
        
        Returns:
            Dict với các góc:
            - yaw: Góc quay trái/phải (-180 đến +180)
            - pitch: Góc ngẩng/cúi (-90 đến +90)
            - roll: Góc nghiêng (-180 đến +180)
        """
        # For backward-compatibility we implement calculate_head_pose and
        # delegate to it. This function kept for callers expecting
        # `check_head_pose`.
        try:
            return self.calculate_head_pose(landmarks, image_shape)
        except Exception as e:
            logger.error(f"Error in check_head_pose delegating to calculate_head_pose: {e}")
            return {'yaw': 0.0, 'pitch': 0.0, 'roll': 0.0}

    def calculate_head_pose(self, landmarks: np.ndarray, image_shape: Optional[Tuple[int,int]] = None) -> Dict[str, float]:
        """
        Tính toán Yaw, Pitch, Roll từ 5 điểm landmarks (InsightFace)
        0: left eye, 1: right eye, 2: nose, 3: left mouth, 4: right mouth
        
        NOTE: Sử dụng phương pháp Heuristic (tỷ lệ hình học) thay vì solvePnP để đảm bảo ổn định
        với 5 điểm landmarks 2D mà không cần 3D model chính xác.
        """
        try:
            # Chuyển đổi landmarks sang numpy array float32
            left_eye = np.array(landmarks[0], dtype=np.float32)
            right_eye = np.array(landmarks[1], dtype=np.float32)
            nose = np.array(landmarks[2], dtype=np.float32)
            left_mouth = np.array(landmarks[3], dtype=np.float32)
            right_mouth = np.array(landmarks[4], dtype=np.float32)

            # 1. Tính YAW (Quay trái/phải)
            # Dựa trên vị trí mũi so với trung tâm hai mắt
            eye_dist = np.linalg.norm(right_eye - left_eye)
            eye_center_x = (left_eye[0] + right_eye[0]) / 2.0
            
            # Nếu mũi lệch khỏi trung tâm mắt -> đang quay đầu
            # Hệ số 70.0 là ước lượng thực nghiệm
            yaw = ((nose[0] - eye_center_x) / (eye_dist / 2.0)) * 70.0 if eye_dist > 0 else 0.0

            # 2. Tính PITCH (Ngẩng/Cúi)
            # Dựa trên vị trí mũi theo chiều dọc so với mắt và miệng
            eye_center_y = (left_eye[1] + right_eye[1]) / 2.0
            mouth_center_y = (left_mouth[1] + right_mouth[1]) / 2.0
            face_height = mouth_center_y - eye_center_y
            
            if face_height > 0:
                # Tỷ lệ vị trí mũi trong khoảng mắt-miệng
                # 0.45 là vị trí trung bình chuẩn của mũi
                nose_rel_y = (nose[1] - eye_center_y) / face_height
                pitch = (nose_rel_y - 0.45) * 150.0 # Hệ số 150.0 ước lượng
            else:
                pitch = 0.0

            # 3. Tính ROLL (Nghiêng đầu trái/phải)
            # Dựa trên độ dốc của đường thẳng nối hai mắt
            dY = right_eye[1] - left_eye[1]
            dX = right_eye[0] - left_eye[0]
            roll = np.degrees(np.arctan2(dY, dX))

            return {'yaw': float(yaw), 'pitch': float(pitch), 'roll': float(roll)}

        except Exception as e:
            logger.error(f"Error calculating head pose (heuristic): {e}")
            return {'yaw': 0.0, 'pitch': 0.0, 'roll': 0.0}


# Singleton instance
face_quality_checker = FaceQualityChecker()

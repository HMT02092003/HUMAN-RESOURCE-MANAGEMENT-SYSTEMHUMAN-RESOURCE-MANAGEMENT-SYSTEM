"""
Face Detection UI Helper
Vẽ khung hình chữ nhật và text hướng dẫn cho người dùng
- Khung XANH: Khuôn mặt ở vị trí tốt, đang nhận diện
- Khung ĐỎ: Có vấn đề cần điều chỉnh (xa, gần, nghiêng, quay ngang)
"""

import cv2
import numpy as np
from typing import Dict, Tuple, Optional, List


class FaceDetectionUI:
    """Helper class để vẽ UI cho face detection"""
    
    # Màu sắc (BGR format)
    COLOR_GREEN = (0, 255, 0)       # Xanh lá - Tốt
    COLOR_RED = (0, 0, 255)         # Đỏ - Có vấn đề
    COLOR_YELLOW = (0, 255, 255)    # Vàng - Cảnh báo
    COLOR_WHITE = (255, 255, 255)   # Trắng - Text
    COLOR_BLACK = (0, 0, 0)         # Đen - Background text
    
    # Font settings
    FONT = cv2.FONT_HERSHEY_SIMPLEX
    FONT_SCALE = 0.7
    FONT_THICKNESS = 2
    
    # Box settings
    BOX_THICKNESS = 3
    
    @staticmethod
    def draw_face_box_with_status(
        image: np.ndarray,
        bbox: List[int],
        status: str,
        message: str = "",
        quality_info: Optional[Dict] = None
    ) -> np.ndarray:
        """
        Vẽ khung hình chữ nhật quanh khuôn mặt với màu sắc tùy status
        
        Args:
            image: Ảnh gốc
            bbox: [x1, y1, x2, y2]
            status: "good" (xanh) hoặc "bad" (đỏ)
            message: Thông điệp hướng dẫn người dùng
            quality_info: Dict chứa thông tin chất lượng (blur, brightness, angles)
        
        Returns:
            Ảnh đã vẽ UI
        """
        result = image.copy()
        x1, y1, x2, y2 = bbox
        
        # Chọn màu dựa trên status
        color = FaceDetectionUI.COLOR_GREEN if status == "good" else FaceDetectionUI.COLOR_RED
        
        # Vẽ khung chữ nhật
        cv2.rectangle(result, (x1, y1), (x2, y2), color, FaceDetectionUI.BOX_THICKNESS)
        
        # Vẽ góc bo tròn (optional - đẹp hơn)
        corner_length = 30
        FaceDetectionUI._draw_rounded_corners(result, (x1, y1), (x2, y2), color, corner_length)
        
        # Vẽ message chính ở trên đầu
        if message:
            FaceDetectionUI._draw_text_with_background(
                result, 
                message, 
                (x1, y1 - 15),
                color,
                font_scale=0.8
            )
        
        # Vẽ status indicator (chấm tròn ở góc trên bên trái)
        cv2.circle(result, (x1 + 20, y1 + 20), 8, color, -1)
        
        # Vẽ thông tin chi tiết (nếu có)
        if quality_info:
            FaceDetectionUI._draw_quality_info(result, quality_info, (x1, y2 + 20))
        
        return result
    
    @staticmethod
    def _draw_rounded_corners(
        image: np.ndarray,
        top_left: Tuple[int, int],
        bottom_right: Tuple[int, int],
        color: Tuple[int, int, int],
        length: int
    ):
        """Vẽ các góc bo tròn cho khung"""
        x1, y1 = top_left
        x2, y2 = bottom_right
        thickness = FaceDetectionUI.BOX_THICKNESS
        
        # Góc trên trái
        cv2.line(image, (x1, y1), (x1, y1 + length), color, thickness)
        cv2.line(image, (x1, y1), (x1 + length, y1), color, thickness)
        
        # Góc trên phải
        cv2.line(image, (x2, y1), (x2, y1 + length), color, thickness)
        cv2.line(image, (x2, y1), (x2 - length, y1), color, thickness)
        
        # Góc dưới trái
        cv2.line(image, (x1, y2), (x1, y2 - length), color, thickness)
        cv2.line(image, (x1, y2), (x1 + length, y2), color, thickness)
        
        # Góc dưới phải
        cv2.line(image, (x2, y2), (x2, y2 - length), color, thickness)
        cv2.line(image, (x2, y2), (x2 - length, y2), color, thickness)
    
    @staticmethod
    def _draw_text_with_background(
        image: np.ndarray,
        text: str,
        position: Tuple[int, int],
        color: Tuple[int, int, int],
        font_scale: float = 0.7,
        bg_color: Optional[Tuple[int, int, int]] = None
    ):
        """Vẽ text với background tối để dễ đọc"""
        if bg_color is None:
            bg_color = FaceDetectionUI.COLOR_BLACK
        
        # Tính kích thước text
        (text_width, text_height), baseline = cv2.getTextSize(
            text,
            FaceDetectionUI.FONT,
            font_scale,
            FaceDetectionUI.FONT_THICKNESS
        )
        
        x, y = position
        padding = 8
        
        # Vẽ background rectangle (có độ trong suốt)
        overlay = image.copy()
        cv2.rectangle(
            overlay,
            (x - padding, y - text_height - padding),
            (x + text_width + padding, y + padding),
            bg_color,
            -1
        )
        # Blend với opacity 0.7
        cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
        
        # Vẽ text
        cv2.putText(
            image,
            text,
            (x, y),
            FaceDetectionUI.FONT,
            font_scale,
            color,
            FaceDetectionUI.FONT_THICKNESS,
            cv2.LINE_AA
        )
    
    @staticmethod
    def _draw_quality_info(
        image: np.ndarray,
        quality_info: Dict,
        position: Tuple[int, int]
    ):
        """Vẽ thông tin chất lượng chi tiết"""
        x, y = position
        line_height = 25
        
        info_lines = []
        
        # Blur info
        if 'blur_score' in quality_info:
            blur_score = quality_info['blur_score']
            blur_status = "✓" if quality_info.get('is_sharp', False) else "✗"
            info_lines.append(f"{blur_status} Blur: {blur_score:.1f}")
        
        # Brightness info
        if 'brightness' in quality_info:
            brightness = quality_info['brightness']
            info_lines.append(f"☼ Brightness: {brightness:.1f}")
        
        # Head pose info
        if 'head_pose' in quality_info:
            angles = quality_info['head_pose']
            info_lines.append(f"↻ Yaw: {angles['yaw']:.1f}°")
            info_lines.append(f"↕ Pitch: {angles['pitch']:.1f}°")
            info_lines.append(f"⟳ Roll: {angles['roll']:.1f}°")
        
        # Vẽ từng dòng
        for i, line in enumerate(info_lines):
            FaceDetectionUI._draw_text_with_background(
                image,
                line,
                (x, y + i * line_height),
                FaceDetectionUI.COLOR_WHITE,
                font_scale=0.5
            )
    
    @staticmethod
    def draw_instruction_message(
        image: np.ndarray,
        message: str,
        position: str = "top",
        color: Optional[Tuple[int, int, int]] = None
    ) -> np.ndarray:
        """
        Vẽ message hướng dẫn lớn ở đầu hoặc cuối ảnh
        
        Args:
            image: Ảnh gốc
            message: Text hướng dẫn
            position: "top" hoặc "bottom"
            color: Màu text (mặc định trắng)
        """
        if color is None:
            color = FaceDetectionUI.COLOR_WHITE
        
        result = image.copy()
        h, w = image.shape[:2]
        
        # Xác định vị trí
        if position == "top":
            y = 40
        else:
            y = h - 40
        
        x = w // 2
        
        # Vẽ text căn giữa
        (text_width, text_height), _ = cv2.getTextSize(
            message,
            FaceDetectionUI.FONT,
            1.0,
            2
        )
        
        text_x = x - text_width // 2
        
        FaceDetectionUI._draw_text_with_background(
            result,
            message,
            (text_x, y),
            color,
            font_scale=1.0
        )
        
        return result
    
    @staticmethod
    def generate_instruction_message(quality_result: Dict) -> Tuple[str, str]:
        """
        Tạo message hướng dẫn dựa trên kết quả quality check
        
        Returns:
            (message, status) - status là "good" hoặc "bad"
        """
        if quality_result.get('is_valid', False):
            return "✓ Vị trí tốt! Đang nhận diện...", "good"
        
        messages = quality_result.get('messages', [])
        
        # Ưu tiên message quan trọng nhất
        if any('mờ' in msg.lower() for msg in messages):
            return "⚠ Ảnh bị mờ! Giữ điện thoại chắc chắn", "bad"
        
        if any('tối' in msg.lower() for msg in messages):
            return "⚠ Quá tối! Tìm nơi sáng hơn", "bad"
        
        if any('sáng' in msg.lower() for msg in messages):
            return "⚠ Quá sáng! Tránh ánh sáng mạnh", "bad"
        
        if any('quay ngang' in msg.lower() or 'yaw' in msg.lower()):
            return "⚠ Nhìn thẳng vào camera", "bad"
        
        if any('ngẩng' in msg.lower() or 'cúi' in msg.lower() or 'pitch' in msg.lower()):
            return "⚠ Giữ đầu thẳng, không ngẩng/cúi", "bad"
        
        if any('nghiêng' in msg.lower() or 'roll' in msg.lower()):
            return "⚠ Không nghiêng đầu", "bad"
        
        # Message chung
        return "⚠ Điều chỉnh vị trí khuôn mặt", "bad"
    
    @staticmethod
    def draw_center_guide(
        image: np.ndarray,
        color: Optional[Tuple[int, int, int]] = None
    ) -> np.ndarray:
        """
        Vẽ khung oval hướng dẫn ở giữa màn hình
        (giống như trong ảnh mẫu)
        """
        if color is None:
            color = FaceDetectionUI.COLOR_GREEN
        
        result = image.copy()
        h, w = image.shape[:2]
        
        # Tính toán kích thước oval
        center_x = w // 2
        center_y = h // 2
        axis_x = w // 3  # Chiều rộng
        axis_y = h // 2 - 50  # Chiều cao
        
        # Vẽ oval trong suốt
        overlay = result.copy()
        cv2.ellipse(
            overlay,
            (center_x, center_y),
            (axis_x, axis_y),
            0, 0, 360,
            color,
            3
        )
        
        # Blend với opacity
        cv2.addWeighted(overlay, 0.5, result, 0.5, 0, result)
        
        return result


# Singleton instance
face_ui = FaceDetectionUI()

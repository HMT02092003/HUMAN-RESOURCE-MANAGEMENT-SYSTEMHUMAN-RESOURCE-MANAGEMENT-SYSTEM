"""
Cấu hình và Hằng số cho hệ thống nhận diện khuôn mặt AI
Toàn bộ các ngưỡng (threshold), công thức tính toán và giới hạn chất lượng ảnh được quy định tại đây.
"""
from app.core.config import settings

class RecognitionConfig:
    # --- CẤU HÌNH NHẬN DIỆN (FACE RECOGNITION THRESHOLDS) ---
    # L2 Distance Threshold (Khoảng cách vector): Càng NHỎ càng giống.
    # InsightFace (ArcFace) thường dùng ngưỡng 1.0 - 1.2.
    # Với camera điện thoại thường (Mi 10T Lite), để 1.24 là hợp lý (chấp nhận sai lệch nhẹ).
    # Nếu vẫn khó nhận diện, tăng lên tối đa 1.30 (nhưng rủi ro nhận nhầm tăng).
    MATCH_THRESHOLD = 1.24
    
    # Ngưỡng an toàn tuyệt đối (High Confidence)
    SAFE_THRESHOLD = 0.95

    # --- CẤU HÌNH CHẤT LƯỢNG ẢNH (IMAGE QUALITY) ---
    
    # 1. Độ sáng (Brightness - Mean Value của kênh V trong HSV)
    # Thang đo 0-255. 
    # Nới lỏng khoảng chấp nhận để phù hợp điều kiện ánh sáng yếu/mạnh.
    MIN_BRIGHTNESS = 30   # Cũ: 40 -> Giảm xuống chập nhận tối hơn chút
    MAX_BRIGHTNESS = 230  # Cũ: 220 -> Tăng lên chấp nhận sáng hơn chút

    # 2. Độ nét (Blur Score - Laplacian Variance)
    # Càng cao càng nét. Camera trước điện thoại thường bị noise/mờ.
    # Giảm xuống 30 để chấp nhận ảnh hơi mờ/rung nhẹ (theo yêu cầu user).
    MIN_BLUR_SCORE = 30

    # --- CẤU HÌNH PHÁT HIỆN KHUÔN MẶT (DETECTION) ---
    # Kích thước khuôn mặt tối thiểu (pixel) để chấp nhận xử lý
    MIN_FACE_SIZE = (40, 40)
    
    # --- CÔNG THỨC QUY ĐỔI (DISTANCE TO CONFIDENCE) ---
    @staticmethod
    def calculate_confidence(distance: float) -> float:
        """
        Chuyển đổi L2 Distance sang Confidence Score (%).
        Công thức: Mapping khoảng cách [0, 2] chiều dài vector sang % độ tin cậy.
        """
        # Logic: 
        # Distance 0.0 -> 100%
        # Distance 1.24 -> ~50-60% (ngưỡng cắt)
        # Distance 2.0 -> 0%
        
        # Công thức tuyến tính đơn giản hóa:
        # confidence = max(0, (2.0 - distance) / 2.0) * 100
        
        # Công thức điều chỉnh để thể hiện rõ hơn ở ngưỡng threshold:
        # Nếu distance > 1.4 thì coi như 0%
        if distance > 1.4:
            return 0.0
            
        score = (1.4 - distance) / 1.4 * 100
        return max(0.0, min(100.0, score))

recognition_settings = RecognitionConfig()

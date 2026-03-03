"""
Rate / Threshold configuration for AI Face Recognition service.
Put tunable thresholds here so they can be changed without editing service code.
"""

# --- Quality thresholds (server-side) ---
# Baseline blur threshold (Laplacian variance). Lowered to 8.0 to accommodate lower resolution cameras.
BLUR_THRESHOLD = 8.0

# Brightness range (0-255)
BRIGHTNESS_MIN = 35
BRIGHTNESS_MAX = 230

# Pose thresholds (degrees)
MAX_YAW = 35.0
MAX_PITCH = 35.0
MAX_ROLL = 25.0

# Face size percent (of image area) used by client and server
FACE_PERCENT_MIN = 12.0   # minimum percent
FACE_PERCENT_MAX = 75.0   # maximum percent

# UI margins (percent of image width/height)
HORIZONTAL_MARGIN_LEFT_PERCENT = 0.12
HORIZONTAL_MARGIN_RIGHT_PERCENT = 0.20
VERTICAL_MARGIN_PERCENT = 0.15

# ===== ANTI-SPOOFING MODEL FILENAMES =====
# Tên file model ONNX — dùng trong face_liveness_service.py để build đường dẫn tìm kiếm
# Chỉ cần đổi ở đây nếu rename file model
LIVENESS_V1_MODEL = "MiniFASNetV1SE.onnx"
LIVENESS_V2_MODEL = "2.7_80x80_MiniFASNetV2.onnx"

# ===== LIVENESS THRESHOLDS (Anti-Spoofing) =====
# Dựa trên dữ liệu thực tế:
#   Ảnh GIẢ: V1_raw < 2.50%, V2_raw dao động 26%-71%
#   Ảnh THẬT: V1_raw > 2.60%, V2_raw dao động 29%-72%
# → V1 là chỉ số phân tách chính, V2 hỗ trợ lọc thêm
# NOTE: Đặt ngưỡng V2 ở 40% và V1 ở 2.6% theo yêu cầu mới
LIVENESS_V1_THRESHOLD = 0.026   # 2.6% — dưới mức này = FAKE
LIVENESS_V2_THRESHOLD = 0.40    # 40%

# Legacy alias — used by EnhancedInsightFaceService._check_liveness (old code path)
# Giá trị này đại diện cho ngưỡng anti-spoof chung khi chỉ dùng V2
LIVENESS_THRESHOLD = 0.40

# Recognition thresholds (cosine similarity của embedding — KHÔNG phải liveness)
# ─── Phân biệt rõ ───────────────────────────────────────────────────────────────
# MIN_THRESHOLD      : tối thiểu để log ra (chưa đủ tự tin)  →  0.35
# SAFE_THRESHOLD     : ngưỡng "đủ chắc" trả về matched        →  0.55
# FACE_MATCH_THRESHOLD: default dùng khi caller không truyền   →  0.60
# ────────────────────────────────────────────────────────────────────────────────
MIN_THRESHOLD = 0.35
SAFE_THRESHOLD = 0.55
FACE_MATCH_THRESHOLD = 0.60   # cosine similarity mặc định cho nhận diện điểm danh

# Face size px threshold (fallback)
FACE_SIZE_THRESHOLD_PX = 80

VERSION = "1.0"

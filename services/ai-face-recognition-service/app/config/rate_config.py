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

# Liveness / anti-spoof threshold (0-1). Set to 0.70 (Cân bằng giữa bảo mật và trải nghiệm người dùng)
LIVENESS_THRESHOLD = 0.70

# Recognition thresholds
MIN_THRESHOLD = 0.35
SAFE_THRESHOLD = 0.55

# Face size px threshold (fallback)
FACE_SIZE_THRESHOLD_PX = 80

VERSION = "1.0"

# AI Face Recognition Service

## ✅ SẴN SÀNG SỬ DỤNG

Service nhận diện khuôn mặt với InsightFace + Quality Check + Liveness Detection.

---

## 🚀 KHỞI ĐỘNG

```bash
conda activate face_env
python main.py
```

Service chạy tại: **http://localhost:4006**

---

## 📡 API ENDPOINTS

### 1. Register Face
```
POST /api/v1/face-recognition/register-face
```

### 2. Recognize Face (Attendance)
```
POST /api/v1/face-recognition/recognize-face
```

### 3. **Detect Face với UI (NEW)** ⭐
```
POST /api/v1/face-recognition/detect-face-with-ui
```

**Features:**
- ✅ Khung **XANH**: Vị trí tốt, đang nhận diện
- ✅ Khung **ĐỎ**: Có vấn đề, cần điều chỉnh
- ✅ Text hướng dẫn người dùng realtime
- ✅ Chỉ lấy face **LỚN NHẤT** (gần camera)
- ✅ Khung oval hướng dẫn giữa màn hình

---

## 🎯 CẤU TRÚC

```
app/services/
├── face_quality_service.py       ✅ Check blur/brightness/head pose
├── face_liveness_service.py      ✅ Anti-spoofing (ONNX)
└── face_recognition_service.py   ✅ Main orchestrator

app/utils/
├── image_utils.py                ✅ Image processing
└── face_ui_helper.py             ✅ UI drawing (NEW)

models/
└── anti_spoofing/
    └── 2.7_80x80_MiniFASNetV2.onnx ✅ Liveness model
```

---

## 💻 USAGE

```python
from app.services.face_recognition_service import face_recognizer
import cv2

# Load image
image = cv2.imread("face.jpg")

# Option 1: Process with UI
result, annotated_img = face_recognizer.process_face_with_ui(image)
cv2.imshow("Result", annotated_img)

# Option 2: Process without UI
result = face_recognizer.process_face(image)
if result.success:
    print(f"✅ Success: {result.face_data.embedding[:5]}...")
```

---

## 🔧 FEATURES

- ✅ **Clean Architecture** (3 services độc lập)
- ✅ **Singleton Pattern** (model load 1 lần)
- ✅ **UI Feedback** (khung xanh/đỏ + text hướng dẫn)
- ✅ **Multiple Faces** (tự động chọn face lớn nhất)
- ✅ **Quality Check** (blur, brightness, head pose)
- ✅ **Liveness Detection** (anti-spoofing)
- ✅ **GPU Support** (CUDA acceleration)

---

**Version**: 2.0.0 (Clean Architecture + UI)  
**Status**: ✅ PRODUCTION READY

# AI Face Recognition Service

Service chuyên biệt cho việc nhận diện khuôn mặt sử dụng AI và machine learning.

## Tính năng

- **Nhận diện khuôn mặt**: Sử dụng Python với thư viện face_recognition và PyTorch
- **Training model**: Thêm ảnh training để cải thiện độ chính xác
- **API RESTful**: Cung cấp các endpoint để tích hợp với các service khác
- **Xử lý ảnh**: Upload và xử lý ảnh từ mobile app và web

## Cài đặt

### Yêu cầu hệ thống

- Node.js 18+
- Python 3.8+
- MySQL/MariaDB

### Python Dependencies

```bash
pip install -r requirements.txt
```

### Node.js Dependencies

```bash
yarn install
```

## Cấu hình

1. Copy `env.example` thành `.env`
2. Cập nhật các thông số database và cấu hình khác

```env
PORT=4006
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hrms_db
CONFIDENCE_THRESHOLD=0.3
```

## Chạy service

### Development

```bash
yarn dev
```

### Production

```bash
yarn start
```

## API Endpoints

### 1. Nhận diện khuôn mặt

```
POST /api/face-recognition/recognize
Content-Type: multipart/form-data

Body:
- image: File ảnh cần nhận diện
```

**Response thành công:**
```json
{
  "success": true,
  "recognized": true,
  "userId": 123,
  "userInfo": {
    "username": "john_doe",
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "confidence": 0.85,
  "message": "Nhận diện thành công"
}
```

### 2. Thêm ảnh training

```
POST /api/face-recognition/add-training-image
Content-Type: multipart/form-data

Body:
- image: File ảnh training
- userId: ID người dùng
- username: Tên đăng nhập
```

### 3. Kiểm tra trạng thái

```
GET /api/face-recognition/status
```

## Cấu trúc thư mục

```
src/
├── controllers/
│   └── faceRecognitionController.js    # Controller xử lý logic
├── routes/
│   └── faceRecognition.js              # Định nghĩa routes
├── lib/
│   └── database.js                     # Kết nối database
└── face_recognition/                    # Python scripts
    ├── recognize.py                     # Script nhận diện chính
    ├── add_training_image.py           # Script thêm ảnh training
    └── weights/                        # Model weights
```

## Tích hợp với Mobile App

Mobile app sẽ gửi ảnh tới endpoint `/api/ai/recognize` thông qua API Gateway.

## Monitoring

- Health check: `GET /health`
- Logs được ghi ra console và có thể tích hợp với logging service

## Troubleshooting

### Lỗi Python không tìm thấy

Đảm bảo Python đã được cài đặt và có thể chạy từ command line:

```bash
python3 --version
# hoặc
python --version
```

### Lỗi model weights

Kiểm tra thư mục `weights/` có chứa file model cần thiết không.

### Lỗi database connection

Kiểm tra cấu hình database trong file `.env` và đảm bảo database đang chạy.


Cách 1 (Khuyến nghị): Dùng Conda để có dlib prebuilt
Cài Miniconda (nếu chưa có).
Mở terminal tại services/ai-face-recognition-service:
Trỏ service dùng đúng Python:
PowerShell:
$env:PYTHON_PATH="$(conda info --base)\envs\fr\python.exe"; npm run dev
Git Bash:
export PYTHON_PATH="$(conda info --base)/envs/fr/python.exe"; npm run dev

Git Bash: export PYTHON_PATH="$(pwd)/.venv/Scripts/python.exe"; npm run dev

thêm cái này vào đẻ kích hoạt môi trườngd
$ source /e/Anaconda/etc/profile.d/conda.sh
conda activate fr
(fr) 
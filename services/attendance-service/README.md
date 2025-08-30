# Attendance Service

Service chuyên biệt cho việc chấm công và quản lý thời gian làm việc sử dụng Express.js và TypeScript.

## Tính năng

- ⏰ Xác nhận chấm công (check-in/check-out)
- 📊 Kiểm tra trạng thái chấm công
- 📈 Lịch sử chấm công
- 🔐 Xác thực và phân quyền

## Cài đặt

### Yêu cầu hệ thống

- Node.js 16+
- PostgreSQL 12+

### Bước 1: Cài đặt dependencies

```bash
cd services/attendance-service
yarn install
```

### Bước 2: Cấu hình môi trường

```bash
cp env.example .env
# Chỉnh sửa .env theo cấu hình của bạn
```

### Bước 3: Khởi chạy service

```bash
# Development mode
yarn dev

# Production mode
yarn start
```

## Cấu trúc dự án

```
services/attendance-service/
├── src/
│   ├── controller/           # Controllers xử lý logic
│   │   └── AttendanceController.ts
│   └── lib/                  # Database connection
│       └── Databases/
│           └── Connection.ts
├── routes/                   # API routes
│   └── api.ts
├── server.js                 # Main server file
├── package.json
└── tsconfig.json
```

## API Endpoints

### Health Check
- `GET /health` - Kiểm tra trạng thái service

### Attendance Management
- `POST /api/confirm` - Xác nhận chấm công
- `GET /api/status/:userId` - Kiểm tra trạng thái chấm công
- `GET /api/history/:userId` - Lịch sử chấm công

## Cấu hình Database

### Tạo database

```sql
CREATE DATABASE attendance_service;
```

### Chạy migrations

```bash
yarn migrate
```

## Luồng hoạt động

### 1. Nhận diện khuôn mặt
- Mobile app gửi ảnh tới **AI Face Recognition Service** (`/api/ai/recognize`)
- AI service xử lý và trả về thông tin người dùng

### 2. Chấm công
- Mobile app nhận kết quả nhận diện từ AI service
- App gửi thông tin chấm công tới **Attendance Service** (`/api/confirm`)
- Attendance service lưu thông tin chấm công vào database

### 3. Kiểm tra trạng thái
- App có thể kiểm tra trạng thái chấm công qua `/api/status/:userId`
- Lấy lịch sử chấm công qua `/api/history/:userId`

## Cấu hình môi trường

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_DATABASE=attendance_service

# Service Configuration
PORT=4003
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

## Tích hợp với hệ thống

Attendance Service hoạt động cùng với:
- **AI Face Recognition Service**: Xử lý nhận diện khuôn mặt
- **API Gateway**: Điều hướng request
- **Auth Service**: Xác thực người dùng
- **Employee Service**: Quản lý thông tin nhân viên

## Monitoring

- Health check: `GET /health`
- Port mặc định: 4003
- Logs được ghi ra console

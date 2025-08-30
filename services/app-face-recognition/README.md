# Attendance App - Face Recognition

Ứng dụng chấm công bằng nhận diện khuôn mặt sử dụng React Native và Expo.

## Tính năng

- 📸 Chụp ảnh khuôn mặt để chấm công
- 🤖 Nhận diện khuôn mặt tự động
- 📱 Giao diện thân thiện với người dùng
- 🔄 Kết nối động với API Gateway
- 📊 Hiển thị thông tin chi tiết người dùng
- ✅ Xác nhận chấm công an toàn

## Cài đặt

### Yêu cầu hệ thống

- Node.js 16+ 
- npm hoặc yarn
- Expo CLI
- Android Studio (cho Android) hoặc Xcode (cho iOS)

### Bước 1: Cài đặt dependencies

```bash
cd services/app-face-recognition
npm install
# hoặc
yarn install
```

### Bước 2: Cài đặt Expo CLI (nếu chưa có)

```bash
npm install -g @expo/cli
```

### Bước 3: Khởi chạy ứng dụng

```bash
# Khởi động Expo development server
npm start
# hoặc
expo start
```

## Cấu hình

### 1. Cấu hình API Gateway

Ứng dụng sẽ tự động tìm và kết nối với API Gateway. Đảm bảo:

- API Gateway đang chạy trên port 3000
- Cùng mạng LAN với thiết bị di động
- Firewall không chặn kết nối

### 2. Cấu hình IP động

App sẽ tự động:
- Lấy IP từ thiết bị
- Tìm API Gateway hoạt động
- Cache URL để tối ưu hiệu suất

### 3. Cấu hình Face Recognition

Đảm bảo attendance service có:
- Ảnh identification của users trong `frontend/public/uploads/identificationPhoto/`
- Model face recognition đã được train
- Database connection hoạt động

## Sử dụng

### 1. Chấm công

1. Mở ứng dụng
2. Đặt khuôn mặt vào khung hình
3. Nhấn nút "Chấm công"
4. Xác nhận thông tin hiển thị
5. Nhấn "Xác nhận" để hoàn tất

### 2. Kiểm tra kết nối

- App sẽ hiển thị cảnh báo nếu không có kết nối mạng
- Tự động thử kết nối lại khi cần thiết
- Hiển thị trạng thái kết nối real-time

## Cấu trúc dự án

```
services/app-face-recognition/
├── App.js                 # Component chính
├── components/            # Các component UI
│   ├── CameraView.js     # Camera để chụp ảnh
│   └── AttendanceConfirmation.js # Xác nhận chấm công
├── services/             # API services
│   └── apiService.js     # Gọi API attendance
├── utils/                # Utilities
│   ├── networkUtils.js   # Quản lý kết nối mạng
│   └── fakeData.js       # Dữ liệu mẫu
└── assets/               # Hình ảnh và icons
```

## API Endpoints

### Attendance Service

- `POST /api/attendance/recognize` - Nhận diện khuôn mặt
- `POST /api/attendance/confirm` - Xác nhận chấm công
- `GET /api/attendance/status/:userId` - Kiểm tra trạng thái
- `GET /api/attendance/history/:userId` - Lịch sử chấm công

### Auth Service

- `GET /api/auth/users/:id` - Thông tin người dùng

## Xử lý lỗi

### Lỗi kết nối mạng

- Kiểm tra kết nối WiFi
- Đảm bảo cùng mạng LAN với server
- Kiểm tra firewall settings

### Lỗi nhận diện

- Đảm bảo ảnh rõ nét
- Kiểm tra ánh sáng
- Đặt khuôn mặt vào khung hình

### Lỗi server

- Kiểm tra API Gateway đang chạy
- Kiểm tra attendance service
- Xem logs server để debug

## Troubleshooting

### App không kết nối được server

1. Kiểm tra IP address của server
2. Đảm bảo port 3000 không bị chặn
3. Thử ping server từ thiết bị

### Face recognition không hoạt động

1. Kiểm tra ảnh identification trong database
2. Đảm bảo model đã được train
3. Kiểm tra logs của attendance service

### Performance issues

1. Giảm chất lượng ảnh chụp
2. Tối ưu kích thước ảnh
3. Kiểm tra cache settings

## Phát triển

### Thêm tính năng mới

1. Tạo component mới trong `components/`
2. Thêm API endpoint trong `services/`
3. Cập nhật routing trong `App.js`

### Testing

```bash
# Chạy tests
npm test

# Lint code
npm run lint

# Build production
expo build:android
expo build:ios
```

## Deployment

### Android

```bash
expo build:android -t apk
expo build:android -t app-bundle
```

### iOS

```bash
expo build:ios
```

### Web

```bash
expo build:web
```

## Bảo mật

- Sử dụng HTTPS cho production
- Validate input từ user
- Rate limiting cho API calls
- Logging cho audit trail

## Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra logs trong console
2. Xem documentation của Expo
3. Tạo issue trên GitHub repository
4. Liên hệ team development

## License

MIT License - xem file LICENSE để biết thêm chi tiết.

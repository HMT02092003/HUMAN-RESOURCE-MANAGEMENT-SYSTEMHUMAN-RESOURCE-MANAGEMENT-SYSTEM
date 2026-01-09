# 📝 Notification Service - README

## 🎯 Mục đích

Notification Service cung cấp giải pháp **Hybrid Push Notification** cho hệ thống HRM:
- **Web Admin**: Realtime notification qua Socket.io
- **Mobile App**: Push notification qua Firebase Cloud Messaging (FCM)
- **Database-First**: Mọi thông báo được lưu vào DB trước khi gửi

## 🏗️ Kiến trúc

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Service   │ ──────> │  Notification    │ ──────> │  Database   │
│  (Internal) │  HTTP   │     Service      │  Save   │ (Postgres)  │
└─────────────┘         └──────────────────┘         └─────────────┘
                               │     │
                               │     └──────> Socket.io ──> Web Client
                               │
                               └──────> FCM ──────────> Mobile App
```

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
cd services/notification-service
yarn install
```

### 2. Cấu hình .env

```env
PORT=4009
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=123456
DB_DATABASE=notification_service

JWT_SECRET=c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1

# Firebase (optional - nếu không có, FCM sẽ disabled)
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

### 3. Migrate database

```bash
yarn migrate
```

### 4. Chạy service

```bash
yarn dev
```

Service sẽ chạy tại: http://localhost:4009

## 📡 API Endpoints

### Public API (Client qua Gateway)

```
GET    /api/notifications              # Lấy danh sách thông báo (phân trang)
GET    /api/notifications/unread-count # Số thông báo chưa đọc
PATCH  /api/notifications/:id/read     # Đánh dấu đã đọc
PATCH  /api/notifications/read-all     # Đánh dấu tất cả đã đọc
POST   /api/notifications/device-token # Đăng ký FCM token (Mobile)
DELETE /api/notifications/device-token/:token # Xóa FCM token
```

### Internal API (Service to Service)

```
POST /internal/send                    # Gửi thông báo
GET  /internal/unread-count/:userId    # Số thông báo chưa đọc của user
```

## 📊 Database Schema

### Table: notifications

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  data JSON,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: user_devices

```sql
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  fcm_token VARCHAR(255) UNIQUE NOT NULL,
  platform ENUM('ios', 'android', 'web') NOT NULL,
  device_name VARCHAR(100),
  app_version VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔔 Notification Types

```typescript
LEAVE_APPROVE      # Đơn nghỉ phép được duyệt
LEAVE_REJECT       # Đơn nghỉ phép bị từ chối
OVERTIME_APPROVE   # Đơn OT được duyệt
TASK_ASSIGN        # Được giao task mới
SALARY_UPDATE      # Cập nhật lương
SHIFT_CHANGE       # Thay đổi ca làm
```

## 🛠️ Internal Call Example

Các service khác gọi để gửi thông báo:

```javascript
// Auth Service: Gửi thông báo khi duyệt đơn nghỉ phép
import axios from 'axios';

await axios.post('http://127.0.0.1:4009/internal/send', {
  userIds: [userId],
  title: 'Đơn nghỉ phép được duyệt',
  content: 'Đơn nghỉ phép từ 10/01 đến 12/01 đã được phê duyệt',
  type: 'LEAVE_APPROVE',
  data: {
    leave_id: 123,
    approver_name: 'Admin Nguyễn Văn A',
    start_date: '2026-01-10',
    end_date: '2026-01-12'
  }
});
```

## 🔌 Socket.io Events

### Client -> Server

```typescript
socket.emit('ping'); // Health check
```

### Server -> Client

```typescript
socket.on('new_notification', (data) => {
  // data = { id, title, content, type, data, created_at }
  console.log('New notification:', data);
});

socket.on('pong', (data) => {
  // data = { timestamp }
});
```

## 🔥 Firebase Setup

1. Tạo project: https://console.firebase.google.com/
2. Download Service Account Key (JSON)
3. Lưu vào `firebase-credentials.json`
4. Cập nhật `.env`: `FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json`

**Lưu ý**: Nếu không có Firebase, service vẫn hoạt động (Socket.io + DB), chỉ FCM bị disabled.

## 🧪 Testing

### Test Socket.io

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:4009', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => console.log('Connected'));
socket.on('new_notification', (data) => console.log('New:', data));
```

### Test Internal API

```bash
curl -X POST http://localhost:4009/internal/send \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [1],
    "title": "Test Notification",
    "content": "This is a test",
    "type": "TEST",
    "data": {}
  }'
```

## 📝 Client Integration

Xem chi tiết tại: [CLIENT_INTEGRATION_GUIDE.md](./CLIENT_INTEGRATION_GUIDE.md)

## 🔧 Tech Stack

- **Runtime**: Node.js + TypeScript (tsx)
- **Framework**: Express.js
- **Database**: PostgreSQL + Knex.js
- **Realtime**: Socket.io
- **Push**: Firebase Admin SDK
- **Auth**: jsonwebtoken

## 📦 Dependencies

```json
{
  "socket.io": "^4.8.1",
  "firebase-admin": "^13.6.0",
  "jsonwebtoken": "^9.0.2",
  "express": "^4.21.1",
  "knex": "^3.1.0",
  "objection": "^3.1.5",
  "pg": "^8.13.1"
}
```

## 🎯 Future Enhancements

- [ ] Email notifications
- [ ] SMS notifications
- [ ] Notification templates
- [ ] Scheduled notifications
- [ ] Notification preferences (user settings)
- [ ] Rich notifications (images, actions)

## 📞 Support

Nếu gặp vấn đề, check:
1. Database connection: `yarn knex migrate:status`
2. Service health: `curl http://localhost:4009/health`
3. Gateway routing: Check `services/api-gateway/config/services.js`

---

**✅ Service ready! Start coding!** 🚀

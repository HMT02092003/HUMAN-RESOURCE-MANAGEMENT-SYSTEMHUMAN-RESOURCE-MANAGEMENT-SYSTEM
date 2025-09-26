# Application Service

Microservice quản lý các loại đơn từ của nhân viên trong hệ thống HRMS.

## Tính năng chính

- **Quản lý đơn từ đa dạng**: Đơn công tác, nghỉ phép, làm thêm giờ, làm việc từ xa
- **Quy trình phê duyệt**: Gửi đơn → Chờ duyệt → Được duyệt/Từ chối
- **Lưu trữ linh hoạt**: Sử dụng JSONB để lưu thông tin chi tiết của từng loại đơn
- **Validation thông minh**: Kiểm tra trùng lặp, validate dữ liệu theo loại đơn
- **Thống kê và báo cáo**: Theo dõi tình trạng các đơn từ

## Các loại đơn từ được hỗ trợ

### 1. Đơn công tác (business-trip)
```json
{
  "startDate": "2025-10-01",
  "endDate": "2025-10-05", 
  "destination": "Hà Nội",
  "purpose": "Gặp gỡ đối tác...",
  "estimatedCost": 5000000,
  "evidenceFiles": ["booking.pdf", "ticket.jpg"]
}
```

### 2. Đơn nghỉ phép (leave)
```json
{
  "startDate": "2025-10-10",
  "endDate": "2025-10-12",
  "leaveType": "annual",
  "reason": "Nghỉ phép thường niên",
  "emergencyContact": "0912345678"
}
```

### 3. Đơn làm thêm giờ (overtime)
```json
{
  "date": "2025-09-30",
  "startTime": "18:00",
  "endTime": "22:00", 
  "reason": "Hoàn thành báo cáo cuối tháng",
  "estimatedHours": 4
}
```

### 4. Đơn làm việc từ xa (remote-work)
```json
{
  "startDate": "2025-10-01",
  "endDate": "2025-10-05",
  "reason": "Con nhỏ ốm, cần chăm sóc",
  "workLocation": "Tại nhà - 123 ABC, Q1",
  "equipmentNeeded": ["Laptop", "VPN"]
}
```

### 5. Đơn nghỉ ốm (sick-leave)
```json
{
  "startDate": "2025-09-20",
  "endDate": "2025-09-21",
  "leaveType": "sick",
  "reason": "Bị cảm cúm", 
  "emergencyContact": "0987654321"
}
```

## API Endpoints

### 📝 Tạo đơn từ
```
POST /api/applications
Content-Type: application/json

{
  "type": "business-trip",
  "data": { /* dữ liệu theo loại đơn */ },
  "note": "Ghi chú thêm"
}
```

### 📋 Lấy đơn của user hiện tại
```
GET /api/applications/my-applications?status=0
```

### 👔 Lấy đơn cần duyệt (Manager)
```
GET /api/applications/pending?type=business-trip
```

### ✅ Duyệt đơn
```
POST /api/applications/:id/approve
{
  "note": "Đã phê duyệt"
}
```

### ❌ Từ chối đơn
```
POST /api/applications/:id/reject
{
  "rejectionReason": "Không đủ điều kiện"
}
```

### 📊 Thống kê
```
GET /api/applications/stats?userId=1
```

### 🔍 Chi tiết đơn
```
GET /api/applications/:id
```

### ✏️ Cập nhật đơn (chỉ khi PENDING)
```
PUT /api/applications/:id
{
  "data": { /* dữ liệu mới */ }
}
```

### 🗑️ Hủy đơn
```
DELETE /api/applications/:id
```

## Trạng thái đơn từ

| Status | Mô tả | Có thể sửa | Có thể hủy |
|--------|-------|------------|------------|
| 0 | Chờ duyệt (PENDING) | ✅ | ✅ |
| 1 | Đã duyệt (APPROVED) | ❌ | ❌ |
| 2 | Bị từ chối (REJECTED) | ❌ | ❌ |

## Database Schema

```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,           -- Loại đơn
  status INTEGER DEFAULT 0,            -- Trạng thái
  data JSONB DEFAULT '{}',             -- Dữ liệu chi tiết
  userId INTEGER NOT NULL,             -- Người tạo đơn
  approvedBy INTEGER,                  -- Người duyệt
  applicationDate TIMESTAMP,           -- Ngày tạo đơn
  approvedDate TIMESTAMP,              -- Ngày duyệt
  reason TEXT,                         -- Lý do
  rejectionReason TEXT,                -- Lý do từ chối
  note TEXT,                          -- Ghi chú
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Cài đặt và chạy

```bash
# Cài đặt dependencies
yarn install

# Tạo database
createdb application-service

# Chạy migration
yarn migrate

# Tạo dữ liệu mẫu
yarn seed

# Chạy development mode
yarn dev
```

## Environment Variables

```env
PORT=4004
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=application-service
DB_USER=postgres
DB_PASSWORD=123456
```

## Testing với Postman/curl

### Tạo đơn công tác:
```bash
curl -X POST http://localhost:4004/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "business-trip",
    "data": {
      "startDate": "2025-11-01",
      "endDate": "2025-11-03", 
      "destination": "Đà Nẵng",
      "purpose": "Khảo sát dự án mới",
      "estimatedCost": 2000000
    }
  }'
```

### Lấy danh sách đơn:
```bash
curl http://localhost:4004/api/applications/pending
```

### Health check:
```bash
curl http://localhost:4004/health
```

## Logs và Monitoring

Service ghi log chi tiết các hoạt động:
- Tạo đơn từ mới
- Duyệt/từ chối đơn
- Lỗi validation
- Database operations

## Production Notes

- Cần có authentication middleware để lấy thông tin user
- Thêm rate limiting cho API endpoints
- Setup monitoring và alerting
- Database backup và recovery plan
- HTTPS cho production environment

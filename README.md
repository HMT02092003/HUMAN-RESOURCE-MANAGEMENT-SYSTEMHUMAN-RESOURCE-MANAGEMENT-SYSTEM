# HRMS Microservices Architecture

Hệ thống quản lý nhân sự (HRMS) được xây dựng theo kiến trúc microservices với API Gateway.

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │   Microservices │
│   (Next.js)     │◄──►│   (Port 3000)   │◄──►│                 │
│   (Port 3001)   │    │                 │    │ ┌─────────────┐ │
└─────────────────┘    └─────────────────┘    │ │Auth Service │ │
                                              │ │(Port 4001)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Employee     │ │
                                              │ │Service      │ │
                                              │ │(Port 4002)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Attendance   │ │
                                              │ │Service      │ │
                                              │ │(Port 4003)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Payroll      │ │
                                              │ │Service      │ │
                                              │ │(Port 4004)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Notification │ │
                                              │ │Service      │ │
                                              │ │(Port 4005)  │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
```

## 🚀 Các Services

### 1. **API Gateway** (Port 3000)
- **Chức năng**: Điểm vào duy nhất cho tất cả API calls
- **Tính năng**: 
  - Routing và load balancing
  - Authentication middleware
  - Rate limiting
  - CORS handling
  - Request/Response logging

### 2. **Auth Service** (Port 4001)
- **Chức năng**: Xử lý authentication và authorization
- **API Endpoints**:
  - `POST /api/auth/login` - Đăng nhập
  - `POST /api/auth/register` - Đăng ký
  - `POST /api/auth/forgot-password` - Quên mật khẩu
  - `POST /api/auth/reset-password` - Đặt lại mật khẩu
  - `POST /api/auth/refresh-token` - Làm mới token
  - `POST /api/auth/logout` - Đăng xuất
  - `GET /api/auth/verify-token` - Xác thực token

### 3. **Employee Service** (Port 4002)
- **Chức năng**: Quản lý thông tin nhân viên
- **API Endpoints**:
  - `GET /api/employee/users` - Lấy danh sách nhân viên
  - `POST /api/employee/users` - Tạo nhân viên mới
  - `PUT /api/employee/users/:id` - Cập nhật thông tin nhân viên
  - `DELETE /api/employee/users/:id` - Xóa nhân viên
  - `GET /api/employee/roles` - Quản lý vai trò
  - `GET /api/employee/departments` - Quản lý phòng ban
  - `GET /api/employee/chevrons` - Quản lý chức vụ
  - `GET /api/employee/contractTypes` - Quản lý loại hợp đồng

### 4. **Attendance Service** (Port 4003)
- **Chức năng**: Quản lý chấm công
- **API Endpoints**:
  - `POST /api/attendance/check-in` - Chấm công vào
  - `POST /api/attendance/check-out` - Chấm công ra
  - `GET /api/attendance/history` - Lịch sử chấm công
  - `POST /api/attendance/applications` - Đơn từ xin nghỉ

### 5. **Payroll Service** (Port 4004)
- **Chức năng**: Quản lý lương thưởng
- **API Endpoints**:
  - `GET /api/payroll/salary` - Thông tin lương
  - `POST /api/payroll/calculate` - Tính lương
  - `GET /api/payroll/reports` - Báo cáo lương

### 6. **Notification Service** (Port 4005)
- **Chức năng**: Gửi thông báo
- **API Endpoints**:
  - `POST /api/notification/send` - Gửi thông báo
  - `GET /api/notification/history` - Lịch sử thông báo

## 🛠️ Cài đặt và chạy

### 1. Cài đặt dependencies
```bash
# Cài đặt tất cả dependencies
yarn setup

# Hoặc cài đặt từng service
yarn install:all
```

### 2. Cấu hình database
```bash
# Chạy migrations
yarn db:migrate

# Chạy seeds
yarn db:seed
```

### 3. Chạy development
```bash
# Chạy tất cả services
yarn dev

# Chạy core services (Gateway + Auth + Employee + Frontend)
yarn dev:core

# Chạy từng service riêng lẻ
yarn dev:gateway    # API Gateway
yarn dev:auth       # Auth Service
yarn dev:employee   # Employee Service
yarn dev:frontend   # Frontend
```

### 4. Chạy production
```bash
# Chạy tất cả services
yarn start:all

# Chạy từng service riêng lẻ
yarn start:gateway
yarn start:auth
yarn start:employee
yarn start:frontend
```

## 🔧 Cấu hình Environment Variables

### API Gateway (.env)
```env
PORT=3000
NODE_ENV=development
AUTH_SERVICE_URL=http://localhost:4001
EMPLOYEE_SERVICE_URL=http://localhost:4002
ATTENDANCE_SERVICE_URL=http://localhost:4003
PAYROLL_SERVICE_URL=http://localhost:4004
NOTIFICATION_SERVICE_URL=http://localhost:4005
JWT_SECRET=your-super-secret-jwt-key
```

### Auth Service (.env)
```env
PORT=4001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/hrms_auth
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3000
```

## 📡 API Flow

### 1. Đăng nhập
```
Frontend → API Gateway → Auth Service → Database
```

### 2. Truy cập API được bảo vệ
```
Frontend → API Gateway (verify token) → Microservice → Database
```

### 3. Service-to-Service Communication
```
Microservice A → API Gateway → Microservice B
```

## 🔒 Security

- **JWT Authentication**: Tất cả API calls (trừ auth) đều yêu cầu JWT token
- **CORS**: Chỉ cho phép các origin được cấu hình
- **Rate Limiting**: Giới hạn số request từ mỗi IP
- **Helmet**: Bảo mật headers
- **Input Validation**: Validate tất cả input data

## 📊 Monitoring

- **Health Checks**: Mỗi service có endpoint `/health`
- **Request Logging**: Tất cả requests được log
- **Error Handling**: Centralized error handling

## 🚀 Deployment

### Docker (Recommended)
```bash
# Build và chạy với Docker Compose
docker-compose up -d
```

### Manual Deployment
```bash
# Build từng service
cd services/api-gateway && yarn build
cd services/auth-service && yarn build
# ... tương tự cho các service khác

# Chạy production
yarn start:all
```

## 📝 Development Guidelines

### 1. Thêm Service mới
1. Tạo thư mục `services/new-service`
2. Tạo `package.json` với dependencies cần thiết
3. Tạo `server.js` với Express setup
4. Thêm service vào API Gateway routing
5. Cập nhật scripts trong root `package.json`

### 2. API Design
- Sử dụng RESTful conventions
- Consistent error responses
- Proper HTTP status codes
- API versioning (nếu cần)

### 3. Database
- Mỗi service có database riêng
- Sử dụng Knex.js cho migrations
- Implement proper indexing
- Backup strategy

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - see LICENSE file for details 
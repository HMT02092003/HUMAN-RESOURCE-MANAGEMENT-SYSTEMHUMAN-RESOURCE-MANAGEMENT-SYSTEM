# HR Management System

Hệ thống quản lý nhân sự sử dụng kiến trúc microservice.

## Yêu cầu hệ thống

- Node.js (v14 trở lên)
- PostgreSQL (v12 trở lên)
- Redis (v6.0 trở lên)

## Cấu trúc dự án

```
├── api-gateway/         # API Gateway service
├── auth-service/        # Authentication service
├── user-service/        # User management service
├── department-service/  # Department management service
├── contract-service/    # Contract management service
└── frontend/           # React frontend application
```

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Cài đặt dependencies cho từng service:

```bash
# API Gateway
cd api-gateway
npm install

# Auth Service
cd ../auth-service
npm install

# User Service
cd ../user-service
npm install

# Department Service
cd ../department-service
npm install

# Contract Service
cd ../contract-service
npm install

# Frontend
cd ../frontend
npm install
```

3. Cấu hình môi trường:

Tạo file `.env` trong mỗi thư mục service với nội dung tương ứng:

```env
# API Gateway (.env)
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
DEPARTMENT_SERVICE_URL=http://localhost:3003
CONTRACT_SERVICE_URL=http://localhost:3004

# Auth Service (.env)
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379

# User Service (.env)
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_db
DB_USER=postgres
DB_PASSWORD=your_password

# Department Service (.env)
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=department_db
DB_USER=postgres
DB_PASSWORD=your_password

# Contract Service (.env)
PORT=3004
DB_HOST=localhost
DB_PORT=5432
DB_NAME=contract_db
DB_USER=postgres
DB_PASSWORD=your_password

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3000
```

4. Tạo database trong PostgreSQL:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE department_db;
CREATE DATABASE contract_db;
```

5. Chạy migrations:

```bash
# Auth Service
cd auth-service
npm run migrate

# User Service
cd ../user-service
npm run migrate

# Department Service
cd ../department-service
npm run migrate

# Contract Service
cd ../contract-service
npm run migrate
```

## Chạy ứng dụng

1. Khởi động Redis server:
```bash
redis-server
```

2. Chạy các services (mỗi service trong một terminal riêng):

```bash
# API Gateway
cd api-gateway
npm run dev

# Auth Service
cd auth-service
npm run dev

# User Service
cd user-service
npm run dev

# Department Service
cd department-service
npm run dev

# Contract Service
cd contract-service
npm run dev

# Frontend
cd frontend
npm start
```

3. Truy cập ứng dụng:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3000/api
- Auth Service: http://localhost:3001
- User Service: http://localhost:3002
- Department Service: http://localhost:3003
- Contract Service: http://localhost:3004

## API Documentation

API documentation có thể được truy cập tại:
- Swagger UI: http://localhost:3000/api-docs
- OpenAPI Specification: http://localhost:3000/api-docs.json

## Tài khoản mặc định

- Email: admin@example.com
- Password: admin123

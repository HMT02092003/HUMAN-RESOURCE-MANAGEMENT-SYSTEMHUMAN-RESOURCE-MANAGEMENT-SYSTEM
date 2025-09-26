# 🚀 Service Generator - HRMS Microservice

Tạo service microservice mới chỉ với **1 lệnh duy nhất**!

## 📋 Cách Sử Dụng

```bash
# Cách 1: Dùng npm script (Khuyến nghị)
npm run create:service <tên-service> <port> <tên-database>

# Cách 2: Chạy trực tiếp
node create-service.js <tên-service> <port> <tên-database>
```

### Ví Dụ Cụ Thể:
```bash
# Tạo user service
npm run create:service user-service 4007 user_database

# Tạo product service  
npm run create:service product-service 4008 product_db

# Tạo order service
npm run create:service order-service 4009 order_system
```

## 🏗️ Cấu Trúc Service Được Tạo Tự Động

```
services/your-service/
├── 📦 package.json          # Dependencies: Express, Knex, Objection, dayjs...
├── 🔧 .env                  # Cấu hình database & port
├── 🚀 server.js             # Express server chính
├── ⚙️ knexfile.js           # Cấu hình database
├── 📁 routes/
│   └── api.js              # API routes (GET, POST, PUT, DELETE)
├── 📁 src/
│   ├── controller/         # CRUD controllers với dayjs integration
│   ├── lib/database.js    # Knex + Objection setup
│   └── Models/            # Objection.js models
└── 📁 databases/
    ├── migrations/        # Database table schemas
    └── seeds/            # Dữ liệu mẫu
```

### 🎯 Tính Năng Có Sẵn Ngay:

✅ **RESTful API** hoàn chỉnh (CRUD operations)  
✅ **TypeScript** support với tsx  
✅ **Auto-reload** với nodemon  
✅ **Database ORM** (Knex + Objection)  
✅ **Date Management** với dayjs  
✅ **CORS** enabled  
✅ **Error Handling** middleware  
✅ **Health Check** endpoint  
✅ **Database Migrations** tự động  
✅ **Sample Data Seeds**

## ⚡ Các Bước Sau Khi Tạo Service

1. **Tạo database PostgreSQL:**
   ```bash
   # Tạo database mới
   createdb your_database_name
   
   # Hoặc dùng pgAdmin/psql
   psql -U postgres -c "CREATE DATABASE your_database_name;"
   ```

2. **Di chuyển vào thư mục service:**
   ```bash
   cd services/your-service-name
   ```

3. **Chạy database migrations & seeds:**
   ```bash
   # Tạo bảng database
   yarn migrate
   
   # Thêm dữ liệu mẫu  
   yarn seed
   ```

4. **Khởi động service:**
   ```bash
   # Development mode (auto reload)
   yarn dev
   
   # Production mode
   yarn start
   ```

5. **Kiểm tra service hoạt động:**
   ```bash
   curl http://localhost:<port>/health
   # Kết quả: {"status":"OK","service":"your-service","port":4007}
   ```

## 🛠️ Stack Công Nghệ

| Thành Phần | Thư Viện | Mô Tả |
|------------|----------|-------|
| **Web Framework** | Express.js | RESTful API server |
| **Database** | PostgreSQL | Relational database |  
| **Query Builder** | Knex.js | SQL query builder |
| **ORM** | Objection.js | Object-relational mapping |
| **Date/Time** | dayjs | Date manipulation |
| **CORS** | cors | Cross-origin requests |
| **Environment** | dotenv | Environment variables |
| **TypeScript** | tsx | TypeScript execution |
| **Dev Tools** | nodemon | Auto-reload development |

## 🌐 API Endpoints (Tự Động Tạo)

| Method | Endpoint | Mô Tả | Response |
|--------|----------|-------|----------|
| `GET` | `/health` | Health check | `{"status":"OK","service":"name","port":4007}` |
| `GET` | `/api/` | Lấy tất cả items | `{"success":true,"data":[...],"timestamp":"2024-..."}` |
| `GET` | `/api/:id` | Lấy item theo ID | `{"success":true,"data":{...},"timestamp":"2024-..."}` |
| `POST` | `/api/` | Tạo item mới | `{"success":true,"data":{...},"timestamp":"2024-..."}` |
| `PUT` | `/api/:id` | Cập nhật item | `{"success":true,"data":{...},"timestamp":"2024-..."}` |
| `DELETE` | `/api/:id` | Xóa item | `{"success":true,"message":"Deleted 1","timestamp":"2024-..."}` |

## 🔧 Quản Lý Port

**Port được sử dụng trong hệ thống:**

| Service | Port | Trạng Thái |
|---------|------|-----------|
| **api-gateway** | 4000 | ✅ Đang dùng |
| **auth-service** | 4001 | ✅ Đang dùng |  
| **employee-service** | 4002 | ✅ Đang dùng |
| **attendance-service** | 4003 | ✅ Đang dùng |
| **ai-face-recognition** | 4004 | ✅ Đang dùng |
| **notification-service** | 4005 | 🔄 Sẵn sàng |
| **payroll-service** | 4006 | 🔄 Sẵn sàng |
| **Services mới** | 4007+ | 🆓 Có thể dùng |

## ⚙️ Environment Variables

File `.env` sẽ được tạo tự động với cấu hình:

```env
# Server Configuration  
PORT=4007
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=123456
DB_PORT=5432
DB_DATABASE=your_database_name
```

> ⚠️ **Lưu ý:** Thay đổi thông tin database phù hợp với setup của bạn!

## 📚 Ví Dụ Sử Dụng Chi Tiết

### 1. Tạo User Service:
```bash
npm run create:service user-service 4007 user_management

# Kết quả:
# ✅ Service created!
# 📋 Next:
# 1. cd services/user-service
# 2. createdb user_management  
# 3. yarn migrate && yarn seed
# 4. yarn dev
```

### 2. Test API sau khi tạo:
```bash
# Health check
curl http://localhost:4007/health

# Get all users
curl http://localhost:4007/api/

# Create new user
curl -X POST http://localhost:4007/api/ \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe"}'
```

### 3. Customize Service:
- **Models**: Sửa `src/Models/UserModel.js` để thêm fields
- **Controllers**: Sửa `src/controller/user-controller.js` để thêm logic
- **Routes**: Sửa `routes/api.js` để thêm endpoints
- **Database**: Tạo migration mới với `knex migrate:make ten_migration`

---

## 🎯 Kết Luận

**✨ Tạo service microservice hoàn chỉnh chỉ với 1 lệnh!**

Bao gồm đầy đủ:
- 🚀 Express server với TypeScript
- 🗄️ PostgreSQL integration  
- 📝 CRUD operations sẵn sàng
- ⏰ Date management với dayjs
- 🔄 Auto-reload development
- ✅ Error handling & validation
- 🏥 Health check endpoint

**Ready to use ngay lập tức! 🎉**

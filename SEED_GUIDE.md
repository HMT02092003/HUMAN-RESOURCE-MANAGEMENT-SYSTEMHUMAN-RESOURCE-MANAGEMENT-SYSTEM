# 📖 HƯỚNG DẪN CHẠY SEED DATA CHO HỆ THỐNG QUẢN LÝ NHÂN SỰ

## 🎯 Tổng quan
Tài liệu này hướng dẫn chi tiết cách chạy các file seed để tạo dữ liệu mẫu cho 50 nhân viên trong hệ thống, bao gồm:
- Vai trò (roles)
- Phòng ban (departments)
- Chức vụ (chevrons)
- Loại hợp đồng (contract_types)
- Nhân viên (users)
- Hợp đồng (contracts)
- Chấm công tháng 10/2025 (time_attendances)
- Đơn từ (applications)
- Bảng tổng hợp tháng (monthly_attendances)

## ⚠️ LƯU Ý QUAN TRỌNG
- **Tất cả các lệnh phải chạy từ thư mục gốc của từng service**
- **Chạy theo đúng thứ tự** để đảm bảo các foreign key hợp lệ
- **Dữ liệu cũ sẽ bị xóa** khi chạy seed (trừ admin account)
- **Password mặc định** cho tất cả nhân viên: `123456@`

---

## 📋 THỨ TỰ CHẠY SEEDS

### BƯỚC 1: AUTH SERVICE - Roles và Users

#### 1.1. Thêm vai trò "Nhân sự"
```bash
cd services/auth-service
npx knex seed:run --specific=01_seed_roles.js
```

**Kết quả mong đợi:**
- ✅ 5 vai trò: Admin, Nhân viên, Trưởng phòng, Kế toán, Nhân sự

#### 1.2. Tạo 50 nhân viên
```bash
npx knex seed:run --specific=10_users_50_employees.js
```

**Kết quả mong đợi:**
- ✅ 50 users (bao gồm 1 admin + 49 nhân viên mới)
- ✅ Phân bổ đều 6 phòng ban: Kỹ thuật (10), Kinh doanh (9), Nhân sự (6), Kế toán (8), Marketing (8), Hành chính (8)
- ✅ Phân bổ 5 chức vụ: Nhân viên, Trưởng nhóm, Phó phòng, Trưởng phòng, Giám đốc

**Thông tin đăng nhập:**
- Username: `kt2`, `kd11`, `ns21`, `acc27`, `mkt35`, `hc43`, v.v.
- Password: `123456@`

---

### BƯỚC 2: EMPLOYEE SERVICE - Departments, Chevrons, Contract Types, Contracts

#### 2.1. Tạo phòng ban
```bash
cd services/employee-service
npx knex seed:run --specific=01_departments_seed.cjs
```

**Kết quả mong đợi:**
- ✅ 6 phòng ban: Kỹ thuật, Kinh doanh, Nhân sự, Kế toán, Marketing, Hành chính

#### 2.2. Tạo chức vụ
```bash
npx knex seed:run --specific=02_chevrons_seed.cjs
```

**Kết quả mong đợi:**
- ✅ 5 chức vụ với hệ số:
  - Nhân viên (1.0)
  - Trưởng nhóm (1.3)
  - Phó phòng (1.6)
  - Trưởng phòng (2.0)
  - Giám đốc (3.0)

#### 2.3. Tạo loại hợp đồng
```bash
npx knex seed:run --specific=03_contract_types_seed.cjs
```

**Kết quả mong đợi:**
- ✅ 4 loại hợp đồng:
  - Thử việc (2 tháng)
  - Xác định thời hạn 1 năm
  - Xác định thời hạn 2 năm
  - Không xác định thời hạn

#### 2.4. Tạo hợp đồng cho 50 nhân viên
```bash
npx knex seed:run --specific=10_contracts_50_employees.cjs
```

**Kết quả mong đợi:**
- ✅ 50 hợp đồng cho 50 nhân viên
- ✅ Phân bổ hợp lý theo chức vụ và thời gian làm việc

---

### BƯỚC 3: ATTENDANCE SERVICE - Chấm công và Tổng hợp tháng

#### 3.1. Tạo dữ liệu chấm công tháng 10/2025
```bash
cd services/attendance-service
npx knex seed:run --specific=10_october_2025_50_employees_attendance.cjs
```

**Kết quả mong đợi:**
- ✅ ~1000-1100 bản ghi chấm công (trung bình ~20-22 ngày/người)
- ✅ Dữ liệu ngẫu nhiên hợp lý:
  - Đi trễ, về sớm
  - Vắng mặt
  - OT (overtime)
  - Tính toán phạt và lương OT tự động

**Thời gian chạy:** ~10-30 giây tùy máy

#### 3.2. Tạo bảng tổng hợp tháng 10/2025
```bash
npx knex seed:run --specific=11_monthly_summary_october_2025.cjs
```

**Kết quả mong đợi:**
- ✅ 50 bản ghi tổng hợp (1 bản ghi/nhân viên)
- ✅ Tính toán tự động:
  - Số ngày có mặt, vắng mặt
  - Tổng giờ làm việc, giờ OT
  - Tổng tiền phạt (đi trễ, về sớm, vắng không phép)
  - Tổng lương OT

**Thời gian chạy:** ~15-45 giây (do phải query dữ liệu chấm công)

---

### BƯỚC 4: APPLICATION SERVICE - Đơn từ

#### 4.1. Tạo đơn từ tháng 10/2025
```bash
cd services/application-service
npx knex seed:run --specific=10_october_2025_applications.js
```

**Kết quả mong đợi:**
- ✅ ~150-250 đơn từ cho 49 nhân viên (trừ admin)
- ✅ Các loại đơn:
  - Nghỉ phép (leave)
  - Công tác (business-trip)
  - OT (overtime)
- ✅ Trạng thái: Đã duyệt, Chờ duyệt, Từ chối

**Thời gian chạy:** ~5-15 giây

---

## 🔍 KIỂM TRA KẾT QUẢ

### Kiểm tra từng service:

#### Auth Service:
```bash
cd services/auth-service
npx knex seed:run --specific=01_seed_roles.js
```

#### Employee Service:
```sql
-- Kết nối PostgreSQL
psql -U postgres -d employee_db

-- Kiểm tra
SELECT * FROM departments;
SELECT * FROM chevrons;
SELECT * FROM contract_types;
SELECT COUNT(*) FROM contracts;  -- Phải = 50
```

#### Attendance Service:
```sql
psql -U postgres -d attendance_db

-- Kiểm tra chấm công
SELECT COUNT(*) FROM time_attendances WHERE date BETWEEN '2025-10-01' AND '2025-10-31';

-- Kiểm tra tổng hợp
SELECT COUNT(*) FROM monthly_attendances WHERE month = '2025-10';  -- Phải = 50
```

#### Application Service:
```sql
psql -U postgres -d application_db

-- Kiểm tra đơn từ
SELECT type, status, COUNT(*) FROM applications 
WHERE created_at BETWEEN '2025-10-01' AND '2025-10-31'
GROUP BY type, status;
```

---

## 🔧 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "Foreign key constraint violation"
**Nguyên nhân:** Chạy sai thứ tự hoặc dữ liệu phụ thuộc chưa được tạo.

**Giải pháp:**
1. Xóa hết dữ liệu và chạy lại từ đầu theo đúng thứ tự
2. Đảm bảo auth-service chạy trước, sau đó employee-service, rồi mới attendance/application

### Lỗi: "relation does not exist"
**Nguyên nhân:** Migration chưa chạy.

**Giải pháp:**
```bash
cd services/<service-name>
npx knex migrate:latest
```

### Lỗi: "Seed file not found"
**Nguyên nhân:** Đang ở sai thư mục.

**Giải pháp:** Đảm bảo cd đúng vào thư mục service trước khi chạy seed.

### Lỗi khi chạy monthly summary: "Cannot read property of undefined"
**Nguyên nhân:** Dữ liệu chấm công hoặc đơn từ chưa được tạo.

**Giải pháp:** Chạy lại seed chấm công và đơn từ trước.

---

## 📊 THỐNG KÊ DỮ LIỆU SAU KHI SEED

| Bảng | Số lượng records | Service |
|------|------------------|---------|
| roles | 5 | auth-service |
| users | 50 | auth-service |
| departments | 6 | employee-service |
| chevrons | 5 | employee-service |
| contract_types | 4 | employee-service |
| contracts | 50 | employee-service |
| time_attendances | ~1000-1100 | attendance-service |
| monthly_attendances | 50 | attendance-service |
| applications | ~150-250 | application-service |

**Tổng thời gian chạy toàn bộ:** ~2-5 phút

---

## 🚀 CHẠY NHANH TẤT CẢ (Advanced)

**⚠️ Chỉ dành cho người có kinh nghiệm!**

Bạn có thể tạo script bash để chạy tất cả seeds:

```bash
#!/bin/bash
# run-all-seeds.sh

echo "🚀 Bắt đầu seed dữ liệu..."

# Auth Service
echo "📝 Seeding Auth Service..."
cd services/auth-service
npx knex seed:run --specific=01_seed_roles.js
npx knex seed:run --specific=10_users_50_employees.js

# Employee Service
echo "📝 Seeding Employee Service..."
cd ../employee-service
npx knex seed:run --specific=01_departments_seed.cjs
npx knex seed:run --specific=02_chevrons_seed.cjs
npx knex seed:run --specific=03_contract_types_seed.cjs
npx knex seed:run --specific=10_contracts_50_employees.cjs

# Attendance Service
echo "📝 Seeding Attendance Service..."
cd ../attendance-service
npx knex seed:run --specific=10_october_2025_50_employees_attendance.cjs
npx knex seed:run --specific=11_monthly_summary_october_2025.cjs

# Application Service
echo "📝 Seeding Application Service..."
cd ../application-service
npx knex seed:run --specific=10_october_2025_applications.js

cd ../..
echo "✅ Hoàn thành seed dữ liệu!"
```

Chạy script:
```bash
chmod +x run-all-seeds.sh
./run-all-seeds.sh
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. ✅ Đã chạy migrations chưa?
2. ✅ Đã chạy đúng thứ tự chưa?
3. ✅ Database connection có hoạt động không?
4. ✅ Có xung đột dữ liệu cũ không?

---

**Chúc bạn seed data thành công! 🎉**

# 📘 HƯỚNG DẪN CHẠY SEEDS VÀ MIGRATE# 📘 HƯỚNG DẪN CHẠY SEEDS - SEED EXECUTION GUIDE



## 📋 Mục lục## 📋 Mục lục

1. [Tổng quan](#tổng-quan)1. [Tổng quan](#tổng-quan)

2. [Chạy Migrations](#chạy-migrations)2. [Thứ tự chạy seeds](#thứ-tự-chạy-seeds)

3. [Thứ tự chạy Seeds](#thứ-tự-chạy-seeds)3. [Chi tiết từng bước](#chi-tiết-từng-bước)

4. [Lệnh nhanh (Quick Commands)](#lệnh-nhanh)4. [Verify dữ liệu](#verify-dữ-liệu)

5. [Verify dữ liệu](#verify-dữ-liệu)5. [Troubleshooting](#troubleshooting)

6. [Troubleshooting](#troubleshooting)

---

---

## 🎯 Tổng quan

## 🎯 Tổng quan

Hệ thống seed được chia thành **3 giai đoạn chính**:

Hệ thống được chia thành **4 giai đoạn chính**:1. **Foundation** - Seeds cơ bản (roles, departments, permissions...)

2. **Users & Contracts** - Tạo 100 users + contracts + salaries

| Giai đoạn | Mô tả | Services |3. **Attendance & Applications** - Chấm công + Đơn từ tháng 10 & 11/2025

|-----------|-------|----------|

| 1. Foundation | Roles, Permissions, Departments, Chevrons | auth, employee, salary |---

| 2. Users | 100 users + Contracts + Salaries | auth (master seed) |

| 3. Attendance | Chấm công + Ca làm việc + Ngày lễ | attendance |## 📝 Thứ tự chạy seeds

| 4. Applications | Đơn từ (nghỉ phép, công tác) | application |

### GIAI ĐOẠN 1: FOUNDATION (Seeds cơ bản)

**Cập nhật lần cuối**: December 2025

```bash

---# 1.1 Auth Service - Roles & Permissions

cd services/auth-service

## 🔧 Chạy Migrationsyarn knex seed:run --specific=01_seed_roles.js

yarn knex seed:run --specific=03_seed_permissions.js

**QUAN TRỌNG**: Chạy migrations TRƯỚC khi chạy seeds!yarn knex seed:run --specific=04_seed_role_permissions.js



```bash# 1.2 Employee Service - Departments & Chevrons

# Từ thư mục gốc của projectcd ../employee-service

cd services/auth-service && yarn knex migrate:latestyarn knex seed:run --specific=01_departments_seed.cjs

cd ../employee-service && yarn knex migrate:latestyarn knex seed:run --specific=02_chevrons_seed.cjs

cd ../salary-service && yarn knex migrate:latestyarn knex seed:run --specific=03_contract_types_seed.cjs

cd ../attendance-service && yarn knex migrate:latest

cd ../application-service && yarn knex migrate:latest# 1.3 Salary Service - Allowance Types

cd ../job-service && yarn knex migrate:latestcd ../salary-service

```yarn knex seed:run --specific=002_allowance_types.cjs

```

---

**Output mong đợi**:

## 📝 Thứ tự chạy Seeds- ✅ 5 Roles (Admin, Employee, Leader, Accountant, HR)

- ✅ 49 Permissions

### GIAI ĐOẠN 1: FOUNDATION- ✅ 61 Role-Permission mappings

- ✅ 6 Departments

```bash- ✅ 7 Chevrons (CEO → Staff)

# 1.1 Auth Service - Roles & Permissions- ✅ 3 Contract Types

cd services/auth-service- ✅ Allowance Types

yarn knex seed:run --specific=01_seed_roles.js

yarn knex seed:run --specific=03_seed_permissions.js---

yarn knex seed:run --specific=04_seed_role_permissions.js

### GIAI ĐOẠN 2: USERS & CONTRACTS

# 1.2 Employee Service - Departments & Chevrons

cd ../employee-service```bash

yarn knex seed:run --specific=01_departments_seed.cjs# 2.1 Master Seed - Tạo 99 Users + Contracts + Salaries với Cấu Trúc Thực Tế

yarn knex seed:run --specific=02_chevrons_seed.cjscd services/auth-service

yarn knex seed:run --specific=03_contract_types_seed.cjsyarn knex seed:run --specific=17_final_100_users_realistic.js

```

# 1.3 Salary Service - Allowance Types

cd ../salary-service**Output mong đợi**:

yarn knex seed:run --specific=002_allowance_types.cjs```

```🚀 ========================================

   SEED: 100 Users với Cấu Trúc Thực Tế

**Output mong đợi**:========================================

- ✅ 5 Roles (Admin, Employee, Leader, Accountant, HR)

- ✅ 49 Permissions📝 Step 1: Cleaning existing data...

- ✅ 61 Role-Permission mappings   ✅ Cleaned old data & reset sequences

- ✅ 6 Departments

- ✅ 7 Chevrons (CEO → Staff)📝 Step 2: Creating Admin user...

- ✅ 3 Contract Types   ✅ Created admin user

- ✅ Allowance Types      Username: admin

      Password: 123456@

---      Role: Admin (Full Access)



### GIAI ĐOẠN 2: USERS (Master Seed)📝 Step 3: Creating department users...

   ## Hướng dẫn chạy migrate & seed (ngắn gọn)

```bash

cd services/auth-service   Chỉ liệt kê các lệnh cần thiết để chạy migration và seed trên từng service. Dùng `yarn` (nếu có) hoặc `npx knex` nếu không.

yarn knex seed:run --specific=17_final_100_users_realistic.js

```   Lưu ý: chạy trong bash (hoặc dùng `yarn --cwd <path> ...`).



**Seed này tạo đồng thời**:   ### Auth Service

- 100 Users trong `auth_service.users`

- 100 Contracts trong `employee_service.contracts`   ```bash

- 100 Salary Profiles trong `salary_service.employee_salary_profiles`   cd services/auth-service

   yarn knex migrate:latest

**Tài khoản quan trọng**:   # Foundation

| Username | Password | Role | Ghi chú |   yarn knex seed:run --specific=01_seed_roles.js

|----------|----------|------|---------|   yarn knex seed:run --specific=03_seed_permissions.js

| admin | 123456@ | Admin | Full system access |   yarn knex seed:run --specific=04_seed_role_permissions.js

| toanhm | 123456@ | Leader | Tech Leader |   # Users & contracts

| tech_mid001 | 123456@ | Employee | Nhân viên kỹ thuật |   yarn knex seed:run --specific=17_final_100_users_realistic.js

   ```

---

   ### Employee Service

### GIAI ĐOẠN 3: ATTENDANCE

   ```bash

```bash   cd services/employee-service

cd services/attendance-service   yarn knex migrate:latest

   yarn knex seed:run --specific=01_departments_seed.cjs

# 3.1 Ngày lễ 2025   yarn knex seed:run --specific=02_chevrons_seed.cjs

yarn knex seed:run --specific=01_holidays_seed.cjs   yarn knex seed:run --specific=03_contract_types_seed.cjs

   ```

# 3.2 Ca làm việc (Hành chính, Ca sáng, Ca chiều...)

yarn knex seed:run --specific=21_shifts_seed.cjs   ### Salary Service



# 3.3 Chấm công tháng 10, 11, 12/2025 (đến ngày hiện tại)   ```bash

yarn knex seed:run --specific=44_seed_oct_nov_dec_2025_final.cjs   cd services/salary-service

```   yarn knex migrate:latest

   yarn knex seed:run --specific=002_allowance_types.cjs

**Output**:   ```

- ✅ ~4,200 time_attendances records

- ✅ 300 monthly_attendances records (100 users × 3 tháng)   ### Attendance Service



---   ```bash

   cd services/attendance-service

### GIAI ĐOẠN 4: APPLICATIONS   yarn knex migrate:latest

   # Tạo chấm công tháng 10 & 11

```bash   yarn knex seed:run --specific=15_october_2025_100_employees_attendance.cjs

cd services/application-service   yarn knex seed:run --specific=12_november_2025_100_employees_attendance.cjs

   # Tính tổng hợp monthly_attendances (penalties...)

# Đơn từ (chỉ nghỉ phép + công tác)   yarn knex seed:run --specific=17_calculate_monthly_oct_nov_2025.cjs

yarn knex seed:run --specific=40_applications_seed.cjs   ```

```

   ### Application Service

**Output**:

- ✅ ~444 applications (nghỉ phép + công tác)   ```bash

- ✅ Công tác có thể qua cuối tuần (để tính OT)   cd services/application-service

   yarn knex migrate:latest

---   yarn knex seed:run --specific=16_october_2025_applications.cjs

   yarn knex seed:run --specific=14_november_2025_applications.js

### GIAI ĐOẠN 5: TÍNH TOÁN TIỀN PHẠT   ```



```bash   ### Nếu không dùng yarn (thay bằng npx)

cd services/attendance-service

   ```bash

# Script tính penalty (đi muộn, về sớm, nghỉ không phép)   # Ví dụ từ repo root

node scripts/recalculate_monthly.cjs   npx --yes knex --cwd services/auth-service migrate:latest

```   npx --yes knex --cwd services/auth-service seed:run --specific=01_seed_roles.js

   ```

**Output**:

- ✅ Cập nhật totalLatePenalty (10,000đ/phút)   ---

- ✅ Cập nhật totalEarlyLeavePenalty (10,000đ/phút)

- ✅ Cập nhật totalUnauthorizedAbsencePenalty   Ngắn gọn: chạy `migrate:latest` trên từng service trước, sau đó chạy các `seed:run --specific=...` theo thứ tự: foundation → users/contracts → attendance/applications. Nếu muốn, mình có thể rút gọn thêm theo 1 script duy nhất.

├── Phòng Kinh doanh: 28 users

---│   ├── 1 Trưởng phòng

│   ├── 1 Phó phòng

## ⚡ Lệnh nhanh│   ├── 2 Team Leaders

│   └── 24 Nhân viên

### Chạy tất cả từ đầu├── Phòng Marketing: 20 users

│   ├── 1 Trưởng phòng

```bash│   ├── 1 Phó phòng

#!/bin/bash│   ├── 2 Team Leaders

# seed-all.sh│   └── 16 Nhân viên

├── Phòng Tài chính: 10 users (Accountant role)

echo "🚀 Starting full seed process..."│   ├── 1 Trưởng phòng

│   ├── 1 Phó phòng

# Migrations│   └── 8 Kế toán (scope: global)

cd services/auth-service && yarn knex migrate:latest└── Phòng Nhân sự: 10 users (HR role)

cd ../employee-service && yarn knex migrate:latest    ├── 1 Trưởng phòng

cd ../salary-service && yarn knex migrate:latest    ├── 1 Phó phòng

cd ../attendance-service && yarn knex migrate:latest    └── 8 Nhân sự (scope: global)

cd ../application-service && yarn knex migrate:latest```



# Foundation**Tài khoản quan trọng**:

cd ../auth-service- **Admin**: `admin` / `123456@` (Full system access)

yarn knex seed:run --specific=01_seed_roles.js- **Tech Leader**: `toanhm` / `123456@` (Leader - Công nghệ)

yarn knex seed:run --specific=03_seed_permissions.js- **Employees**: `tech_mid001`, `sales_lead001`, etc. / `123456@`

yarn knex seed:run --specific=04_seed_role_permissions.js

---

cd ../employee-service

yarn knex seed:run --specific=01_departments_seed.cjs### Step 3: Attendance Records

yarn knex seed:run --specific=02_chevrons_seed.cjs

yarn knex seed:run --specific=03_contract_types_seed.cjs**Mục đích**: Tạo dữ liệu chấm công cho 99 users trong tháng 10 & 11/2025



cd ../salary-service**Thời gian**: ~5 giây

yarn knex seed:run --specific=002_allowance_types.cjs

**Dependencies**: Users phải được tạo trước

# Users

cd ../auth-service**Seeds**:

yarn knex seed:run --specific=17_final_100_users_realistic.js- `15_october_2025_100_employees_attendance.cjs` - Tháng 10/2025

- `12_november_2025_100_employees_attendance.cjs` - Tháng 11/2025

# Attendance

cd ../attendance-service**Logic**:

yarn knex seed:run --specific=01_holidays_seed.cjs- Chỉ tạo attendance cho ngày làm việc (loại bỏ cuối tuần)

yarn knex seed:run --specific=21_shifts_seed.cjs- Check-in: 7:30-9:00

yarn knex seed:run --specific=44_seed_oct_nov_dec_2025_final.cjs- Check-out: 17:00-18:30

- Mỗi user có xác suất vắng mặt khác nhau (4-15%)

# Applications- Tự động tính: workHours, lateMinutes, earlyDepartureMinutes

cd ../application-service

yarn knex seed:run --specific=40_applications_seed.cjs**Output**:

- Tháng 10: ~2,100 records (23 working days × 99 users)

# Calculate penalties- Tháng 11: ~1,900 records (20 working days × 99 users)

cd ../attendance-service

node scripts/recalculate_monthly.cjs---



echo "✅ All seeds completed!"### Step 4: Applications

```

**Mục đích**: Tạo đơn từ (nghỉ phép, công tác, tăng ca) cho 99 users

### Chỉ chạy lại chấm công + đơn từ

**Thời gian**: ~3 giây

```bash

# Reset và chạy lại attendance + applications**Dependencies**: Users phải được tạo trước

cd services/attendance-service

yarn knex seed:run --specific=44_seed_oct_nov_dec_2025_final.cjs---



cd ../application-service## 🗓️ Cập nhật kết quả chạy seed (14-11-2025)

yarn knex seed:run --specific=40_applications_seed.cjs

Tôi đã chạy seed test cho phần Attendance + phép tính tổng hợp tháng (Oct & Nov 2025) và ghi lại kết quả ở đây để bạn tiện theo dõi.

cd ../attendance-service

node scripts/recalculate_monthly.cjs- Lệnh tôi chạy (từ thư mục gốc của repo):

```

```bash

---yarn --cwd services/attendance-service knex seed:run --specific=17_calculate_monthly_oct_nov_2025.cjs

```

## ✅ Verify dữ liệu

- Kết quả (tóm tắt):

### Kiểm tra số lượng records   - ✅ Seed tính toán `monthly_attendances` đã chạy thành công

   - ✅ Tổng bản ghi chèn vào `monthly_attendances`: 200 (100 cho `2025-10`, 100 cho `2025-11`)

```bash   - Thời gian thực thi: ~1s (nhanh, tùy máy)

# Users

PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c "SELECT COUNT(*) FROM users;"- Lưu ý về tiền phạt (đã được tính và lưu):

# Expected: 100   - `totalLatePenalty`, `totalEarlyLeavePenalty`, `totalUnauthorizedAbsencePenalty` và `totalPenalty` đã được tính dựa trên `employee_salary_profiles.base_salary` và thiết lập trong `salary_service.settings` (ví dụ `PenaltyRate`, `UnauthorizedAbsencePenaltyRate`).



# Attendance---

PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c "SELECT COUNT(*) FROM time_attendances;"

# Expected: ~4200## 🔎 Kiểm tra tính nhất quán & chẩn đoán (kết quả sơ bộ)



# MonthlyTôi đã chạy một script chẩn đoán để so sánh giá trị `unauthorizedAbsenceDays` đã lưu trong `monthly_attendances` với giá trị tính lại theo logic runtime (cùng logic như trong `MonthlyReportService`). Kết quả:

PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c "SELECT COUNT(*) FROM monthly_attendances;"

# Expected: 300- Script chẩn đoán: `scripts/diagnose_unauthorized_nov2025.cjs`

   - Lệnh để chạy:

# Applications

PGPASSWORD=123456 psql -h localhost -U postgres -d application_service -c "SELECT COUNT(*) FROM applications;"```bash

# Expected: ~444node scripts/diagnose_unauthorized_nov2025.cjs

``````



### Kiểm tra tiền phạt đã được tính- Kết quả tóm tắt: tìm thấy **36 users** có chênh lệch giữa `unauthorizedAbsenceDays` được lưu và giá trị tính lại (ví dụ: stored=0 nhưng computed=1 cho vài user).



```bash- Ví dụ điều tra mẫu (userId=6, ngày `2025-11-03`):

PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c \   - Không có bản ghi chấm công cho ngày đó

  'SELECT "userId", month, "totalLatePenalty", "totalEarlyLeavePenalty", "totalPenalty" FROM monthly_attendances WHERE "totalPenalty" > 0 LIMIT 5;'   - Không có đơn phép/công tác phê duyệt che phủ ngày đó

```   - Không phải ngày lễ

   => Theo logic nên được tính là 1 ngày vắng không phép, nhưng `monthly_attendances` đang ghi `unauthorizedAbsenceDays = 0` → dẫn đến chênh lệch.

---

Tổng kết: seed tính toán đã chèn các bản ghi tháng, nhưng do dữ liệu attendance/applications có thể được thêm/sửa sau lần seed trước đó, một số bản tóm tắt tháng (`monthly_attendances`) bị lệch so với tính toán lại. Vì vậy cần quyết định có thực hiện cập nhật (reconcile) dữ liệu hay không.

## 🔧 Troubleshooting

---

### Lỗi: "relation does not exist"

**Nguyên nhân**: Chưa chạy migrations## ✅ Các bước tiếp theo (tôi có thể thực hiện nếu bạn đồng ý)

**Giải pháp**: Chạy `yarn knex migrate:latest` trong service tương ứng

1. Sao lưu các bản ghi `monthly_attendances` bị ảnh hưởng (export hoặc copy sang bảng backup) — an toàn trước khi sửa.

### Lỗi: "foreign key constraint"2. Chạy script cập nhật để đặt `unauthorizedAbsenceDays` = giá trị tính lại cho các user bị lệch, đồng thời cập nhật `totalUnauthorizedAbsencePenalty` và `totalPenalty` theo cùng công thức.

**Nguyên nhân**: Chạy seeds sai thứ tự3. Chạy lại kiểm tra so sánh để chắc chắn không còn chênh lệch.

**Giải pháp**: Chạy lại theo đúng thứ tự từ GIAI ĐOẠN 1

Nếu bạn muốn tôi thực hiện bước 1–3 tự động, hãy trả lời **"apply fixes"**. Nếu chỉ muốn tôi cung cấp chi tiết từng user (thời điểm, reason, attendance rows, application rows) thì nói **"show details for <userId1,userId2,...>"**.

### Lỗi: "connection refused"

**Nguyên nhân**: Database service chưa chạy---

**Giải pháp**: Kiểm tra PostgreSQL đã chạy chưa: `psql -h localhost -U postgres -l`

## Tệp liên quan & cách repro

### Tiền phạt = 0đ

**Nguyên nhân**: Chưa chạy script recalculate- Seed tính toán: `services/attendance-service/databases/seeds/17_calculate_monthly_oct_nov_2025.cjs`

**Giải pháp**: Chạy `node scripts/recalculate_monthly.cjs` trong attendance-service- Script chẩn đoán: `scripts/diagnose_unauthorized_nov2025.cjs` (in ra danh sách các user + ngày lệch; hiện ở trạng thái chỉ in kết quả — không tự sửa)

- Nếu muốn sửa tự động, tôi sẽ tạo hoặc bật cờ `--apply` cho script để thực hiện cập nhật sau khi sao lưu.

---

---

## 📊 Seed Files Summary

Nếu bạn cần, tôi có thể thêm đoạn lệnh cụ thể để export các hàng `monthly_attendances` bị ảnh hưởng trước khi sửa.

| Service | Seed File | Mô tả |

|---------|-----------|-------|

| auth-service | 01_seed_roles.js | 5 Roles |**Seeds**:

| auth-service | 03_seed_permissions.js | 49 Permissions |- `16_october_2025_applications.cjs` - Tháng 10/2025

| auth-service | 04_seed_role_permissions.js | Role-Permission mappings |- `14_november_2025_applications.js` - Tháng 11/2025

| auth-service | **17_final_100_users_realistic.js** | **100 Users + Contracts + Salaries** |

| employee-service | 01_departments_seed.cjs | 6 Departments |**Types**:

| employee-service | 02_chevrons_seed.cjs | 7 Chevrons |1. **Leave (Nghỉ phép)** - type: 1

| employee-service | 03_contract_types_seed.cjs | 3 Contract Types |   - Xác suất: 40% users có đơn

| salary-service | 002_allowance_types.cjs | Allowance Types |   - Duration: 1-3 ngày

| attendance-service | 01_holidays_seed.cjs | Ngày lễ 2025 |

| attendance-service | 21_shifts_seed.cjs | Ca làm việc |2. **Business Trip (Công tác)** - type: 2

| attendance-service | **44_seed_oct_nov_dec_2025_final.cjs** | **Chấm công Oct-Dec 2025** |   - Xác suất: 25% users có đơn

| application-service | **40_applications_seed.cjs** | **Đơn nghỉ phép + công tác** |   - Duration: 1-3 ngày

   - Locations: Hà Nội, Đà Nẵng, TP.HCM, Cần Thơ, Hải Phòng

---

3. **Overtime (Tăng ca)** - type: 3

**Last Updated**: December 6, 2025     - Xác suất: 60% users có đơn

**Version**: 3.0.0   - Duration: 1-3 giờ


**Status**:
- 90% Approved (status: 1)
- 7% Pending (status: 0)
- 3% Rejected (status: 2)

---

### Step 5: Monthly Attendance Calculation

**Mục đích**: Tính toán và lưu thông tin chấm công theo tháng

**Thời gian**: ~10-15 giây

**Dependencies**: 
- Attendance records (Step 3)
- Applications (Step 4)

**Seed**: `17_calculate_monthly_oct_nov_2025.cjs`

**Logic tính toán**:
```javascript
// Cho mỗi user trong mỗi tháng:
presentDays = COUNT(attendance records)
leaveDays = COUNT(approved leave applications) // Chỉ tính ngày làm việc
businessTripDays = COUNT(approved business trip applications)
absentDays = workingDaysInMonth - presentDays - leaveDays - businessTripDays
totalWorkHours = SUM(dailyTotalWorkHours)
totalLateMinutes = SUM(lateMinutes)
totalEarlyMinutes = SUM(earlyDepartureMinutes)
overtimeHours = SUM(approved overtime applications)
```

**Output**:
- 200 monthly_attendance records (100 users × 2 tháng)

**Dữ liệu được lưu (schema thực tế)**:

In this repo the `monthly_attendances` table uses `month` as a VARCHAR in the format `YYYY-MM` and column names use snake_case. A representative DDL looks like:

```sql
CREATE TABLE monthly_attendances (
   user_id INT,
   month VARCHAR(7), -- '2025-10'
   present_days INT,
   absent_days INT,
   leave_days INT,
   business_trip_days INT,
   total_work_hours DECIMAL,
   total_late_minutes INT,
   total_early_departure_minutes INT,
   overtime_hours DECIMAL,
   created_at TIMESTAMP,
   updated_at TIMESTAMP
);
```

And the `applications` table stores application details inside a JSONB column called `data` (e.g. `data->>'startDate'`, `data->>'endDate'`, `data->>'totalHours'`). Make sure the calculation seed extracts those fields from `data` when computing leave/overtime days/hours.

---

## ✅ Verify dữ liệu

### Verify Step 1: Foundation

```bash
# Check roles
PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c \
  "SELECT COUNT(*) FROM roles;"
# Expected: 5

# Check departments
PGPASSWORD=123456 psql -h localhost -U postgres -d employee_service -c \
  "SELECT COUNT(*) FROM departments;"
# Expected: 6

# Check permissions
PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c \
  "SELECT COUNT(*) FROM permissions;"
# Expected: 49
```

### Verify Step 2: Users

```bash
# Check users
PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c \
  "SELECT COUNT(*) FROM users;"
# Expected: 99

# Check role distribution
PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c \
  "SELECT \"roleId\", COUNT(*) FROM users GROUP BY \"roleId\" ORDER BY \"roleId\";"
# Expected: roleId 1=1, 2=66, 3=12, 4=10, 5=10

# Check contracts
PGPASSWORD=123456 psql -h localhost -U postgres -d employee_service -c \
  "SELECT COUNT(*) FROM contracts;"
# Expected: 99

# Check salary profiles
PGPASSWORD=123456 psql -h localhost -U postgres -d salary_service -c \
  "SELECT COUNT(*) FROM employee_salary_profiles;"
# Expected: 99

# Check admin account
PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c \
  "SELECT username, \"roleId\", \"departmentId\" FROM users WHERE username = 'admin';"
# Expected: admin | 1 | 1

# Check toanhm account
PGPASSWORD=123456 psql -h localhost -U postgres -d auth_service -c \
  "SELECT username, \"roleId\", \"departmentId\", \"chevronId\" FROM users WHERE username = 'toanhm';"
# Expected: toanhm | 3 | 2 | 3
```

### Verify Step 3: Attendance

```bash
# Check October 2025 attendance
PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c \
  "SELECT COUNT(*) FROM time_attendances WHERE date >= '2025-10-01' AND date <= '2025-10-31';"
# Expected: ~2,100

# Check November 2025 attendance
PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c \
  "SELECT COUNT(*) FROM time_attendances WHERE date >= '2025-11-01' AND date <= '2025-11-30';"
# Expected: ~1,900
```

### Verify Step 4: Applications

```bash
# Check October 2025 applications
PGPASSWORD=123456 psql -h localhost -U postgres -d application_service -c \
  "SELECT COUNT(*), type FROM applications WHERE \"startDate\" >= '2025-10-01' AND \"startDate\" <= '2025-10-31' GROUP BY type;"
# Expected: ~160 leave, ~100 business trip, ~240 overtime

# Check November 2025 applications
PGPASSWORD=123456 psql -h localhost -U postgres -d application_service -c \
  "SELECT COUNT(*), type FROM applications WHERE \"startDate\" >= '2025-11-01' AND \"startDate\" <= '2025-11-30' GROUP BY type;"
# Expected: ~148 leave, ~101 business trip, ~244 overtime
```

### Verify Step 5: Monthly Attendance

```bash
# Check monthly_attendances count
PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c \
  "SELECT COUNT(*) FROM monthly_attendances WHERE month IN ('2025-10', '2025-11');"
# Expected: 198 (99 users × 2 tháng)

# Check sample monthly data (admin, October 2025)
PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c \
  "SELECT * FROM monthly_attendances WHERE user_id = 1 AND month = '2025-10';"

# Check sample monthly data (toanhm = userId 2, October 2025)
PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c \
  "SELECT * FROM monthly_attendances WHERE user_id = 2 AND month = '2025-10';"
```

---

## 🔧 Troubleshooting

### Lỗi: "relation does not exist"

**Nguyên nhân**: Chưa chạy migrations

**Giải pháp**:
```bash
cd services/auth-service && yarn knex migrate:latest
cd services/employee-service && yarn knex migrate:latest
cd services/salary-service && yarn knex migrate:latest
cd services/attendance-service && yarn knex migrate:latest
cd services/application-service && yarn knex migrate:latest
```

### Lỗi: "column does not exist"

**Nguyên nhân**: Migrations cũ hoặc không đầy đủ

**Giải pháp**:
```bash
# Kiểm tra cấu trúc bảng
PGPASSWORD=123456 psql -h localhost -U postgres -d attendance_service -c "\d monthly_attendances"

# Nếu thiếu cột, rollback và migrate lại
yarn knex migrate:rollback
yarn knex migrate:latest
```

### Lỗi: "foreign key constraint"

**Nguyên nhân**: Chạy seeds sai thứ tự

**Giải pháp**: Chạy lại theo đúng thứ tự từ GIAI ĐOẠN 1

### Lỗi: "connection refused"

**Nguyên nhân**: Database service chưa chạy hoặc sai config

**Giải pháp**:
```bash
# Check PostgreSQL service
psql -h localhost -U postgres -l

# Check .env file
cat services/auth-service/.env
```

### Data không khớp

**Giải pháp**: Reset và chạy lại
```bash
# Option 1: Chạy lại seed cụ thể
yarn knex seed:run --specific=<seed-file-name>

# Option 2: Reset toàn bộ (CAREFUL!)
yarn knex migrate:rollback --all
yarn knex migrate:latest
# Sau đó chạy lại tất cả seeds theo thứ tự
```

---

## 📊 Quick Reference

### Seed Files Summary

| Service | Seed File | Purpose | Records |
|---------|-----------|---------|---------|
| auth-service | 01_seed_roles.js | Roles | 5 |
| auth-service | 03_seed_permissions.js | Permissions | 49 |
| auth-service | 04_seed_role_permissions.js | Role-Permission mappings | 61 |
| auth-service | **17_final_100_users_realistic.js** | **Users + Contracts + Salaries (Realistic)** | **99 each** |
| employee-service | 01_departments_seed.cjs | Departments | 6 |
| employee-service | 02_chevrons_seed.cjs | Chevrons | 10 |
| employee-service | 03_contract_types_seed.cjs | Contract Types | 3 |
| salary-service | 002_allowance_types.cjs | Allowance Types | Variable |
| attendance-service | 01_holidays_seed.cjs | Holidays 2025 | Variable |
| attendance-service | 15_october_2025_100_employees_attendance.cjs | October Attendance | ~2,100 |
| attendance-service | 12_november_2025_100_employees_attendance.cjs | November Attendance | ~1,900 |
| attendance-service | **17_calculate_monthly_oct_nov_2025.cjs** | **Monthly Calculations** | **198** |
| application-service | 16_october_2025_applications.cjs | October Applications | ~500 |
| application-service | 14_november_2025_applications.js | November Applications | ~490 |

---

## 🎯 One-Command Execution (Advanced)

**⚠️ Chỉ dùng khi đã hiểu rõ hệ thống!**

```bash
#!/bin/bash
# seed-all.sh - Chạy tất cả seeds theo thứ tự

echo "🚀 Starting seed process..."

# Foundation
cd services/auth-service
yarn knex seed:run --specific=01_seed_roles.js
yarn knex seed:run --specific=03_seed_permissions.js
yarn knex seed:run --specific=04_seed_role_permissions.js

cd ../employee-service
yarn knex seed:run --specific=01_departments_seed.cjs
yarn knex seed:run --specific=02_chevrons_seed.cjs
yarn knex seed:run --specific=03_contract_types_seed.cjs

cd ../salary-service
yarn knex seed:run --specific=002_allowance_types.cjs

# Users
cd ../auth-service
yarn knex seed:run --specific=17_final_100_users_realistic.js

# Attendance & Applications
cd ../attendance-service
yarn knex seed:run --specific=15_october_2025_100_employees_attendance.cjs
yarn knex seed:run --specific=12_november_2025_100_employees_attendance.cjs

cd ../application-service
yarn knex seed:run --specific=16_october_2025_applications.cjs
yarn knex seed:run --specific=14_november_2025_applications.js

# Monthly Calculation
cd ../attendance-service
yarn knex seed:run --specific=17_calculate_monthly_oct_nov_2025.cjs

echo "✅ All seeds completed!"
```

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. PostgreSQL đã chạy chưa
2. Databases đã được tạo chưa
3. Migrations đã chạy đầy đủ chưa
4. .env files có đúng config không
5. Node packages đã install chưa (`yarn install`)

---

**Last Updated**: November 2025  
**Version**: 2.0.0

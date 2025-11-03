# 📦 DANH SÁCH CÁC FILE SEED ĐÃ TẠO

## 📋 Tổng quan
Hệ thống seed data cho **50 nhân viên** với đầy đủ thông tin phòng ban, chức vụ, hợp đồng, chấm công và đơn từ.

---

## 📁 Cấu trúc Files

### 1️⃣ AUTH SERVICE (`services/auth-service/databases/seeds/`)
| File | Mô tả | Dữ liệu tạo |
|------|-------|-------------|
| `01_seed_roles.js` | ✏️ **Đã sửa** - Thêm role "Nhân sự" | 5 vai trò |
| `10_users_50_employees.js` | ✨ **Mới** - Tạo 50 nhân viên | 50 users |

### 2️⃣ EMPLOYEE SERVICE (`services/employee-service/databases/seeds/`)
| File | Mô tả | Dữ liệu tạo |
|------|-------|-------------|
| `01_departments_seed.cjs` | ✨ **Mới** - Phòng ban | 6 departments |
| `02_chevrons_seed.cjs` | ✨ **Mới** - Chức vụ | 5 chevrons |
| `03_contract_types_seed.cjs` | ✨ **Mới** - Loại hợp đồng | 4 contract types |
| `10_contracts_50_employees.cjs` | ✨ **Mới** - Hợp đồng cho 50 người | 50 contracts |

### 3️⃣ ATTENDANCE SERVICE (`services/attendance-service/databases/seeds/`)
| File | Mô tả | Dữ liệu tạo |
|------|-------|-------------|
| `10_october_2025_50_employees_attendance.cjs` | ✨ **Mới** - Chấm công tháng 10 | ~1000-1100 records |
| `11_monthly_summary_october_2025.cjs` | ✨ **Mới** - Tổng hợp tháng 10 | 50 records |

### 4️⃣ APPLICATION SERVICE (`services/application-service/databases/seeds/`)
| File | Mô tả | Dữ liệu tạo |
|------|-------|-------------|
| `10_october_2025_applications.js` | ✨ **Mới** - Đơn từ tháng 10 | ~150-250 records |

---

## 🚀 CÁCH SỬ DỤNG

### Phương pháp 1: Chạy tự động (Khuyến nghị) ⭐
```bash
# Cấp quyền thực thi (chỉ cần 1 lần)
chmod +x run-all-seeds.sh

# Chạy tất cả seeds
bash run-all-seeds.sh
```

### Phương pháp 2: Chạy từng bước (Chi tiết)
Xem hướng dẫn đầy đủ trong file **`SEED_GUIDE.md`**

---

## 📊 DỮ LIỆU SAU KHI SEED

### Thống kê tổng quan:
- ✅ **5 vai trò**: Admin, Nhân viên, Trưởng phòng, Kế toán, Nhân sự
- ✅ **50 nhân viên**: 1 Admin + 49 nhân viên mới
- ✅ **6 phòng ban**: Kỹ thuật, Kinh doanh, Nhân sự, Kế toán, Marketing, Hành chính
- ✅ **5 chức vụ**: Nhân viên, Trưởng nhóm, Phó phòng, Trưởng phòng, Giám đốc
- ✅ **4 loại hợp đồng**: Thử việc, 1 năm, 2 năm, Không xác định thời hạn
- ✅ **50 hợp đồng**: Phân bổ hợp lý theo chức vụ
- ✅ **~1000-1100 bản ghi chấm công**: Tháng 10/2025, dữ liệu ngẫu nhiên hợp lý
- ✅ **50 bản ghi tổng hợp**: Tính toán tự động từ chấm công
- ✅ **~150-250 đơn từ**: Nghỉ phép, công tác, OT

### Phân bổ nhân viên theo phòng ban:
- **Phòng Kỹ thuật**: 10 người
- **Phòng Kinh doanh**: 9 người
- **Phòng Nhân sự**: 6 người
- **Phòng Kế toán**: 8 người
- **Phòng Marketing**: 8 người
- **Phòng Hành chính**: 8 người
- **Ban Giám đốc**: 1 người

### Thông tin đăng nhập:
- **Username**: `kt2`, `kt3`, `kd11`, `kd12`, `ns21`, `acc27`, `mkt35`, `hc43`, ...
- **Password**: `123456@` (tất cả)
- **Email**: `<username>@company.com`

---

## 🔍 KIỂM TRA DỮ LIỆU

### Quick check với Knex CLI:
```bash
# Auth Service
cd services/auth-service
npx knex seed:run --specific=01_seed_roles.js

# Kiểm tra users
psql -U postgres -d auth_db -c "SELECT COUNT(*) FROM users;"
```

### Hoặc dùng SQL trực tiếp:
```sql
-- Kiểm tra tổng số bản ghi
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'chevrons', COUNT(*) FROM chevrons
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'time_attendances', COUNT(*) FROM time_attendances WHERE date >= '2025-10-01'
UNION ALL
SELECT 'monthly_attendances', COUNT(*) FROM monthly_attendances WHERE month = '2025-10'
UNION ALL
SELECT 'applications', COUNT(*) FROM applications WHERE created_at >= '2025-10-01';
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Thứ tự chạy**: Phải chạy theo đúng thứ tự trong `run-all-seeds.sh` hoặc `SEED_GUIDE.md`
2. **Xóa dữ liệu cũ**: Các seed sẽ xóa dữ liệu cũ (trừ admin account)
3. **Thời gian chạy**: Toàn bộ quá trình ~2-5 phút tùy cấu hình máy
4. **Database connection**: Đảm bảo tất cả services đã kết nối đúng database

---

## 🛠️ XỬ LÝ LỖI

Nếu gặp lỗi, hãy:
1. ✅ Kiểm tra đã chạy migrations chưa: `npx knex migrate:latest`
2. ✅ Kiểm tra database connection
3. ✅ Xóa dữ liệu cũ và chạy lại từ đầu
4. ✅ Xem log chi tiết trong terminal

---

## 📞 HỖ TRỢ

- 📖 Xem hướng dẫn chi tiết: **`SEED_GUIDE.md`**
- 🐛 Báo lỗi: Tạo issue với log chi tiết
- 💡 Câu hỏi: Liên hệ team development

---

**Happy Seeding! 🌱**

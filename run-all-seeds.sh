#!/bin/bash

# Script tự động chạy tất cả seeds theo đúng thứ tự
# Sử dụng: bash run-all-seeds.sh

echo "🚀 ======================================"
echo "🚀 SEED DATA CHO HỆ THỐNG QUẢN LÝ NHÂN SỰ"
echo "🚀 ======================================"
echo ""

# Lưu thư mục hiện tại
ROOT_DIR=$(pwd)

# Hàm kiểm tra lỗi
check_error() {
    if [ $? -ne 0 ]; then
        echo "❌ Lỗi xảy ra! Dừng quá trình seed."
        exit 1
    fi
}

# ============================================
# BƯỚC 1: AUTH SERVICE
# ============================================
echo "📝 [1/4] Seeding AUTH SERVICE..."
cd "$ROOT_DIR/services/auth-service" || exit 1

echo "   → Tạo vai trò (roles)..."
npx knex seed:run --specific=01_seed_roles.js
check_error

echo "   → Tạo 50 nhân viên (users)..."
npx knex seed:run --specific=10_users_50_employees.js
check_error

echo "✅ Auth Service: Hoàn thành!"
echo ""

# ============================================
# BƯỚC 2: EMPLOYEE SERVICE
# ============================================
echo "📝 [2/4] Seeding EMPLOYEE SERVICE..."
cd "$ROOT_DIR/services/employee-service" || exit 1

echo "   → Tạo phòng ban (departments)..."
npx knex seed:run --specific=01_departments_seed.cjs
check_error

echo "   → Tạo chức vụ (chevrons)..."
npx knex seed:run --specific=02_chevrons_seed.cjs
check_error

echo "   → Tạo loại hợp đồng (contract_types)..."
npx knex seed:run --specific=03_contract_types_seed.cjs
check_error

echo "   → Tạo hợp đồng cho 50 nhân viên (contracts)..."
npx knex seed:run --specific=10_contracts_50_employees.cjs
check_error

echo "✅ Employee Service: Hoàn thành!"
echo ""

# ============================================
# BƯỚC 3: ATTENDANCE SERVICE
# ============================================
echo "📝 [3/4] Seeding ATTENDANCE SERVICE..."
cd "$ROOT_DIR/services/attendance-service" || exit 1

echo "   → Tạo chấm công tháng 10/2025 (time_attendances)..."
echo "   ⏳ Đang xử lý... (có thể mất 10-30 giây)"
npx knex seed:run --specific=10_october_2025_50_employees_attendance.cjs
check_error

echo "   → Tạo bảng tổng hợp tháng 10/2025 (monthly_attendances)..."
echo "   ⏳ Đang xử lý... (có thể mất 15-45 giây)"
npx knex seed:run --specific=11_monthly_summary_october_2025.cjs
check_error

echo "✅ Attendance Service: Hoàn thành!"
echo ""

# ============================================
# BƯỚC 4: APPLICATION SERVICE
# ============================================
echo "📝 [4/4] Seeding APPLICATION SERVICE..."
cd "$ROOT_DIR/services/application-service" || exit 1

echo "   → Tạo đơn từ tháng 10/2025 (applications)..."
npx knex seed:run --specific=10_october_2025_applications.js
check_error

echo "✅ Application Service: Hoàn thành!"
echo ""

# ============================================
# HOÀN THÀNH
# ============================================
cd "$ROOT_DIR" || exit 1

echo "🎉 ======================================"
echo "🎉 HOÀN THÀNH SEED DỮ LIỆU!"
echo "🎉 ======================================"
echo ""
echo "📊 THỐNG KÊ:"
echo "   ✅ 5 vai trò"
echo "   ✅ 50 nhân viên"
echo "   ✅ 6 phòng ban"
echo "   ✅ 5 chức vụ"
echo "   ✅ 4 loại hợp đồng"
echo "   ✅ 50 hợp đồng"
echo "   ✅ ~1000-1100 bản ghi chấm công"
echo "   ✅ 50 bản ghi tổng hợp tháng"
echo "   ✅ ~150-250 đơn từ"
echo ""
echo "🔑 Thông tin đăng nhập:"
echo "   Username: kt2, kd11, ns21, acc27, mkt35, hc43, ..."
echo "   Password: 123456@"
echo ""
echo "📖 Xem chi tiết tại: SEED_GUIDE.md"
echo ""

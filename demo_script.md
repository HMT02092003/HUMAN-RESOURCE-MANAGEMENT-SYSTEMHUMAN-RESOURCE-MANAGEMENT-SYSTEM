# Kịch bản Demo Hệ thống Quản trị Nguồn Nhân lực (HRMS)

**Mục tiêu**: Demo toàn bộ các phân hệ (modules) của hệ thống web, thể hiện rõ phân quyền và luồng nghiệp vụ thông qua 4 tài khoản với các vai trò khác nhau.

### 📝 Danh sách tài khoản sử dụng:
1. **Nhân viên (Employee)**: `tech_tl009` (Dùng để demo các chức năng cá nhân, xin nghỉ, xem lương, chấm công).
2. **Quản lý (Manager)**: `toanhm` (Dùng để duyệt đơn, duyệt đăng ký ca, KPI, quản lý dự án).
3. **Kế toán (Accountant)**: `fin_senior096` (Dùng để demo tính lương, phụ cấp, chốt bảng lương).
4. **Nhân sự / Quản trị (HR/Admin)**: `mailtn` (Dùng để cấu hình hệ thống, quản lý tài khoản, phòng ban, chức vụ, hợp đồng, tuyển dụng).

---

## 🎬 Phần 1: Góc nhìn Nhân sự (Tài khoản: `mailtn`)
*Mục đích: Giới thiệu cấu trúc tổ chức và các cấu hình cốt lõi của hệ thống.*

1. **Đăng nhập**: Sử dụng tài khoản HR `mailtn`.
2. **Dashboard**: Giới thiệu tổng quan các chỉ số (tổng nhân viên, đơn nghỉ phép, trạng thái hệ thống).
3. **Quản lí phòng ban & chức vụ**: 
   - Truy cập **Quản lí phòng ban**: Show danh sách phòng ban.
   - Truy cập **Quản lí chức vụ (Chevrons)**: Show cơ cấu chức vụ.
4. **Quản lí tài khoản & Vai trò**:
   - Truy cập **Quản lí vai trò (Roles)**: Show sơ qua các quyền (read, create, approve...).
   - Truy cập **Quản lí người dùng**: Hiện danh sách nhân sự trong công ty, có thể click vào profile 1 người để xem chi tiết.
5. **Tuyển dụng & Hợp đồng**:
   - Truy cập **Quản lí hồ sơ (CV)**: Demo luồng xem và đánh giá CV ứng viên.
   - Truy cập **Quản lí hợp đồng**: Xem danh sách các loại hợp đồng lao động.
6. **Cấu hình ca làm việc & Ngày lễ**:
   - Truy cập **Cấu hình ca**: Show các ca làm việc đang có.
   - Truy cập **Quản lý ngày lễ**: Show cách setup ngày nghỉ lễ cho công ty.

---

## 🎬 Phần 2: Trải nghiệm của Nhân viên (Tài khoản: `tech_tl009`)
*Mục đích: Thể hiện các hoạt động hàng ngày của một nhân sự bình thường.*

1. **Đăng nhập**: Sử dụng tài khoản Nhân viên `tech_tl009`. (Mở trình duyệt ẩn danh hoặc 1 tab khác)
2. **Chấm công hàng ngày**:
   - Truy cập **Chấm công hàng ngày**: Thực hiện Check-in / Check-out (Có thể nhắc qua hệ thống có tích hợp AI Face Recognition).
   - Truy cập **Bảng chấm công**: Xem lịch sử chấm công cá nhân của tháng.
3. **Đăng ký ca làm việc**:
   - Truy cập **Đăng ký ca**: Demo việc chọn ca làm việc cho tuần tới.
4. **Đơn từ cá nhân**:
   - Truy cập **Đơn từ cá nhân**: Tạo một đơn xin nghỉ phép (Leave) hoặc đơn làm thêm giờ (OT).
5. **Thông tin cá nhân & Lương**:
   - Truy cập **Bảng lương (Cá nhân)**: Hướng dẫn cách nhân viên xem phiếu lương hàng tháng.
6. **Công việc & KPI**:
   - Truy cập **Quản lý KPI nhân viên**: Xem mục tiêu KPI cá nhân.

---

## 🎬 Phần 3: Góc nhìn của Quản lý cấp trung (Tài khoản: `toanhm`)
*Mục đích: Thể hiện luồng phê duyệt và quản lý đội nhóm.*

1. **Đăng nhập**: Sử dụng tài khoản Quản lý `toanhm`.
2. **Duyệt đơn từ & Ca làm việc**:
   - Truy cập **Duyệt đơn đăng ký ca**: Xem và duyệt danh sách đăng ký ca của nhân viên `tech_tl009` vừa tạo.
   - Truy cập **Quản lí đơn từ**: Xem và duyệt (Approve) đơn xin nghỉ phép/OT của nhân viên `tech_tl009`.
3. **Quản lý Công việc & Dự án**:
   - Truy cập **Danh sách dự án**: Show các dự án đang quản lý, tiến độ, thành viên.
   - Truy cập **Quản lý KPI nhân viên**: Đánh giá hoặc giao KPI cho nhân sự trong team.
4. **Duyệt chấm công**:
   - Truy cập **Duyệt bảng chấm công**: Xem thống kê chấm công của team và xác nhận để gửi sang kế toán.

---

## 🎬 Phần 4: Góc nhìn của Kế toán (Tài khoản: `fin_senior096`)
*Mục đích: Thể hiện luồng chốt công và tính lương cuối tháng.*

1. **Đăng nhập**: Sử dụng tài khoản Kế toán `fin_senior096`.
2. **Kiểm tra Chấm công & Lịch sử**:
   - Truy cập **Lịch sử chấm công (AI)** hoặc Bảng tổng hợp chấm công để check số liệu cuối cùng đã được Manager duyệt.
3. **Quản lý Phụ cấp**:
   - Truy cập **Cấu hình phụ cấp**: Show danh sách phụ cấp, thưởng phạt.
4. **Tính lương & Quản lý bảng lương**:
   - Truy cập **Quản lý bảng lương**: 
     - Demo việc tạo bảng lương mới cho tháng/chu kỳ.
     - Show số liệu lương được tự động tính toán từ công chuẩn, OT, phụ cấp, và ngày nghỉ.
     - Chốt bảng lương (Publish) để hiển thị cho nhân viên (quay lại Phần 2 nếu cần để show thông báo cho nhân viên).

---
**💡 Tips cho lúc quay:**
- Ở mỗi lần chuyển tài khoản, hãy nhấn mạnh **sự khác biệt của thanh Menu bên trái** (Sidebar) để Ban giám khảo thấy rõ hệ thống có phân quyền cực kỳ chặt chẽ (Ví dụ: Nhân viên không thấy menu Cấu hình lương, Kế toán không thấy menu duyệt CV tuyển dụng).
- Nên chuẩn bị sẵn một số dữ liệu mẫu (đơn chờ duyệt, bảng công có sẵn) để quá trình demo trơn tru hơn.
- Cố gắng thiết lập một "kịch bản vòng lặp khép kín": Nhân viên tạo đơn -> Quản lý duyệt -> Quản lý chốt công -> Kế toán tính lương.

# Tài liệu: Logic Tính toán Chấm công (HRMS)

Tài liệu này giải thích cách hệ thống Quản lý Nhân sự (HRMS) tính toán chấm công, tăng ca (OT), nghỉ phép, công tác và làm việc ngày lễ để tạo ra bảng công tháng cuối cùng.

## 1. Nguyên tắc cốt lõi
Hệ thống sử dụng **Hệ số công (Working Units)** làm thước đo chính để tính lương.
- **1.0 Công**: Thường tương đương với một ngày làm việc tiêu chuẩn (ví dụ: 8 tiếng).
- **Công hàng ngày**: Được tính dựa trên ca làm việc được giao hoặc giờ làm việc tiêu chuẩn của nhân viên.

## 2. Tính toán Ngày làm việc Tiêu chuẩn
- **Giờ làm việc**: Tổng số phút giữa giờ Check-in và Check-out, trừ đi giờ nghỉ trưa (nếu khoảng thời gian làm việc bao trùm giờ nghỉ trưa trong cài đặt).
- **Công cơ bản hàng ngày**: 
  - Công thức: `min(1.0, Giờ làm thực tế / Giờ tiêu chuẩn) * Hệ số công của ca`
  - Nếu nhân viên làm nhiều hơn giờ tiêu chuẩn (ví dụ làm 9 tiếng trong ca 8 tiếng), công cơ bản vẫn bị giới hạn ở mức tối đa là công của ca đó. Số giờ dư ra sẽ được xử lý bởi logic Tăng ca (OT).

## 3. Tính toán Tăng ca (OT)
OT chỉ được tính nếu có **Đơn đăng ký tăng ca đã được duyệt** cho ngày đó.
- **Điều kiện**: Giờ Check-out phải sau giờ bắt đầu OT.
- **Thời gian OT**: `min(Giờ Check-out, Giờ kết thúc OT đăng ký) - Giờ bắt đầu OT`.
- **Công OT (OT Unit)**:
  - Công thức: `Số giờ OT / 8 * Hệ số OT`
  - **Hệ số ngày thường**: Thường là 1.5x (150%).
  - **Hệ số ngày lễ**: Thường là 3.0x (300%).
- **Lưu ý**: Công OT được cộng trực tiếp vào Công cơ bản để ra **Tổng công** trong ngày.

## 4. Logic Làm việc Ngày lễ (MỚI)
Ngày lễ được quản lý thông qua màn hình **Quản lý ngày lễ** (Dành cho Admin/HR).
- **Ngày công chuẩn**: Ngày lễ được loại trừ khỏi tổng số "Ngày làm việc tiêu chuẩn trong tháng".
- **Lương ngày lễ**: Nếu nhân viên đi làm vào ngày lễ:
  - Toàn bộ thời gian làm việc sẽ được nhân với **Hệ số ngày lễ** (mặc định là 3.0x).
  - Hệ số này áp dụng cho cả 8 tiếng cơ bản và các giờ OT phát sinh.
  - *Khuyến cáo*: Nhân viên vẫn nên làm đơn OT để theo dõi, nhưng hệ thống sẽ tự động ưu tiên hệ số nhân dựa trên danh sách ngày lễ đã cài đặt.

## 5. Nghỉ phép và Công tác
- **Nghỉ phép được duyệt**: 
  - Nếu ngày đó có đơn nghỉ phép được duyệt, hệ thống sẽ đánh dấu là "Nghỉ phép".
  - Nghỉ phép có hưởng lương (ví dụ nghỉ phép năm) sẽ được cộng **1.0 Công** vào tổng công trong tháng.
- **Công tác**:
  - Được đánh dấu là "Công tác" trên lịch.
  - Được tính như một ngày đi làm đầy đủ (1.0 Công).

## 6. Các khoản phạt (Đi muộn / Về sớm)
- **Đi muộn**: Số phút giữa giờ bắt đầu quy định và giờ thực tế Check-in.
- **Về sớm**: Số phút giữa giờ thực tế Check-out và giờ kết thúc quy định.
- **Số tiền phạt**:
  - Công thức: `Lương cơ bản tháng * Tỷ lệ phạt (mỗi phút) * Số phút`.
  - Tỷ lệ phạt này có thể cấu hình được trong phần Cài đặt hệ thống.

## 7. Tổng hợp Cuối tháng
Vào cuối tháng, hệ thống sẽ tổng hợp tất cả dữ liệu hàng ngày:
- **Số ngày có mặt**: Tổng số ngày có ít nhất một lần check-in.
- **Tổng số công**: Tổng của tất cả các công hàng ngày (Làm việc + Nghỉ phép có lương + Công tác + OT).
- **Tổng tiền phạt**: Tổng các khoản phạt đi muộn, về sớm và nghỉ không phép.
- **Nghỉ không phép (Nghỉ lướt)**: Xảy ra khi một ngày làm việc theo lịch nhưng không có check-in và không có đơn từ được duyệt.

---
*Tài liệu được cập nhật bởi Trợ lý AI Antigravity - 24/01/2026*

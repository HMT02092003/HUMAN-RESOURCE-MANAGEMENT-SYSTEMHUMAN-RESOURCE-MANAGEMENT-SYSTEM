export async function seed(knex) {
  // Xóa tất cả dữ liệu cũ
  await knex('applications').del();

  // Dữ liệu mẫu cho các đơn từ
  const applications = [
    // Đơn công tác
    {
      id: 1,
      type: 'business-trip',
      status: 0, // pending
      data: {
        startDate: '2025-10-01',
        endDate: '2025-10-05',
        destination: 'Hà Nội',
        purpose: 'Gặp gỡ đối tác ABC để thảo luận dự án phần mềm quản lý nhân sự. Tham gia hội thảo công nghệ tại Trung tâm Hội nghị Quốc gia.',
        estimatedCost: 5000000,
        evidenceFiles: ['booking-hotel.jpg', 'flight-ticket.pdf']
      },
      userId: 1,
      applicationDate: new Date('2025-09-20'),
      note: 'Cần dự thảo hợp đồng trước khi đi công tác'
    },
    {
      id: 2,
      type: 'business-trip',
      status: 1, // approved
      data: {
        startDate: '2025-09-15',
        endDate: '2025-09-17',
        destination: 'TP. Hồ Chí Minh',
        purpose: 'Triển khai hệ thống tại chi nhánh phía Nam. Đào tạo nhân viên sử dụng phần mềm mới.',
        estimatedCost: 3500000,
        evidenceFiles: ['train-ticket.jpg']
      },
      userId: 2,
      applicationDate: new Date('2025-09-01'),
      approvedBy: 1,
      approvedDate: new Date('2025-09-03'),
      note: 'Đã được phê duyệt, chuẩn bị tài liệu đào tạo'
    },

    // Đơn nghỉ phép
    {
      id: 3,
      type: 'leave',
      status: 0, // pending
      data: {
        startDate: '2025-10-10',
        endDate: '2025-10-12',
        leaveType: 'annual',
        reason: 'Nghỉ phép thường niên, về quê thăm gia đình',
        emergencyContact: '0912345678'
      },
      userId: 3,
      applicationDate: new Date('2025-09-25')
    },
    {
      id: 4,
      type: 'sick-leave',
      status: 1, // approved
      data: {
        startDate: '2025-09-20',
        endDate: '2025-09-21',
        leaveType: 'sick',
        reason: 'Bị cảm cúm, cần nghỉ để tránh lây nhiễm cho đồng nghiệp',
        emergencyContact: '0987654321'
      },
      userId: 4,
      applicationDate: new Date('2025-09-19'),
      approvedBy: 1,
      approvedDate: new Date('2025-09-19'),
      note: 'Đã phê duyệt, cần có giấy tờ y tế khi trở lại làm việc'
    },

    // Đơn làm thêm giờ
    {
      id: 5,
      type: 'overtime',
      status: 0, // pending
      data: {
        date: '2025-09-30',
        startTime: '18:00',
        endTime: '22:00',
        reason: 'Hoàn thành báo cáo cuối tháng và chuẩn bị presentation cho khách hàng',
        estimatedHours: 4
      },
      userId: 2,
      applicationDate: new Date('2025-09-28')
    },
    {
      id: 6,
      type: 'overtime',
      status: 2, // rejected
      data: {
        date: '2025-09-25',
        startTime: '19:00',
        endTime: '23:00',
        reason: 'Sửa lỗi hệ thống khẩn cấp',
        estimatedHours: 4
      },
      userId: 3,
      applicationDate: new Date('2025-09-24'),
      approvedBy: 1,
      approvedDate: new Date('2025-09-24'),
      rejectionReason: 'Không có sự cố khẩn cấp nào được báo cáo. Vui lòng làm việc trong giờ hành chính.'
    },

    // Đơn làm việc từ xa
    {
      id: 7,
      type: 'remote-work',
      status: 1, // approved
      data: {
        startDate: '2025-10-01',
        endDate: '2025-10-05',
        reason: 'Con nhỏ ốm, cần chăm sóc tại nhà nhưng vẫn có thể làm việc hiệu quả',
        workLocation: 'Tại nhà - 123 Đường ABC, Quận 1, TP.HCM',
        equipmentNeeded: ['Laptop', 'VPN access', 'Điện thoại công ty']
      },
      userId: 4,
      applicationDate: new Date('2025-09-26'),
      approvedBy: 1,
      approvedDate: new Date('2025-09-26'),
      note: 'Đã cấp VPN và thiết bị cần thiết'
    }
  ];

  // Insert seed data
  await knex('applications').insert(applications);
  
  // Reset sequence để ID tiếp theo bắt đầu từ 8
  await knex.raw("select setval('applications_id_seq', max(id)) from applications");
  
  console.log('✅ Applications seed data inserted successfully!');
}

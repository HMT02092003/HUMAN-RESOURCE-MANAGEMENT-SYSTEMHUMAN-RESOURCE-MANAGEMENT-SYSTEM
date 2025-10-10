/**
 * Seed file: Đơn từ tháng 9/2025 - User 5
 * Tạo đơn từ cho các ngày chấm công có vấn đề
 */

export async function seed(knex) {
  // Xóa đơn từ cũ của user 5 trong tháng 9/2025
  await knex('applications')
    .where('userId', 5)
    .where('data', 'like', '%2025-09%')
    .del();

  console.log('🗑️  Đã xóa đơn từ tháng 9/2025 cũ của User 5');

  const applications = [
    // ==================== TUẦN 1 ====================
    
    // 2/9 - Đi muộn 20 phút (xin lỗi vì ùn tắc)
    {
      type: 'late-arrival',
      status: 0, // Chờ duyệt
      data: JSON.stringify({
        date: '2025-09-02',
        reason: 'Ùn tắc giao thông trên đường đi làm, xin công ty thông cảm',
        lateMinutes: 20,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-02 18:00:00'),
      updatedAt: new Date('2025-09-02 18:00:00')
    },
    
    // 4/9 - Về sớm 30 phút (đưa con đi khám bệnh)
    {
      type: 'early-leave',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-04',
        reason: 'Con bị sốt, phải đưa đi khám bệnh cấp cứu',
        earlyDepartureMinutes: 30,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-04 16:00:00'),
      updatedAt: new Date('2025-09-04 16:00:00')
    },
    
    // 5/9 - Quên check out
    {
      type: 'forgot-check',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-05',
        reason: 'Đi họp khách hàng gấp, quên chấm công ra về',
        actualCheckIn: '08:00',
        actualCheckOut: '17:30',
        missedType: 'check-out',
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-06 09:00:00'),
      updatedAt: new Date('2025-09-06 09:00:00')
    },
    
    // ==================== TUẦN 2 ====================
    
    // 9/9 - Đi muộn 35 phút (xe hỏng)
    {
      type: 'late-arrival',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-09',
        reason: 'Xe máy hỏng giữa đường, phải đợi sửa chữa',
        lateMinutes: 35,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-09 17:30:00'),
      updatedAt: new Date('2025-09-09 17:30:00')
    },
    
    // 10/9 - Quên check in
    {
      type: 'forgot-check',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-10',
        reason: 'Đến công ty sớm để chuẩn bị họp, quên chấm công vào',
        actualCheckIn: '07:30',
        actualCheckOut: '17:00',
        missedType: 'check-in',
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-10 17:30:00'),
      updatedAt: new Date('2025-09-10 17:30:00')
    },
    
    // 11/9 - Làm thêm giờ đến 21:00
    {
      type: 'overtime',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-11',
        startTime: '17:00',
        endTime: '21:00',
        reason: 'Triển khai dự án mới, cần hoàn thành trong deadline',
        overtimeHours: 4,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-11 16:00:00'),
      updatedAt: new Date('2025-09-11 16:00:00')
    },
    
    // 12/9 - Đi muộn 15 phút
    {
      type: 'late-arrival',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-12',
        reason: 'Thời tiết mưa lớn, đường trơn trượt phải đi chậm',
        lateMinutes: 15,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-12 18:00:00'),
      updatedAt: new Date('2025-09-12 18:00:00')
    },
    
    // ==================== TUẦN 3 ====================
    
    // 16/9 - Về sớm 45 phút (việc gia đình)
    {
      type: 'early-leave',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-16',
        reason: 'Bố mẹ từ quê ra, phải đón ở bến xe',
        earlyDepartureMinutes: 45,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-16 15:30:00'),
      updatedAt: new Date('2025-09-16 15:30:00')
    },
    
    // 17/9 - Đi muộn 50 phút (tai nạn giao thông)
    {
      type: 'late-arrival',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-17',
        reason: 'Tai nạn giao thông trên đường, bị kẹt xe nghiêm trọng',
        lateMinutes: 50,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-17 18:00:00'),
      updatedAt: new Date('2025-09-17 18:00:00')
    },
    
    // 19/9 - Làm thêm giờ đến 20:30
    {
      type: 'overtime',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-19',
        startTime: '17:00',
        endTime: '20:30',
        reason: 'Fix bug khẩn cấp trước khi release sản phẩm',
        overtimeHours: 3.5,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-19 16:30:00'),
      updatedAt: new Date('2025-09-19 16:30:00')
    },
    
    // ==================== TUẦN 4 ====================
    
    // 22/9 - Đi muộn 25 phút
    {
      type: 'late-arrival',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-22',
        reason: 'Tàu điện ngầm bị delay, đợi chuyến tiếp theo',
        lateMinutes: 25,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-22 17:30:00'),
      updatedAt: new Date('2025-09-22 17:30:00')
    },
    
    // 24/9 - Quên cả check in và check out
    {
      type: 'forgot-check',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-24',
        reason: 'Đi công tác toàn bộ ngày tại chi nhánh khác, không có máy chấm công',
        actualCheckIn: '08:00',
        actualCheckOut: '17:00',
        missedType: 'both',
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-25 09:00:00'),
      updatedAt: new Date('2025-09-25 09:00:00')
    },
    
    // 25/9 - Về sớm 1 tiếng (khám sức khỏe định kỳ)
    {
      type: 'early-leave',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-25',
        reason: 'Đi khám sức khỏe định kỳ theo lịch hẹn từ trước',
        earlyDepartureMinutes: 60,
        applicationCategory: 'leave'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-25 15:00:00'),
      updatedAt: new Date('2025-09-25 15:00:00')
    },
    
    // 26/9 - Đi muộn 40 phút
    {
      type: 'late-arrival',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-26',
        reason: 'Tham gia đưa tang người thân, xin công ty thông cảm',
        lateMinutes: 40,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-26 18:00:00'),
      updatedAt: new Date('2025-09-26 18:00:00')
    },
    
    // ==================== TUẦN 5 ====================
    
    // 30/9 - Đi muộn 10 phút
    {
      type: 'late-arrival',
      status: 0,
      data: JSON.stringify({
        date: '2025-09-30',
        reason: 'Mất điện vùng, báo thức không kêu',
        lateMinutes: 10,
        applicationCategory: 'regular'
      }),
      userId: 5,
      approvedBy: null,
      approvedDate: null,
      createdAt: new Date('2025-09-30 18:00:00'),
      updatedAt: new Date('2025-09-30 18:00:00')
    }
  ];

  // Insert các đơn từ
  await knex('applications').insert(applications);

  console.log('✅ Đã tạo đơn từ tháng 9/2025 cho User 5');
  console.log(`   📊 Tổng số đơn: ${applications.length} đơn`);
  console.log('');
  console.log('📋 Các loại đơn đã tạo:');
  console.log(`   ✓ Đi muộn: ${applications.filter(a => a.type === 'late-arrival').length} đơn`);
  console.log(`   ✓ Về sớm: ${applications.filter(a => a.type === 'early-leave').length} đơn`);
  console.log(`   ✓ Quên check: ${applications.filter(a => a.type === 'forgot-check').length} đơn`);
  console.log(`   ✓ Làm thêm giờ: ${applications.filter(a => a.type === 'overtime').length} đơn`);
  console.log('');
  console.log('⏳ Tất cả đơn đều ở trạng thái CHỜ DUYỆT (status = 0)');
  console.log('');
  console.log('💡 Lý do đơn từ đa dạng:');
  console.log('   • Ùn tắc, xe hỏng, tai nạn giao thông');
  console.log('   • Việc gia đình khẩn cấp');
  console.log('   • Họp khách hàng, công tác chi nhánh');
  console.log('   • Khám bệnh, khám sức khỏe');
  console.log('   • Làm thêm giờ cho dự án');
}

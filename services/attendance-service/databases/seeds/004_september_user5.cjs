/**
 * Seed file: Dữ liệu chấm công tháng 9/2025 - User 5
 * Tạo dữ liệu chấm công đầy đủ từ T2-T6 hàng tuần
 * Bao gồm tất cả các trường hợp: bình thường, đi muộn, về sớm, quên check, làm thêm giờ
 * 
 * ⚠️ GIỜ LÀM VIỆC: 09:00 - 18:00 (theo settings trong DB)
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ của user 5 trong tháng 9/2025
  await knex('time_attendances')
    .where('userId', 5)
    .whereBetween('date', ['2025-09-01', '2025-09-30'])
    .del();

  console.log('🗑️  Đã xóa dữ liệu chấm công tháng 9/2025 của User 5');

  // Tháng 9/2025: 30 ngày
  // Bắt đầu: 1/9 (Thứ 2)
  // Thứ 7: 6, 13, 20, 27
  // Chủ nhật: 7, 14, 21, 28
  // Ngày làm việc: 22 ngày (T2-T6)
  // GIỜ LÀM VIỆC: 09:00 - 18:00
  
  const attendanceData = [
    // ==================== TUẦN 1: 1-5/9 (T2-T6) ====================
    
    // 1/9 - Thứ 2: Đi làm bình thường - bắt đầu tháng mới
    {
      userId: 5,
      date: '2025-09-01',
      checkInTime: '2025-09-01 08:55:00', // Sớm 5 phút
      checkOutTime: '2025-09-01 18:05:00', // Muộn 5 phút
      dailyTotalWorkHours: 8.17,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 2/9 - Thứ 3: Đi muộn 20 phút (vào 09:20)
    {
      userId: 5,
      date: '2025-09-02',
      checkInTime: '2025-09-02 09:20:00', // Muộn 20 phút
      checkOutTime: '2025-09-02 18:00:00',
      dailyTotalWorkHours: 7.67,
      lateMinutes: 20,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 3/9 - Thứ 4: Đi làm bình thường (09:00-18:00)
    {
      userId: 5,
      date: '2025-09-03',
      checkInTime: '2025-09-03 09:00:00',
      checkOutTime: '2025-09-03 18:00:00',
      dailyTotalWorkHours: 8,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 4/9 - Thứ 5: Về sớm 30 phút (về 17:30 thay vì 18:00)
    {
      userId: 5,
      date: '2025-09-04',
      checkInTime: '2025-09-04 09:00:00',
      checkOutTime: '2025-09-04 17:30:00', // Sớm 30 phút
      dailyTotalWorkHours: 7.5,
      lateMinutes: 0,
      earlyDepartureMinutes: 30,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 5/9 - Thứ 6: Quên check out
    {
      userId: 5,
      date: '2025-09-05',
      checkInTime: '2025-09-05 09:00:00',
      checkOutTime: null,
      dailyTotalWorkHours: 0,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // ==================== TUẦN 2: 8-12/9 (T2-T6) ====================
    
    // 8/9 - Thứ 2: Đi làm bình thường (09:00-18:00)
    {
      userId: 5,
      date: '2025-09-08',
      checkInTime: '2025-09-08 09:00:00',
      checkOutTime: '2025-09-08 18:00:00',
      dailyTotalWorkHours: 8,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 9/9 - Thứ 3: Đi muộn 35 phút (vào 09:35)
    {
      userId: 5,
      date: '2025-09-09',
      checkInTime: '2025-09-09 09:35:00', // Muộn 35 phút
      checkOutTime: '2025-09-09 18:00:00',
      dailyTotalWorkHours: 7.42,
      lateMinutes: 35,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 10/9 - Thứ 4: Quên check in
    {
      userId: 5,
      date: '2025-09-10',
      checkInTime: null,
      checkOutTime: '2025-09-10 18:00:00',
      dailyTotalWorkHours: 0,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 11/9 - Thứ 5: Làm thêm giờ đến 22:00 (OT 4 giờ)
    {
      userId: 5,
      date: '2025-09-11',
      checkInTime: '2025-09-11 09:00:00',
      checkOutTime: '2025-09-11 22:00:00', // Làm thêm đến 22:00
      dailyTotalWorkHours: 12,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 12/9 - Thứ 6: Đi muộn 15 phút (vào 09:15)
    {
      userId: 5,
      date: '2025-09-12',
      checkInTime: '2025-09-12 09:15:00', // Muộn 15 phút
      checkOutTime: '2025-09-12 18:00:00',
      dailyTotalWorkHours: 7.75,
      lateMinutes: 15,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // ==================== TUẦN 3: 15-19/9 (T2-T6) ====================
    
    // 15/9 - Thứ 2: Đi làm bình thường (09:00-18:00)
    {
      userId: 5,
      date: '2025-09-15',
      checkInTime: '2025-09-15 09:00:00',
      checkOutTime: '2025-09-15 18:00:00',
      dailyTotalWorkHours: 8,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 16/9 - Thứ 3: Về sớm 45 phút (về 17:15 thay vì 18:00)
    {
      userId: 5,
      date: '2025-09-16',
      checkInTime: '2025-09-16 09:00:00',
      checkOutTime: '2025-09-16 17:15:00', // Sớm 45 phút
      dailyTotalWorkHours: 7.25,
      lateMinutes: 0,
      earlyDepartureMinutes: 45,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 17/9 - Thứ 4: Đi muộn 50 phút (vào 09:50)
    {
      userId: 5,
      date: '2025-09-17',
      checkInTime: '2025-09-17 09:50:00', // Muộn 50 phút
      checkOutTime: '2025-09-17 18:00:00',
      dailyTotalWorkHours: 7.17,
      lateMinutes: 50,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 18/9 - Thứ 5: Đi làm bình thường (09:00-18:00)
    {
      userId: 5,
      date: '2025-09-18',
      checkInTime: '2025-09-18 09:00:00',
      checkOutTime: '2025-09-18 18:00:00',
      dailyTotalWorkHours: 8,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 19/9 - Thứ 6: Làm thêm giờ đến 21:30 (OT 3.5 giờ)
    {
      userId: 5,
      date: '2025-09-19',
      checkInTime: '2025-09-19 09:00:00',
      checkOutTime: '2025-09-19 21:30:00', // Làm thêm đến 21:30
      dailyTotalWorkHours: 11.5,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // ==================== TUẦN 4: 22-26/9 (T2-T6) ====================
    
    // 22/9 - Thứ 2: Đi muộn 25 phút (vào 09:25)
    {
      userId: 5,
      date: '2025-09-22',
      checkInTime: '2025-09-22 09:25:00', // Muộn 25 phút
      checkOutTime: '2025-09-22 18:00:00',
      dailyTotalWorkHours: 7.58,
      lateMinutes: 25,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 23/9 - Thứ 3: Đi làm bình thường (09:00-18:00)
    {
      userId: 5,
      date: '2025-09-23',
      checkInTime: '2025-09-23 09:00:00',
      checkOutTime: '2025-09-23 18:00:00',
      dailyTotalWorkHours: 8,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 24/9 - Thứ 4: Quên cả check in và check out
    {
      userId: 5,
      date: '2025-09-24',
      checkInTime: null,
      checkOutTime: null,
      dailyTotalWorkHours: 0,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 25/9 - Thứ 5: Về sớm 1 tiếng (về 17:00 thay vì 18:00)
    {
      userId: 5,
      date: '2025-09-25',
      checkInTime: '2025-09-25 09:00:00',
      checkOutTime: '2025-09-25 17:00:00', // Sớm 1 tiếng
      dailyTotalWorkHours: 7,
      lateMinutes: 0,
      earlyDepartureMinutes: 60,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 26/9 - Thứ 6: Đi muộn 40 phút (vào 09:40)
    {
      userId: 5,
      date: '2025-09-26',
      checkInTime: '2025-09-26 09:40:00', // Muộn 40 phút
      checkOutTime: '2025-09-26 18:00:00',
      dailyTotalWorkHours: 7.33,
      lateMinutes: 40,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // ==================== TUẦN 5: 29-30/9 (T2-T3) ====================
    
    // 29/9 - Thứ 2: Đi làm bình thường (09:00-18:00)
    {
      userId: 5,
      date: '2025-09-29',
      checkInTime: '2025-09-29 09:00:00',
      checkOutTime: '2025-09-29 18:00:00',
      dailyTotalWorkHours: 8,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // 30/9 - Thứ 3: Đi muộn 10 phút - cuối tháng (vào 09:10)
    {
      userId: 5,
      date: '2025-09-30',
      checkInTime: '2025-09-30 09:10:00', // Muộn 10 phút
      checkOutTime: '2025-09-30 18:00:00',
      dailyTotalWorkHours: 7.83,
      lateMinutes: 10,
      earlyDepartureMinutes: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu chấm công
  await knex('time_attendances').insert(attendanceData);

  console.log('✅ Đã tạo dữ liệu chấm công tháng 9/2025 cho User 5');
  console.log(`   📊 Tổng số bản ghi: ${attendanceData.length} ngày`);
  console.log('   📅 Từ T2-T6 hàng tuần (không bao gồm T7, CN)');
  console.log('');
  console.log('📊 Thống kê chi tiết:');
  console.log(`   ✓ Đi làm bình thường: ${attendanceData.filter(a => a.lateMinutes === 0 && a.earlyDepartureMinutes === 0 && a.checkInTime && a.checkOutTime && a.dailyTotalWorkHours <= 8.5).length} ngày`);
  console.log(`   ✓ Đi muộn: ${attendanceData.filter(a => a.lateMinutes > 0).length} ngày (10-50 phút)`);
  console.log(`   ✓ Về sớm: ${attendanceData.filter(a => a.earlyDepartureMinutes > 0).length} ngày (30-60 phút)`);
  console.log(`   ✓ Quên check in: ${attendanceData.filter(a => !a.checkInTime && a.checkOutTime).length} ngày`);
  console.log(`   ✓ Quên check out: ${attendanceData.filter(a => a.checkInTime && !a.checkOutTime).length} ngày`);
  console.log(`   ✓ Quên cả check in/out: ${attendanceData.filter(a => !a.checkInTime && !a.checkOutTime).length} ngày`);
  console.log(`   ✓ Làm thêm giờ: ${attendanceData.filter(a => a.dailyTotalWorkHours > 10).length} ngày`);
};

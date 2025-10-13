/**
 * Seed file: Dữ liệu chấm công tháng 9/2025 - User 5 (COMPLETE VERSION)
 * Tạo dữ liệu chấm công đầy đủ với tất cả các trường
 * 
 * ⚠️ GIỜ LÀM VIỆC: 09:00 - 18:00
 * 💰 LƯƠNG CƠ BẢN: 15,000,000 VND/tháng
 * 📊 Penalty Rate: 5%
 * ⏰ OT Rate: 1.5x
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('time_attendances')
    .where('userId', 5)
    .whereBetween('date', ['2025-09-01', '2025-09-30'])
    .del();

  console.log('🗑️  Đã xóa dữ liệu chấm công tháng 9/2025 của User 5');

  // Thông số tính toán
  const baseSalary = 15000000;
  const hourlyRate = baseSalary / 26 / 8; // ~72,115 VND/giờ
  const penaltyRate = 0.05;
  const otRate = 1.5;
  
  const calculatePenalty = (minutes) => Math.round((hourlyRate * (minutes / 60) * penaltyRate));
  const calculateOtSalary = (hours) => Math.round(hourlyRate * otRate * hours);

  const attendanceData = [
    // Tuần 1
    { userId: 5, date: '2025-09-01', checkInTime: '2025-09-01 08:55:00', checkOutTime: '2025-09-01 18:05:00', 
      dailyTotalWorkHours: 8.17, dailyWorkingUnit: 8.17, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-02', checkInTime: '2025-09-02 09:20:00', checkOutTime: '2025-09-02 18:00:00', 
      dailyTotalWorkHours: 7.67, dailyWorkingUnit: 7.67, lateMinutes: 20, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(20), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-03', checkInTime: '2025-09-03 09:00:00', checkOutTime: '2025-09-03 18:00:00', 
      dailyTotalWorkHours: 8, dailyWorkingUnit: 8, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-04', checkInTime: '2025-09-04 09:00:00', checkOutTime: '2025-09-04 17:30:00', 
      dailyTotalWorkHours: 7.5, dailyWorkingUnit: 7.5, lateMinutes: 0, earlyDepartureMinutes: 30, 
      lateArrivalPenalty: 0, earlyLeavePenalty: calculatePenalty(30), otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-05', checkInTime: '2025-09-05 09:00:00', checkOutTime: null, 
      dailyTotalWorkHours: 0, dailyWorkingUnit: 0, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },

    // Tuần 2
    { userId: 5, date: '2025-09-08', checkInTime: '2025-09-08 09:00:00', checkOutTime: '2025-09-08 18:00:00', 
      dailyTotalWorkHours: 8, dailyWorkingUnit: 8, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-09', checkInTime: '2025-09-09 09:35:00', checkOutTime: '2025-09-09 18:00:00', 
      dailyTotalWorkHours: 7.42, dailyWorkingUnit: 7.42, lateMinutes: 35, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(35), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-10', checkInTime: null, checkOutTime: '2025-09-10 18:00:00', 
      dailyTotalWorkHours: 0, dailyWorkingUnit: 0, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-11', checkInTime: '2025-09-11 09:00:00', checkOutTime: '2025-09-11 22:00:00', 
      dailyTotalWorkHours: 12, dailyWorkingUnit: 12, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 240, otWorkingUnit: 4, otSalary: calculateOtSalary(4) },
    
    { userId: 5, date: '2025-09-12', checkInTime: '2025-09-12 09:15:00', checkOutTime: '2025-09-12 18:00:00', 
      dailyTotalWorkHours: 7.75, dailyWorkingUnit: 7.75, lateMinutes: 15, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(15), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },

    // Tuần 3
    { userId: 5, date: '2025-09-15', checkInTime: '2025-09-15 09:00:00', checkOutTime: '2025-09-15 18:00:00', 
      dailyTotalWorkHours: 8, dailyWorkingUnit: 8, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-16', checkInTime: '2025-09-16 09:00:00', checkOutTime: '2025-09-16 17:15:00', 
      dailyTotalWorkHours: 7.25, dailyWorkingUnit: 7.25, lateMinutes: 0, earlyDepartureMinutes: 45, 
      lateArrivalPenalty: 0, earlyLeavePenalty: calculatePenalty(45), otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-17', checkInTime: '2025-09-17 09:50:00', checkOutTime: '2025-09-17 18:00:00', 
      dailyTotalWorkHours: 7.17, dailyWorkingUnit: 7.17, lateMinutes: 50, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(50), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-18', checkInTime: '2025-09-18 09:00:00', checkOutTime: '2025-09-18 18:00:00', 
      dailyTotalWorkHours: 8, dailyWorkingUnit: 8, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-19', checkInTime: '2025-09-19 09:00:00', checkOutTime: '2025-09-19 21:30:00', 
      dailyTotalWorkHours: 11.5, dailyWorkingUnit: 11.5, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 210, otWorkingUnit: 3.5, otSalary: calculateOtSalary(3.5) },

    // Tuần 4
    { userId: 5, date: '2025-09-22', checkInTime: '2025-09-22 09:25:00', checkOutTime: '2025-09-22 18:00:00', 
      dailyTotalWorkHours: 7.58, dailyWorkingUnit: 7.58, lateMinutes: 25, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(25), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-23', checkInTime: '2025-09-23 09:00:00', checkOutTime: '2025-09-23 18:00:00', 
      dailyTotalWorkHours: 8, dailyWorkingUnit: 8, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-24', checkInTime: null, checkOutTime: null, 
      dailyTotalWorkHours: 0, dailyWorkingUnit: 0, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-25', checkInTime: '2025-09-25 09:00:00', checkOutTime: '2025-09-25 17:00:00', 
      dailyTotalWorkHours: 7, dailyWorkingUnit: 7, lateMinutes: 0, earlyDepartureMinutes: 60, 
      lateArrivalPenalty: 0, earlyLeavePenalty: calculatePenalty(60), otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-26', checkInTime: '2025-09-26 09:40:00', checkOutTime: '2025-09-26 18:00:00', 
      dailyTotalWorkHours: 7.33, dailyWorkingUnit: 7.33, lateMinutes: 40, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(40), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },

    // Tuần 5
    { userId: 5, date: '2025-09-29', checkInTime: '2025-09-29 09:00:00', checkOutTime: '2025-09-29 18:00:00', 
      dailyTotalWorkHours: 8, dailyWorkingUnit: 8, lateMinutes: 0, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: 0, earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
    
    { userId: 5, date: '2025-09-30', checkInTime: '2025-09-30 09:10:00', checkOutTime: '2025-09-30 18:00:00', 
      dailyTotalWorkHours: 7.83, dailyWorkingUnit: 7.83, lateMinutes: 10, earlyDepartureMinutes: 0, 
      lateArrivalPenalty: calculatePenalty(10), earlyLeavePenalty: 0, otMinutes: 0, otWorkingUnit: 0, otSalary: 0 },
  ];

  // Thêm timestamps cho tất cả records
  const dataWithTimestamps = attendanceData.map(record => ({
    ...record,
    created_at: new Date(),
    updated_at: new Date()
  }));

  await knex('time_attendances').insert(dataWithTimestamps);

  console.log('✅ Đã tạo dữ liệu chấm công tháng 9/2025 cho User 5 (COMPLETE VERSION)');
  console.log(`   📊 Tổng số bản ghi: ${attendanceData.length} ngày`);
  console.log('   📋 Với đầy đủ thông tin: penalties, OT, working units');
};
